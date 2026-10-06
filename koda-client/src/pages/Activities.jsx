import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { Save, Milk, Moon, Baby, Clock, Calendar, AlertTriangle } from 'lucide-react';
import '../styling/global/App.css';
import '../styling/pages/activities.css';

import { getSelectedChildForUser, getCurrentUserId } from '../utils/authStorage';
import { queueActivityOffline } from '../utils/offlineStorage';
import { API_URL } from "../config";
import Layout from '../components/Layout';

const ACTIVITY_OPTIONS = [
  { type: 'feeding', label: 'feeding' },
  { type: 'sleep', label: 'sleeping' },
  { type: 'diaper', label: 'diaper change' },
  { type: 'playtime', label: 'playtime' },
  { type: 'mood', label: 'mood' },
];

const MOOD_OPTIONS = ['tired', 'upset', 'sad', 'mad', 'happy', 'energetic', 'angry', 'quiet', 'other'];
const PLAYTIME_OPTIONS = ['complete', 'not complete'];

const DAYS_OF_WEEK = [
  { key: 'Sunday', short: 'Su' },
  { key: 'Monday', short: 'Mo' },
  { key: 'Tuesday', short: 'Tu' },
  { key: 'Wednesday', short: 'We' },
  { key: 'Thursday', short: 'Th' },
  { key: 'Friday', short: 'Fr' },
  { key: 'Saturday', short: 'Sa' },
];

const Activities = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [mode, setMode] = useState('');

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

  const [repeat, setRepeat] = useState('once');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [repeatDays, setRepeatDays] = useState([]);

  const [sleepError, setSleepError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [duplicateEntry, setDuplicateEntry] = useState(null);
  const [pendingActivity, setPendingActivity] = useState(null);

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
    setRepeat('once');
    setScheduleDate('');
    setScheduleTime('');
    setRepeatDays([]);
    setSleepError('');
    setSubmitError('');
  };

  const buildActivityDetails = () => {
    if (type === 'sleep') {
      return { startTime, endTime, quality };
    }
    if (type === 'feeding') {
      return {
        type: feedingType,
        amount: feedingAmount ? Number(feedingAmount) : undefined,
        side: feedingType === 'Breast' && feedingSide ? feedingSide : 'N/A',
      };
    }
    if (type === 'diaper') {
      return { type: diaperType };
    }
    return { value: currentValue() };
  };

  const currentValue = () => {
    if (type === 'mood') {
      if (moodChoice === 'other') return moodNote.trim() ? `other: ${moodNote.trim()}` : 'other';
      return moodNote.trim() ? `${moodChoice}: ${moodNote.trim()}` : moodChoice;
    }
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
        await axios.post(`${API_URL}/api/schedule`, {
          childId,
          activityType: type,
          repeat,
          time: scheduleTime,
          ...(repeat === 'once' ? { date: scheduleDate } : {}),
          ...(repeat === 'weekly' ? { daysOfWeek: repeatDays } : {}),
          details: buildActivityDetails(),
        }, requestConfig);
      } else if (type === 'sleep') {
        const today = new Date().toISOString().split('T')[0];
        const sleepStart = new Date(`${today}T${startTime}`);
        const sleepEnd = new Date(`${today}T${endTime}`);
        if (startTime === endTime) {
          setSleepError('Start time and end time cannot be the same.');
          return;
        }

        setSleepError('');

        const duration = Math.round((sleepEnd - sleepStart) / (1000 * 60));

        saved = await saveActivity('sleep', {
          childId,
          startTime: sleepStart,
          endTime: sleepEnd,
          duration,
          quality,
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
      } else if (type === 'mood' || type === 'playtime') {
        const finalValue = currentValue();
        if (!finalValue) {
          setSubmitError(type === 'mood' ? 'pick a mood first.' : 'pick complete or not complete.');
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
        sessionStorage.setItem('koda-celebrate', kind + ':' + Date.now());
        window.dispatchEvent(new CustomEvent('activity-saved', { detail: { kind } }));
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
      sessionStorage.setItem('koda-celebrate', 'logged:' + Date.now());
      window.dispatchEvent(new CustomEvent('activity-saved', { detail: { kind: 'logged' } }));
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
                  you can log this {typeLabel} now, or set it up as a recurring schedule.
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

                {type === 'sleep' ? (
                  <div className="log-form-container">
                    <div className="log-form-title hm-title" style={{ justifyContent: "center", textAlign: "center", fontSize: "1.35rem", margin: "0 0 6px" }}>
                      <Moon size={28} color="#4a3a26" />
                      <span>{mode === 'schedule' ? 'schedule sleep' : 'sleep'}</span>
                    </div>
                    <p className="log-form-subtitle">track your baby's sleep</p>

                    <div className="log-field-group">
                      <label className="log-label">start time</label>
                      <div className="log-input-wrapper">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => {
                            setStartTime(e.target.value);
                            setSleepError('');
                          }}
                          className="log-input"
                          style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%" }}
                          required
                        />
                      </div>
                    </div>

                    <div className="log-field-group">
                      <label className="log-label">end time</label>
                      <div className="log-input-wrapper">
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value);
                            setSleepError('');
                          }}
                          className="log-input"
                          style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%" }}
                          required
                        />
                      </div>
                    </div>
                    {sleepError && (
                      <div className="sleep-warning" role="alert">
                        <AlertTriangle size={18} />
                        <span>{sleepError}</span>
                      </div>
                    )}
                    <div className="log-field-group">
                      <label className="log-label">quality</label>
                      <div className="log-option-row">
                        {['Good', 'Fair', 'Poor'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            className={`log-option-btn ${quality === option ? 'selected' : ''}`}
                            onClick={() => setQuality(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
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
                  </div>
                ) : (
                  <div className="log-form-container">
                    <div className="log-form-title hm-title" style={{ justifyContent: "center", textAlign: "center", fontSize: "1.35rem", margin: "0 0 6px" }}>
                      <span>
                        {mode === 'schedule'
                          ? (type === 'mood' ? 'schedule mood logging' : `schedule ${typeLabel}`)
                          : typeLabel}
                      </span>
                    </div>
                    {mode !== 'schedule' && type === 'playtime' && (
                      <div className="log-field-group">
                        <p className="log-form-subtitle" style={{ textAlign: "center", margin: "0 0 12px" }}>did playtime happen today?</p>
                        <div className="log-option-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
                          {PLAYTIME_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              style={{ width: "100%", padding: "14px 8px", whiteSpace: "nowrap", fontSize: "0.95rem" }}
                              className={`log-option-btn ${value === option ? 'selected' : ''}`}
                              onClick={() => setValue(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {mode !== 'schedule' && type === 'mood' && (
                      <div className="log-field-group">
                        <label className="log-label">how are they feeling?</label>
                        <div className="log-option-row" style={{ flexWrap: 'wrap' }}>
                          {MOOD_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              className={`log-option-btn ${moodChoice === option ? 'selected' : ''}`}
                              onClick={() => setMoodChoice(option)}
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
                    <div className="log-form-title hm-title" style={{ justifyContent: "center", textAlign: "center", fontSize: "1.35rem", margin: "0 0 6px" }}>
                      <Calendar size={26} color="#4a3a26" />
                      <span>schedule</span>
                    </div>
                    <p className="log-form-subtitle">set when this should repeat</p>

                    <div className="log-field-group">
                      <label className="log-label">repeat</label>
                      <div className="log-option-row">
                        {[
                          { key: 'once', label: 'once' },
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

                    {repeat === 'once' && (
                      <div className="log-field-group">
                        <label className="log-label">date</label>
                        <div className="log-input-wrapper">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="log-input"
                            style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%" }}
                            required
                          />
                        </div>
                      </div>
                    )}

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
                      <label className="log-label">time</label>
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