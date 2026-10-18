import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FileText, Download, Moon, Milk, Baby } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import '../styling/global/App.css';
import '../styling/pages/historyPage.css';
import '../styling/components/chartLegend.css';
import { getSelectedChildForUser } from '../utils/authStorage';
import { API_URL } from '../config';
import Layout from '../components/Layout';
import { CollapsibleCard, MiniCollapsibleCard } from '../components/CollapsibleCard';
import { DIAPER_COLORS } from '../constants/diaperColors';

const convertMinutes = (minutes, unit) => {
  if (unit === 'seconds') return Math.round(minutes * 60);
  if (unit === 'hours') return Math.round((minutes / 60) * 10) / 10;
  return minutes;
};

const unitSuffix = { minutes: 'min', seconds: 'sec', hours: 'hr' };

const DIAPER_LEGEND_CLASS = { Wet: 'legend-dot--wet', Dirty: 'legend-dot--dirty', Mixed: 'legend-dot--mixed' };

const HistoryPage = () => {
  const selectedChild = getSelectedChildForUser();
  const [historyItems, setHistoryItems] = useState([]);
  const [range, setRange] = useState('day');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sleepUnit, setSleepUnit] = useState('minutes');

  useEffect(() => {
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
            startTime: item.startTime,
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
  }, [selectedChild?._id]);

  const filteredHistoryItems = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (range === 'week') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
    }

    return historyItems.filter((item) => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= start && itemDate <= now;
    });
  }, [historyItems, range]);

  const aiSummary = useMemo(() => {
    const feedingCount = filteredHistoryItems.filter((item) => item.type === 'feeding').length;
    const sleepCount = filteredHistoryItems.filter((item) => item.type === 'sleep').length;
    const diaperCount = filteredHistoryItems.filter((item) => item.type === 'diaper').length;

    if (!filteredHistoryItems.length) {
      return 'No activity history yet. Start logging entries to build the report.';
    }

    return `AI-guided review: ${feedingCount} feedings, ${sleepCount} sleep records, and ${diaperCount} diaper updates captured. The history shows a steady routine with recent entries ready for export.`;
  }, [filteredHistoryItems]);


  const quickStats = useMemo(() => {
    const sleepItems = filteredHistoryItems.filter((item) => item.type === 'sleep');
    const feedingItems = filteredHistoryItems.filter((item) => item.type === 'feeding');
    const diaperItems = filteredHistoryItems.filter((item) => item.type === 'diaper');

    const totalSleepMinutes = sleepItems.reduce((total, item) => {
      const match = item.detail.match(/(\d+)\s*min/);
      const duration = match ? Number(match[1]) : 0;
      return total + duration;
    }, 0);

    return {
      totalSleepMinutes,
      sleepCount: sleepItems.length,
      feedingCount: feedingItems.length,
      diaperCount: diaperItems.length,
    };
  }, [filteredHistoryItems]);

  const sleepChartData = useMemo(() => {
    const sleepItems = filteredHistoryItems.filter((item) => item.type === 'sleep');

    if (range === 'day') {
      const sortedSleeps = [...sleepItems].sort(
        (a, b) =>
          new Date(a.startTime) - new Date(b.startTime)
      );

      return sortedSleeps.map((item) => {
        const match = item.detail.match(/(\d+)\s*min/);
        const duration = match ? Number(match[1]) : 0;

        const sleepTime = new Date(
          item.startTime
        ).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

        return {
          label: sleepTime,
          minutes: duration
        };
      });
    }

    const dailySleep = {};

    sleepItems.forEach((item) => {
      const date = new Date(item.timestamp);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      const match = item.detail.match(/(\d+)\s*min/);
      const duration = match ? Number(match[1]) : 0;
      dailySleep[day] = (dailySleep[day] || 0) + duration;
    });

    return Object.entries(dailySleep).map(([day, minutes]) => ({ label: day, minutes }));
  }, [filteredHistoryItems, range]);

  const sleepChartDisplayData = useMemo(
    () => sleepChartData.map((item) => ({
      label: item.label,
      value: convertMinutes(item.minutes, sleepUnit),
    })),
    [sleepChartData, sleepUnit]
  );

  const feedingChartData = useMemo(() => {
    const feedingItems = filteredHistoryItems.filter((item) => item.type === 'feeding');

    if (range === 'day') {
      return feedingItems
        .map((item, index) => {
          const match = item.detail.match(/(\d+(?:\.\d+)?)\s*oz/);
          const amount = match ? Number(match[1]) : 0;
          return { label: `Feed ${index + 1}`, ounces: amount };
        })
        .filter((item) => item.ounces > 0);
    }

    const dailyFeeding = {};

    feedingItems.forEach((item) => {
      const match = item.detail.match(/(\d+(?:\.\d+)?)\s*oz/);
      const amount = match ? Number(match[1]) : 0;

      if (amount > 0) {
        const date = new Date(item.timestamp);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
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
        if (counts[item.detail] !== undefined) {
          counts[item.detail] += 1;
        }
      });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredHistoryItems]);

  const diaperTotal = diaperChartData.reduce((total, item) => total + item.value, 0);

  const handleExport = async () => {
    try {
      setExporting(true);
      const childId = selectedChild?._id;
      const childName = selectedChild?.name || 'child';
      const token = localStorage.getItem('token');

      if (!childId || !token) {
        throw new Error('A selected child and authenticated user are required.');
      }

      const response = await axios.post(
        `${API_URL}/api/reports/generate`,
        { childId, range, type: 'log' },
        {
          headers: { 'x-auth-token': token },
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${childName}-${range}-log.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Could not export log', error);
      alert('Unable to create the PDF right now. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="history-content">

        <div className="history-segmented-wrap">
          <button
            type="button"
            className="history-segment-btn"
            data-active={range === 'day'}
            onClick={() => setRange('day')}
          >
            today
          </button>
          <button
            type="button"
            className="history-segment-btn"
            data-active={range === 'week'}
            onClick={() => setRange('week')}
          >
            past week
          </button>
        </div>

        <CollapsibleCard title="activity history">
          <div className="card-header">
            <FileText size={22} strokeWidth={2} color="#315b3d" />
            <span>overview</span>
          </div>
          <p className="empty-msg-light">{loading ? 'loading…' : aiSummary}</p>
        </CollapsibleCard>

        <CollapsibleCard title="entries history" defaultOpen={false}>
          {loading ? (
            <p className="empty-msg-light">loading history…</p>
          ) : filteredHistoryItems.length > 0 ? (
            <div className="history-list">
              {filteredHistoryItems.map((item) => (
                <div key={item.id} className="history-item">
                  <strong>{item.label}</strong>
                  <div className="empty-msg-light">{item.detail}</div>
                  <div className="empty-msg-light">{new Date(item.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-msg-light">No history yet. Log an activity to see it here.</p>
          )}
        </CollapsibleCard>

        <CollapsibleCard title="quick stats">
          <div className="history-quick-stats-grid">
            <div className="history-quick-stat-card">
              <Moon size={22} color="#315b3d" />
              <strong className="history-quick-stat-value">
                {quickStats.totalSleepMinutes < 60
                  ? `${quickStats.totalSleepMinutes} min`
                  : `${Math.floor(quickStats.totalSleepMinutes / 60)} hr ${quickStats.totalSleepMinutes % 60 || ''}${quickStats.totalSleepMinutes % 60 ? ' min' : ''}`}
              </strong>
              <span className="history-quick-stat-label">total sleep</span>
            </div>
            <div className="history-quick-stat-card">
              <Moon size={22} color="#315b3d" />
              <strong className="history-quick-stat-value">{quickStats.sleepCount}</strong>
              <span className="history-quick-stat-label">sleep sessions</span>
            </div>
            <div className="history-quick-stat-card">
              <Milk size={22} color="#315b3d" />
              <strong className="history-quick-stat-value">{quickStats.feedingCount}</strong>
              <span className="history-quick-stat-label">feedings</span>
            </div>
            <div className="history-quick-stat-card">
              <Baby size={22} color="#315b3d" />
              <strong className="history-quick-stat-value">{quickStats.diaperCount}</strong>
              <span className="history-quick-stat-label">diaper changes</span>
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="sleep duration"
          headerExtra={(
            <select
              value={sleepUnit}
              onChange={(event) => setSleepUnit(event.target.value)}
              className="history-unit-select"
            >
              <option value="seconds">seconds</option>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
            </select>
          )}
        >
          {sleepChartDisplayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sleepChartDisplayData}>
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} ${unitSuffix[sleepUnit]}`, 'Sleep duration']} />
                <Bar dataKey="value" fill="#8A7BC2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-msg-light">No sleep data for this period.</p>
          )}
        </CollapsibleCard>

        <div className="chart-row">
          <MiniCollapsibleCard title="feeding entries">
            {feedingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={feedingChartData} layout="vertical" margin={{ top: 5, right: 38, bottom: 5, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={42} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [`${value} oz`, 'Feeding amount']} />
                  <Bar dataKey="ounces" fill="#789F75" radius={[0, 6, 6, 0]} barSize={14}>
                    <LabelList dataKey="ounces" position="right" formatter={(value) => `${value} oz`} fontSize={10} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-msg-light">No feeding amounts recorded.</p>
            )}
          </MiniCollapsibleCard>

          <MiniCollapsibleCard title="diaper entries">
            {diaperTotal > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={125}>
                  <PieChart>
                    <Pie data={diaperChartData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={45} paddingAngle={2}>
                      {diaperChartData.map((item, index) => (
                        <Cell key={item.name} fill={DIAPER_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} changes`, 'Diapers']} />
                  </PieChart>
                </ResponsiveContainer>

                <div>
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
              </>
            ) : (
              <p className="empty-msg-light">No diaper changes recorded.</p>
            )}
          </MiniCollapsibleCard>
        </div>

        <button
          type="button"
          className="glass-card save-btn-card history-export-btn"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download size={22} />
          <span>{exporting ? 'creating pdf…' : 'export pdf'}</span>
        </button>

      </div>
    </Layout>
  );
};

export default HistoryPage;
