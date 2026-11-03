import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, TrendingUp, TrendingDown, Minus, Moon, Milk, Baby } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import '../styling/global/App.css';
import '../styling/pages/analyticsPage.css';
import '../styling/components/chartLegend.css';
import { getSelectedChildForUser } from '../utils/authStorage';
import { API_URL } from '../config';
import Layout from '../components/Layout';
import { CollapsibleCard } from '../components/CollapsibleCard';
import { DIAPER_COLORS } from '../constants/diaperColors';

const DIAPER_LEGEND_CLASS = { Wet: 'legend-dot--wet', Dirty: 'legend-dot--dirty', Mixed: 'legend-dot--mixed' };

const parseMinutes = (detail) => {
  const match = detail.match(/(\d+)\s*min/);
  return match ? Number(match[1]) : 0;
};

const parseOunces = (detail) => {
  const match = detail.match(/(\d+(?:\.\d+)?)\s*oz/);
  return match ? Number(match[1]) : 0;
};

const getAnalyticsWindow = (range, periodsAgo) => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  if (range === 'week') {
    end.setDate(now.getDate() - 7 * periodsAgo);
    start.setDate(end.getDate() - 6);
  } else {
    end.setDate(now.getDate() - periodsAgo);
    start.setDate(end.getDate());
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getRecentSummaryWindow = () => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 4);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const getLocalTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const TREND_DELTA_CLASS = { up: 'analytics-trend-delta--up', down: 'analytics-trend-delta--down', steady: 'analytics-trend-delta--steady', new: 'analytics-trend-delta--new' };

const TrendDelta = ({ change }) => {
  if (change === null) {
    return <span className={`analytics-trend-delta ${TREND_DELTA_CLASS.new}`}><Minus size={12} /> new</span>;
  }
  if (change > 5) {
    return <span className={`analytics-trend-delta ${TREND_DELTA_CLASS.up}`}><TrendingUp size={12} /> {change}%</span>;
  }
  if (change < -5) {
    return <span className={`analytics-trend-delta ${TREND_DELTA_CLASS.down}`}><TrendingDown size={12} /> {Math.abs(change)}%</span>;
  }
  return <span className={`analytics-trend-delta ${TREND_DELTA_CLASS.steady}`}><Minus size={12} /> steady</span>;
};

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const selectedChild = getSelectedChildForUser();

  const [historyItems, setHistoryItems] = useState([]);
  const [canViewAnalytics, setCanViewAnalytics] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [range, setRange] = useState('day');
  const [isExportRangeOpen, setIsExportRangeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState('');
  const aiSummaryRequest = useRef(null);

  useEffect(() => {
    if (!isExportRangeOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !exporting) setIsExportRangeOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportRangeOpen, exporting]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return () => { active = false; };
    }

    axios.get(`${API_URL}/api/auth/me`, { headers: { 'x-auth-token': token } })
      .then((response) => {
        if (!active) return;
        if (response.data?.role === 'parent') {
          setCanViewAnalytics(true);
        } else {
          setAccessDenied(true);
        }
      })
      .catch((error) => {
        console.error('Could not verify analytics permissions:', error);
        if (active) navigate('/ParentDashboard', { replace: true });
      })
      .finally(() => {
        if (active) setAccessChecked(true);
      });

    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (!canViewAnalytics) return undefined;
    const fetchHistory = async () => {
      try {
        const childId = selectedChild?._id;
        const token = localStorage.getItem('token');
        if (!childId || !token) return;

        const response = await axios.get(`${API_URL}/api/activities`, {
          params: { childId },
          headers: { 'x-auth-token': token },
        });
        const { feedings = [], sleeps = [], diapers = [] } = response.data;

        const merged = [
          ...feedings.map((item) => ({
            id: `feeding-${item._id || Math.random()}`,
            type: 'feeding',
            label: `feeding • ${item.type || 'N/A'}`,
            detail: item.amount ? `${item.amount} oz` : item.side && item.side !== 'N/A' ? item.side : 'logged',
            timestamp: item.timestamp,
          })),
          ...sleeps.map((item) => ({
            id: `sleep-${item._id || Math.random()}`,
            type: 'sleep',
            label: 'sleep',
            detail: `${item.quality || 'N/A'} • ${item.duration || 0} min`,
            timestamp: item.timestamp || item.endTime || item.startTime,
          })),
          ...diapers.map((item) => ({
            id: `diaper-${item._id || Math.random()}`,
            type: 'diaper',
            label: 'diaper',
            detail: item.type || 'logged',
            timestamp: item.timestamp,
          })),
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setHistoryItems(merged);
      } catch (error) {
        console.error('Could not load history', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedChild?._id, canViewAnalytics]);

  const filterByWindow = (items, { start, end }) => items.filter((item) => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= start && itemDate <= end;
  });

  const currentWindow = getAnalyticsWindow(range, 0);
  const previousWindow = getAnalyticsWindow(range, 1);

  const filteredHistoryItems = useMemo(
    () => filterByWindow(historyItems, currentWindow),
    [historyItems, currentWindow]
  );
  const previousHistoryItems = useMemo(
    () => filterByWindow(historyItems, previousWindow),
    [historyItems, previousWindow]
  );

  const computeStats = (items) => {
    const sleepItems = items.filter((item) => item.type === 'sleep');
    const feedingItems = items.filter((item) => item.type === 'feeding');
    const diaperItems = items.filter((item) => item.type === 'diaper');

    return {
      totalSleepMinutes: sleepItems.reduce((total, item) => total + parseMinutes(item.detail), 0),
      sleepCount: sleepItems.length,
      feedingCount: feedingItems.length,
      totalFeedingOunces: feedingItems.reduce((total, item) => total + parseOunces(item.detail), 0),
      diaperCount: diaperItems.length,
    };
  };

  const currentStats = useMemo(() => computeStats(filteredHistoryItems), [filteredHistoryItems]);
  const previousStats = useMemo(() => computeStats(previousHistoryItems), [previousHistoryItems]);
  const percentChange = (curr, prev) => {
    if (prev === 0) return curr === 0 ? 0 : null;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const sleepChartData = useMemo(() => {
    const sleepItems = filteredHistoryItems.filter((item) => item.type === 'sleep');

    if (range === 'day') {
      return sleepItems.map((item, index) => ({ label: `Sleep ${index + 1}`, minutes: parseMinutes(item.detail) }));
    }

    const dailySleep = {};
    sleepItems.forEach((item) => {
      const day = new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
      dailySleep[day] = (dailySleep[day] || 0) + parseMinutes(item.detail);
    });

    return Object.entries(dailySleep).map(([day, minutes]) => ({ label: day, minutes }));
  }, [filteredHistoryItems, range]);

  const feedingChartData = useMemo(() => {
    const feedingItems = filteredHistoryItems.filter((item) => item.type === 'feeding');

    if (range === 'day') {
      return feedingItems
        .map((item, index) => ({ label: `Feed ${index + 1}`, ounces: parseOunces(item.detail) }))
        .filter((item) => item.ounces > 0);
    }

    const dailyFeeding = {};
    feedingItems.forEach((item) => {
      const amount = parseOunces(item.detail);
      if (amount > 0) {
        const day = new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' });
        dailyFeeding[day] = (dailyFeeding[day] || 0) + amount;
      }
    });

    return Object.entries(dailyFeeding).map(([day, ounces]) => ({ label: day, ounces }));
  }, [filteredHistoryItems, range]);

  const diaperChartData = useMemo(() => {
    const counts = { Wet: 0, Dirty: 0, Mixed: 0 };

    filteredHistoryItems
      .filter((item) => item.type === 'diaper')
      .forEach((item) => {
        if (counts[item.detail] !== undefined) counts[item.detail] += 1;
      });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredHistoryItems]);

  const diaperTotal = diaperChartData.reduce((total, item) => total + item.value, 0);

  const handleExportReport = async (reportRange) => {
    try {
      setExporting(true);
      const childId = selectedChild?._id;
      const childName = selectedChild?.name || 'child';
      const token = localStorage.getItem('token');
      const summaryWindow = getRecentSummaryWindow();

      if (!childId || !token) {
        throw new Error('A selected child and authenticated user are required.');
      }

      const response = await axios.post(
        `${API_URL}/api/reports/generate`,
        {
          childId,
          range: reportRange,
          type: 'analytics',
          summaryStart: summaryWindow.start.toISOString(),
          summaryEnd: summaryWindow.end.toISOString(),
          summaryTimeZone: getLocalTimeZone()
        },
        { headers: { 'x-auth-token': token }, responseType: 'blob', timeout: 65000 }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${childName}-${reportRange}-analysis-report.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      setRange(reportRange);
      setIsExportRangeOpen(false);
    } catch (error) {
      console.error('Could not export analysis report', error);
      alert('Unable to create the PDF right now. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const loadAiSummary = useCallback(async () => {
    let requestController;
    try {
      setAiSummaryLoading(true);
      setAiSummaryError('');
      setAiSummary(null);

      const childId = selectedChild?._id;
      const token = localStorage.getItem('token');
      if (!childId || !token) {
        throw new Error('Select a child and sign in to generate a summary.');
      }

      const { start, end } = getRecentSummaryWindow();
      requestController = new AbortController();
      aiSummaryRequest.current = requestController;
      const response = await axios.post(
        `${API_URL}/api/analytics/summary`,
        {
          childId,
          start: start.toISOString(),
          end: end.toISOString(),
          timeZone: getLocalTimeZone()
        },
        { headers: { 'x-auth-token': token }, timeout: 65000, signal: requestController.signal }
      );
      const summary = response.data;
      if (
        !summary
        || typeof summary.feeding_summary !== 'string'
        || typeof summary.sleep_summary !== 'string'
        || typeof summary.diaper_summary !== 'string'
        || !Array.isArray(summary.key_insights)
        || !summary.key_insights.every((insight) => typeof insight === 'string')
      ) {
        throw new Error('The AI service returned an invalid summary.');
      }
      setAiSummary(summary);
    } catch (error) {
      if (error.code === 'ERR_CANCELED') return;
      console.error('Could not generate AI activity summary:', error);
      setAiSummaryError(
        error.response?.data?.error
        || error.message
        || 'Unable to generate an AI summary right now. Please try again.'
      );
    } finally {
      if (aiSummaryRequest.current === requestController) {
        aiSummaryRequest.current = null;
        setAiSummaryLoading(false);
      }
    }
  }, [selectedChild?._id]);

  useEffect(() => {
    if (!canViewAnalytics || !selectedChild?._id) return undefined;

    loadAiSummary();
    return () => {
      aiSummaryRequest.current?.abort();
      aiSummaryRequest.current = null;
    };
  }, [canViewAnalytics, selectedChild?._id, loadAiSummary]);

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours} hr` : `${hours} hr ${remainingMinutes} min`;
  };

  if (!accessChecked) {
    return (
      <Layout>
        <div className="analytics-content">
          <p className="empty-msg-light">checking access…</p>
        </div>
      </Layout>
    );
  }

  if (accessDenied) {
    return (
      <Layout>
        <div className="analytics-content">
          <section className="glass-card" role="status">
            <h1 className="card-header">Analytics unavailable</h1>
            <p className="empty-msg-light">
              Caregiver accounts don't have access to the analytics page.
            </p>
          </section>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="analytics-content">
        {/* headline takeaways - the core of what makes this page different
            from History: a read-out on what changed, not a log of entries */}
        <CollapsibleCard title="key takeaways">
          <div className="card-header">
            <FileText size={22} strokeWidth={2} color="#315b3d" />
            <span>summary</span>
          </div>
          <p className="empty-msg-light analytics-ai-disclosure">
            AI-generated observations are informational, not medical advice. Up to 500 activity records
            from the last 5 days may be sent to Google Gemini; child names and profile details are not sent.
          </p>
          {aiSummaryLoading && (
            <div className="analytics-summary-loading" role="status" aria-live="polite">
              <span className="analytics-summary-spinner" aria-hidden="true" />
              <span>Generating insights…</span>
            </div>
          )}
          {aiSummaryError && (
            <p className="analytics-ai-error" role="alert">
              AI summary unavailable: {aiSummaryError}
            </p>
          )}
          {aiSummary ? (
            <div aria-live="polite">
              {[
                ['Feeding', aiSummary.feeding_summary],
                ['Sleep', aiSummary.sleep_summary],
                ['Diapers', aiSummary.diaper_summary]
              ].map(([label, text]) => (
                <p key={label} className="empty-msg-light analytics-summary-category">
                  <strong>{label}:</strong> {text}
                </p>
              ))}
              {aiSummary.key_insights.length ? aiSummary.key_insights.map((insight, index) => (
                <div key={`${index}-${insight}`} className="analytics-insight-row">
                  <span className="analytics-insight-bullet" />
                  <p className="empty-msg-light">{insight}</p>
                </div>
              )) : <p className="empty-msg-light">No notable insights for this period.</p>}
            </div>
          ) : !aiSummaryLoading && !aiSummaryError && loading
            ? <p className="empty-msg-light">loading activity…</p>
            : null}
        </CollapsibleCard>

        {/* each card carries its own comparison label, so the section header
            can stay short instead of a long "trend vs yesterday/last week"
            string that doesn't fit the card style */}
        <CollapsibleCard title="trends">
          <div className="analytics-trend-grid">
            <div className="analytics-trend-card">
              <Moon size={22} color="#315b3d" />
              <strong className="analytics-trend-value">{formatMinutes(currentStats.totalSleepMinutes)}</strong>
              <span className="analytics-trend-label">total sleep</span>
              <TrendDelta change={percentChange(currentStats.totalSleepMinutes, previousStats.totalSleepMinutes)} />
            </div>
            <div className="analytics-trend-card">
              <Milk size={22} color="#315b3d" />
              <strong className="analytics-trend-value">{currentStats.totalFeedingOunces.toFixed(1)} oz</strong>
              <span className="analytics-trend-label">feeding volume</span>
              <TrendDelta change={percentChange(currentStats.totalFeedingOunces, previousStats.totalFeedingOunces)} />
            </div>
            <div className="analytics-trend-card">
              <Baby size={22} color="#315b3d" />
              <strong className="analytics-trend-value">{currentStats.diaperCount}</strong>
              <span className="analytics-trend-label">diaper changes</span>
              <TrendDelta change={percentChange(currentStats.diaperCount, previousStats.diaperCount)} />
            </div>
            <div className="analytics-trend-card">
              <Moon size={22} color="#315b3d" />
              <strong className="analytics-trend-value">{currentStats.sleepCount}</strong>
              <span className="analytics-trend-label">sleep sessions</span>
              <TrendDelta change={percentChange(currentStats.sleepCount, previousStats.sleepCount)} />
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="sleep pattern">
          {sleepChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sleepChartData}>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => [formatMinutes(value), 'Sleep duration']} />
                <Bar dataKey="minutes" fill="#8A7BC2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-msg-light">No sleep data for this period.</p>
          )}
        </CollapsibleCard>

        <CollapsibleCard title="feeding pattern">
          {feedingChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={feedingChartData} layout="vertical" margin={{ top: 5, right: 38, bottom: 5, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={54} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} oz`, 'Feeding amount']} />
                <Bar dataKey="ounces" fill="#789F75" radius={[0, 6, 6, 0]} barSize={18}>
                  <LabelList dataKey="ounces" position="right" formatter={(value) => `${value} oz`} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-msg-light">No feeding amounts recorded.</p>
          )}
        </CollapsibleCard>

        <CollapsibleCard title="diaper pattern">
          {diaperTotal > 0 ? (
            <div className="analytics-diaper-chart">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={diaperChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2}>
                    {diaperChartData.map((item, index) => (
                      <Cell key={item.name} fill={DIAPER_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} changes`, 'Diapers']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="analytics-diaper-legend">
                {diaperChartData.map((item) => {
                  const percent = diaperTotal > 0 ? Math.round((item.value / diaperTotal) * 100) : 0;
                  return (
                    <div className="legend-row" key={item.name}>
                      <span className={`legend-dot ${DIAPER_LEGEND_CLASS[item.name]}`} />
                      <span>{item.name}</span>
                      <span className="legend-row-percent">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="empty-msg-light">No diaper changes recorded.</p>
          )}
        </CollapsibleCard>

        <button
          type="button"
          className="glass-card save-btn-card analytics-export-btn"
          onClick={() => setIsExportRangeOpen(true)}
          disabled={exporting}
        >
          <Download size={22} />
          <span>{exporting ? 'creating report…' : 'export analysis report'}</span>
        </button>

      </div>
      {isExportRangeOpen && (
        <div
          className="analytics-export-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !exporting) setIsExportRangeOpen(false);
          }}
        >
          <section
            className="glass-card analytics-export-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-export-title"
          >
            <h2 id="analytics-export-title" className="history-section-title">choose report period</h2>
            <p className="empty-msg-light">Select the period for your analysis report.</p>
            <div className="analytics-export-options">
              <button
                type="button"
                className="glass-card save-btn-card"
                onClick={() => handleExportReport('day')}
                disabled={exporting}
              >
                daily
              </button>
              <button
                type="button"
                className="glass-card save-btn-card"
                onClick={() => handleExportReport('week')}
                disabled={exporting}
              >
                weekly
              </button>
            </div>
            <button
              type="button"
              className="analytics-export-cancel"
              onClick={() => setIsExportRangeOpen(false)}
              disabled={exporting}
            >
              cancel
            </button>
          </section>
        </div>
      )}
    </Layout>
  );
};

export default AnalyticsPage;
