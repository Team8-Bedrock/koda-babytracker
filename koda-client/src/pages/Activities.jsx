import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Save, Milk, Moon, Baby, Clock, Calendar, AlertTriangle } from 'lucide-react';
import '../styling/global/App.css';
import '../styling/pages/activities.css';

import { getSelectedChildForUser, getCurrentUserId } from '../utils/authStorage';
import { queueActivityOffline } from '../utils/offlineStorage';
import { addNotification, removeScheduleNotifications } from '../utils/notifications';
import { API_URL } from "../config";
import Layout from '../components/Layout';

const ACTIVITY_OPTIONS = [
  { type: 'feeding', label: 'feeding' },
  { type: 'sleep', label: 'sleeping' },
  { type: 'diaper', label: 'diaper change' },
  { type: 'playtime', label: 'playtime' },
  { type: 'mood', label: 'mood' },
];

const SCHEDULABLE_TYPES = ['feeding', 'sleep', 'diaper', 'playtime', 'mood'];

const MOOD_OPTIONS = ['tired', 'mad', 'sad', 'energetic', 'happy', 'quiet', 'other'];

const DAYS_OF_WEEK = [
  { key: 'Sunday', short: 'Su' },
  { key: 'Monday', short: 'Mo' },
  { key: 'Tuesday', short: 'Tu' },
  { key: 'Wednesday', short: 'We' },
  { key: 'Thursday', short: 'Th' },
  { key: 'Friday', short: 'Fr' },
  { key: 'Saturday', short: 'Sa' },
];

const timeOnDay = (time, dayOffset = 0) => {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
};

const timeRange = (start, end, shift = 0) => {
  let from = timeOnDay(start, shift);
  const to = timeOnDay(end, shift);
  if (to <= from) from = timeOnDay(start, shift - 1);
  return { start: from, end: to, duration: Math.round((to - from) / (1000 * 60)) };
};
const clockLabel = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const Activities = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [mode, setMode] = useState('');
  const [canSchedule, setCanSchedule] = useState(false);

  const [value, setValue] = useState('');
  const [feedingAmount, setFeedingAmount] = useState('');
  const [feedingType, setFeedingType] = useState('');
  const [feedingSide, setFeedingSide] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quality, setQuality] = useState('');
  const [diaperType, setDiaperType] = useState('');
  const [moodChoice, setMoodChoice] = useState('');
  const [moodNote, setMoodNote] = useState('');

  const [repeat, setRepeat] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('');
  const [repeatDays, setRepeatDays] = useState([]);

  const [sleepError, setSleepError] = useState('');
  const [futureEnd, setFutureEnd] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState(null);
  const [pendingActivity, setPendingActivity] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    axios.get(`${API_URL}/api/auth/me`, { headers: { 'x-auth-token': token } })
      .then((response) => setCanSchedule(response.data?.role === 'parent'))
      .catch((error) => console.error('Could not verify scheduling permissions:', error));
  }, []);

  const toggleRepeatDay = (day) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleBack = () => {
    setStep(1);
    setType('');
    setMode('');
    setValue('');
    setMoodChoice('');
    setMoodNote('');
    setFeedingAmount('');
    setFeedingType('');
    setFeedingSide('');
    setStartTime('');
    setEndTime('');
    setQuality('');
    setDiaperType('');
    setRepeat('daily');
    setScheduleTime('');
    setRepeatDays([]);
    setSleepError('');
    setSubmitError('');
    setFutureEnd(false);
  };

  const buildActivityDetails = () => {
    if (type === 'sleep' || type === 'playtime') {
      if (mode === 'schedule') {
        return { startTime, endTime };
      }

      return {
        startTime,
        endTime,
        ...(type === 'sleep' ? { quality } : {}),
      };
    }
    if (type === 'feeding') {
      return {
        type: feedingType,
        amount: feedingAmount ? Number(feedingAmount) : undefined,
        side: feedingType === 'Breast' && feedingSide ? feedingSide : 'N/A',
      };
    }
    if (type === 'diaper') {
      return mode === 'schedule' ? {} : { type: diaperType };
    }
    if (mode === 'schedule') return {};
    return { value: currentValue() };
  };

  const currentValue = () => {
    if (type === 'mood') {
      if (moodChoice === 'other') return moodNote.trim() ? `other: ${moodNote.trim()}` : 'other';
      return moodNote.trim() ? `${moodChoice}: ${moodNote.trim()}` : moodChoice;
    }
    if (type === 'playtime') return value || 'complete';
    return value;
  };

  //Catches duplicate response
  const saveActivity = async (activityType, activityData, requestConfig) => {
    const storeOffline = async () => {
      const userId = getCurrentUserId();

      if (!userId) {
        throw new Error('Please log in before saving an activity.');
      }

      await queueActivityOffline(activityType, {
        ...activityData,
        loggedBy: userId
      });

      sessionStorage.setItem(
        'showOfflineSaveNotice',
        JSON.stringify({
          title: navigator.onLine
            ? 'Entry saved on this device'
            : 'You’re offline. Entry saved on this device.',
          message: 'It will sync automatically when the connection is restored.'
        })
      );
      addNotification({
        title: navigator.onLine
          ? 'Entry saved on this device'
          : 'You’re offline. Entry saved on this device.',
        message: 'It will sync automatically when the connection is restored.',
        path: '/add-activity',
      });

      return true;
    };

    if (!navigator.onLine) {
      return storeOffline();
    }

    try {
      await axios.post(
        `${API_URL}/api/${activityType}`,
        activityData,
        {
          ...requestConfig,
          timeout: 15000
        }
      );

      return true;
    } catch (err) {
      if (
        err.response?.status === 409 &&
        err.response?.data?.code === 'DUPLICATE_ACTIVITY'
      ) {
        setDuplicateEntry(err.response.data.existingEntry);
        setPendingActivity({
          activityType,
          activityData
        });

        return false;
      }

      // Queue the entry if the server cannot be reached.
      // HTTP errors will show normally
      if (
        !err.response &&
        ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(err.code)
      ) {
        return storeOffline();
      }

      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const timed = type === 'sleep' || type === 'playtime';

    if (timed && startTime && endTime && startTime === endTime) {
      setSleepError('Start time and end time cannot be the same.');
      return;
    }
    if (timed && mode !== 'schedule' && startTime && endTime) {
      const range = timeRange(startTime, endTime);
      if (range.end > new Date()) {
        setFutureEnd(true);
        setSleepError(`that time hasn't happened yet. it's only ${clockLabel(new Date())}, try again.`);
        return;
      }
    }

    try {
      const selectedChild = getSelectedChildForUser();
      const childId = selectedChild?._id;
      const token = localStorage.getItem('token');

      if (!childId || !token) {
        setSubmitError('no child profile is selected. pick one in settings before logging.');
        return;
      }

      setSubmitting(true);
      const requestConfig = { headers: { 'x-auth-token': token } };
      let saved = true;

      if (mode === 'schedule') {
        if (!SCHEDULABLE_TYPES.includes(type)) {
          setSubmitError('that activity can\'t be scheduled.');
          return;
        }
        if (repeat === 'weekly' && repeatDays.length === 0) {
          setSubmitError('choose at least one day for a weekly schedule.');
          return;
        }
        await axios.post(`${API_URL}/api/schedule`, {
          childId,
          activityType: type,
          repeat,
          time: scheduleTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(repeat === 'weekly' ? { daysOfWeek: repeatDays } : {}),
          details: buildActivityDetails(),
        }, requestConfig);
      } else if (type === 'sleep') {
        if (!quality) {
          setSleepError('Pick how they slept.');
          return;
        }
        setSleepError('');
        const range = timeRange(startTime, endTime);
        saved = await saveActivity('sleep', {
          childId,
          startTime: range.start,
          endTime: range.end,
          duration: range.duration,
          quality,
        }, requestConfig);
      } else if (type === 'playtime') {
        setSleepError('');
        const range = timeRange(startTime, endTime);
        saved = await saveActivity('playtime', {
          childId,
          value: 'complete',
          startTime: range.start,
          endTime: range.end,
          duration: range.duration,
        }, requestConfig);
      } else if (type === 'feeding') {
        saved = await saveActivity('feeding', {
          childId,
          type: feedingType,
          amount: feedingAmount ? Number(feedingAmount) : undefined,
          side: feedingType === 'Breast' && feedingSide ? feedingSide : 'N/A',
        }, requestConfig);
      } else if (type === 'diaper') {
        saved = await saveActivity('diaper', {
          childId,
          type: diaperType,
        }, requestConfig);
      } else if (type === 'mood') {
        const finalValue = currentValue();
        if (!finalValue) {
          setSubmitError('pick a mood first.');
          return;
        }
        saved = await saveActivity(type, {
          childId,
          value: finalValue,
          ...(type === 'mood' ? { mood: moodChoice, notes: moodNote.trim() } : {}),
        }, requestConfig);
      }

      if (saved) {
        const kind = mode === 'schedule' ? 'scheduled' : 'logged';
        if (kind === 'logged') {
          const loggedAt = type === 'sleep'
            ? timeRange(startTime, endTime).start
            : new Date();
          removeScheduleNotifications(childId, type, loggedAt);
        }
        sessionStorage.setItem('koda-celebrate', kind + ':' + Date.now());
        window.dispatchEvent(new CustomEvent('activity-saved', {
          detail: { kind, activityType: type, childId },
        }));
        navigate('/ParentDashboard');
      }
    } catch (err) {
      console.error("Error saving activity:", err);
      setSubmitError(err.response?.data?.error || err.response?.data?.msg || err.message || 'could not save that activity. please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  //Duplicate detection keep and discard
  const handleKeepDuplicate = async () => {
    if (!pendingActivity || submitting) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_URL}/api/${pendingActivity.activityType}`,
        {
          ...pendingActivity.activityData,
          allowDuplicate: true
        },
        {
          headers: { 'x-auth-token': token }
        }
      );

      setDuplicateEntry(null);
      setPendingActivity(null);
      removeScheduleNotifications(
        pendingActivity.activityData.childId,
        pendingActivity.activityType,
        pendingActivity.activityData.startTime || new Date()
      );
      sessionStorage.setItem('koda-celebrate', 'logged:' + Date.now());
      window.dispatchEvent(new CustomEvent('activity-saved', {
        detail: {
          kind: 'logged',
          activityType: pendingActivity.activityType,
          childId: pendingActivity.activityData.childId,
        },
      }));
      navigate('/ParentDashboard');
    } catch (err) {
      setSubmitError(
        err.response?.data?.error ||
        err.response?.data?.msg ||
        'Could not save the entry. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDuplicate = () => {
    if (submitting) return;

    setDuplicateEntry(null);
    setPendingActivity(null);
    setSubmitError('');
    navigate('/ParentDashboard');
  };

  const typeLabel = ACTIVITY_OPTIONS.find((o) => o.type === type)?.label || '';

  const renderTimeFields = (startLabel, endLabel) =>
    [
      { label: startLabel, value: startTime, set: setStartTime },
      { label: endLabel, value: endTime, set: setEndTime },
    ].map(({ label, value: fieldValue, set }, index) => (
      <div className="log-field-group" key={label}>
        <label className="log-label">{label}</label>
        <div
          className="log-input-wrapper"
          style={index === 1 && futureEnd ? { boxShadow: "0 0 0 2px #e5383b", borderRadius: 12 } : undefined}
        >
          <input
            type="time"
            value={fieldValue}
            aria-invalid={index === 1 && futureEnd ? true : undefined}
            onChange={(e) => {
              set(e.target.value);
              setSleepError('');
              setFutureEnd(false);
            }}
            className="log-input"
            style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%" }}
            required
          />
        </div>
      </div>
    ));

  return (
    <Layout>
      <div className="activities-content">

        <form onSubmit={handleSubmit} className="activities-form">

          {step === 1 && (
            <div className="activities-option-list">
              {ACTIVITY_OPTIONS.map(({ type: optionType, label }) => (
                <button
                  key={optionType}
                  type="button"
                  className="activity-menu-btn activities-option-row"
                  onClick={() => {
                    setType(optionType);
                    setStep(2);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <>
              <div className="glass-card activities-glass-card">
                <div
                  className="hm-title"
                  style={{
                    fontWeight: 700,
                    color: '#2f5a3a',
                    width: '100%',
                    textAlign: 'center',
                    cursor: 'default',
                    fontSize: '1.6rem',
                    marginBottom: 4,
                  }}
                >
                  how would you like to log this?
                </div>
                <p className="log-form-subtitle">
                  {canSchedule && SCHEDULABLE_TYPES.includes(type)
                    ? `you can log this ${typeLabel} now, or set a daily or weekly reminder.`
                    : `log this ${typeLabel} now.`}
                </p>

                <div className="mode-select-list">
                  <button
                    type="button"
                    className="activity-menu-btn activities-option-row"
                    onClick={() => {
                      setMode('now');
                      setStep(3);
                    }}
                  >
                    log activity
                  </button>
                  {canSchedule && SCHEDULABLE_TYPES.includes(type) && (
                    <button
                      type="button"
                      className="activity-menu-btn activities-option-row"
                      onClick={() => {
                        setMode('schedule');
                        setStep(3);
                      }}
                    >
                      schedule activity
                    </button>
                  )}
                </div>
              </div>

              <button type="button" className="activities-cancel-btn" onClick={handleBack}>
                cancel
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="glass-card activities-glass-card">

                {type === 'sleep' && mode !== 'schedule' ? (
                  <div className="log-form-container">
                    <div className="log-form-title hm-title" style={{ justifyContent: "center", textAlign: "center", fontSize: "1.35rem", margin: "0 0 6px" }}>
                      <Moon size={28} color="#4a3a26" />
                      <span>{mode === 'schedule' ? 'schedule nap' : 'sleep'}</span>
                    </div>
                    <p className="log-form-subtitle">
                      {mode === 'schedule' ? 'set your expected nap times for your baby' : "track your baby's sleep"}
                    </p>

                    {renderTimeFields(mode === 'schedule' ? 'nap starts' : 'fell asleep at', mode === 'schedule' ? 'nap ends' : 'woke up at')}
                    {sleepError && (
                      <div className="sleep-warning" role="alert">
                        <AlertTriangle size={18} />
                        <span>{sleepError}</span>
                      </div>
                    )}
                    {mode !== 'schedule' && (
                      <div className="log-field-group">
                        <label className="log-label">how did they sleep?</label>
                        <div className="log-option-row">
                          {['Good', 'Fair', 'Poor'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`log-option-btn ${quality === option ? 'selected' : ''}`}
                              onClick={() => {
                                setQuality(option);
                                setSleepError('');
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : type === 'feeding' ? (
                  <div className="log-form-container">
                    <div className="log-form-title hm-title" style={{ justifyContent: "center", textAlign: "center", fontSize: "1.35rem", margin: "0 0 6px" }}>
                      <Milk size={28} color="#4a3a26" />
                      <span>{mode === 'schedule' ? 'schedule feeding' : 'feeding'}</span>
                    </div>
                    <p className="log-form-subtitle">track your baby's feeding</p>

                    <div className="log-field-group">
                      <label className="log-label">feeding type</label>
                      <div className="log-option-row">
                        {['Breast', 'Bottle', 'Solids'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`log-option-btn ${feedingType === option ? 'selected' : ''}`}
                            onClick={() => {
                              setFeedingType(option);
                              if (option !== 'Breast') setFeedingSide('');
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="log-field-group">
                      <label className="log-label">amount (oz)</label>
                      <div className="log-input-wrapper">
                        <Milk size={20} color="#5a4635" />
                        <input
                          type="number"
                          value={feedingAmount}
                          onChange={(e) => setFeedingAmount(e.target.value)}
                          className="log-input"
                          style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%" }}
                          placeholder="e.g. 4"
                          min="0"
                        />
                      </div>
                    </div>

                    {feedingType === 'Breast' && (
                      <div className="log-field-group">
                        <label className="log-label">side</label>
                        <div className="log-option-row">
                          {['Left', 'Right', 'N/A'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`log-option-btn ${feedingSide === option ? 'selected' : ''}`}
                              onClick={() => setFeedingSide(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : type === 'diaper' ? (
                  <div className="log-form-container">
                    <div className="log-form-title hm-title" style={{ justifyContent: "center", textAlign: "center", fontSize: "1.35rem", margin: "0 0 6px" }}>
                      <Baby size={28} color="#4a3a26" />
                      <span>{mode === 'schedule' ? 'schedule diaper change' : 'diaper change'}</span>
                    </div>
                    <p className="log-form-subtitle">track your baby's diaper change</p>

                    {mode !== 'schedule' && (
                      <div className="log-field-group">
                        <label className="log-label">diaper type</label>
                        <div className="log-option-row">
                          {['Wet', 'Dirty', 'Mixed'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`log-option-btn ${diaperType === option ? 'selected' : ''}`}
                              onClick={() => setDiaperType(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="log-form-container">
                    <div className="log-form-title hm-title" style={{ justifyContent: "center", textAlign: "center", fontSize: "1.35rem", margin: "0 0 6px" }}>
                      {type === 'sleep' && mode === 'schedule' && <Calendar size={26} color="#4a3a26" />}
                      <span>
                        {mode === 'schedule'
                          ? (type === 'mood' ? 'schedule mood logging' : `schedule ${typeLabel}`)
                          : typeLabel}
                      </span>
                    </div>
                    {type === 'sleep' && mode === 'schedule' && (
                      <>
                        <p className="log-form-subtitle" style={{ textAlign: "center", margin: "0 0 12px" }}>
                          set your expected nap times for your baby
                        </p>
                        {renderTimeFields('expected start', 'expected end')}
                        {sleepError && (
                          <div className="sleep-warning" role="alert">
                            <AlertTriangle size={18} />
                            <span>{sleepError}</span>
                          </div>
                        )}
                      </>
                    )}
                    {type === 'playtime' && (
                      <>
                        <p className="log-form-subtitle" style={{ textAlign: "center", margin: "0 0 12px" }}>
                          {mode === 'schedule' ? 'when should playtime start and end?' : 'when did playtime start and end?'}
                        </p>
                        {renderTimeFields(mode === 'schedule' ? 'playtime starts' : 'started at', mode === 'schedule' ? 'playtime ends' : 'ended at')}
                        {sleepError && (
                          <div className="sleep-warning" role="alert">
                            <AlertTriangle size={18} />
                            <span>{sleepError}</span>
                          </div>
                        )}
                      </>
                    )}
                    {mode !== 'schedule' && type === 'mood' && (
                      <div className="log-field-group">
                        <label className="log-label">how are they feeling?</label>
                        <div className="log-option-row" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                          {MOOD_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`log-option-btn ${moodChoice === option ? 'selected' : ''}`}
                              onClick={() => setMoodChoice(option)}
                              style={{ flex: '0 0 calc((100% - 20px) / 3)', minWidth: 0, margin: 0 }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {moodChoice === 'other' && (
                          <textarea
                            className="empty-msg-light activity-input"
                            placeholder="write your own notes"
                            value={moodNote}
                            onChange={(e) => setMoodNote(e.target.value)}
                            rows={3}
                            style={{ marginTop: 10, resize: 'vertical' }}
                            required
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {mode === 'schedule' && (
                  <div className="log-form-container">
                    <div className="log-field-group">
                      <label className="log-label">repeat</label>
                      <div className="log-option-row">
                        {[
                          { key: 'daily', label: 'daily' },
                          { key: 'weekly', label: 'weekly' },
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            className={`log-option-btn ${repeat === key ? 'selected' : ''}`}
                            onClick={() => setRepeat(key)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {repeat === 'weekly' && (
                      <div className="log-field-group">
                        <label className="log-label">days</label>
                        <div className="schedule-days-row">
                          {DAYS_OF_WEEK.map(({ key, short }) => (
                            <button
                              key={key}
                              type="button"
                              className={`schedule-day-btn ${repeatDays.includes(key) ? 'selected' : ''}`}
                              onClick={() => toggleRepeatDay(key)}
                            >
                              {short}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="log-field-group">
                      <label className="log-label">{type === 'feeding' ? 'time' : 'log by'}</label>
                      <div className="log-input-wrapper">
                        <Clock size={20} color="#5a4635" />
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="log-input"
                          style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%" }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="sleep-warning" role="alert">
                  <AlertTriangle size={18} />
                  <span>{submitError}</span>
                </div>
              )}

              <button type="submit" className="glass-card save-btn-card save-btn-card--activities" disabled={submitting}>
                <Save size={20} />
                <span>{submitting ? 'saving…' : (mode === 'schedule' ? 'save schedule' : 'save entry')}</span>
              </button>

              <button type="button" className="activities-cancel-btn" onClick={handleBack}>
                cancel
              </button>
            </>
          )}

        </form>
      </div>

      {duplicateEntry && (
        <div className="duplicate-overlay">
          <div
            className="duplicate-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="duplicate-title"
            aria-describedby="duplicate-description"
          >
            <h2 id="duplicate-title">Duplicate Entry Detected</h2>

            <p id="duplicate-description">
              Was this activity already logged? A similar entry for this
              child was recorded within the past 15 minutes.
            </p>

            <div className="duplicate-details">
              <p>
                <strong>Activity:</strong> {duplicateEntry.activityType}
              </p>
              <p>
                <strong>User:</strong> {duplicateEntry.username}
                {duplicateEntry.role ? ` (${duplicateEntry.role})` : ''}
              </p>
              <p>
                <strong>Time:</strong>{' '}
                {new Date(duplicateEntry.timestamp).toLocaleString()}
              </p>
            </div>

            <p><strong>Are you sure you want to keep this record?</strong></p>

            {submitError && (
              <p className="duplicate-error" role="alert">
                {submitError}
              </p>
            )}

            <div className="duplicate-actions">
              <button
                type="button"
                onClick={handleKeepDuplicate}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : 'Keep'}
              </button>

              <button
                type="button"
                onClick={handleCancelDuplicate}
                disabled={submitting}
                autoFocus
              >
                Cancel Log
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Activities;