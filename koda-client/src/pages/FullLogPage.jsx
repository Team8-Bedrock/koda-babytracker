import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styling/global/App.css';
import '../styling/pages/historyPage.css';
import { getSelectedChildForUser } from '../utils/authStorage';
import { API_URL } from '../config';
import Layout from '../components/Layout';

const FullLogPage = () => {
  const navigate = useNavigate();
  const selectedChild = getSelectedChildForUser();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchEntries = async () => {
      const childId = selectedChild?._id;
      const token = localStorage.getItem('token');
      if (!childId || !token) {
        setEntries([]);
        setError(childId ? 'Please sign in to view activity history.' : 'Select a child profile to view activity history.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/activities`, {
          params: { childId },
          headers: { 'x-auth-token': token },
        });
        const { feedings = [], sleeps = [], diapers = [], moods = [], playtimes = [] } = response.data;
        const allEntries = [
          ...feedings.map((item) => ({
            id: `feeding-${item._id}`,
            type: 'feeding',
            label: `feeding • ${item.type || 'N/A'}`,
            detail: [
              item.amount ? `${item.amount} oz` : null,
              item.side && item.side !== 'N/A' ? `${item.side} side` : null,
            ].filter(Boolean).join(' • ') || 'logged',
            timestamp: item.timestamp,
          })),
          ...sleeps.map((item) => ({
            id: `sleep-${item._id}`,
            type: 'sleep',
            label: `sleep${item.type ? ` • ${item.type}` : ''}`,
            detail: [
              item.startTime && item.endTime
                ? `${new Date(item.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(item.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : null,
              item.duration ? `${item.duration} min` : null,
              item.quality || null,
            ].filter(Boolean).join(' • ') || 'logged',
            timestamp: item.timestamp || item.endTime || item.startTime,
          })),
          ...diapers.map((item) => ({
            id: `diaper-${item._id}`,
            type: 'diaper',
            label: 'diaper change',
            detail: item.type || 'logged',
            timestamp: item.timestamp,
          })),
          ...moods.map((item) => ({
            id: `mood-${item._id}`,
            type: 'mood',
            label: 'mood',
            detail: item.value || 'logged',
            timestamp: item.timestamp,
          })),
          ...playtimes.map((item) => ({
            id: `playtime-${item._id}`,
            type: 'playtime',
            label: 'playtime',
            detail: item.value || 'logged',
            timestamp: item.timestamp,
          })),
        ].filter((item) => item.timestamp && !Number.isNaN(new Date(item.timestamp).getTime()))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (active) {
          setEntries(allEntries);
          setError('');
        }
      } catch (requestError) {
        console.error('Could not load full activity history:', requestError);
        if (active) setError('Could not load activity history. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEntries();
    return () => { active = false; };
  }, [selectedChild?._id]);

  return (
    <Layout>
      <div className="history-content">
        <div className="full-log-header">
          <button
            type="button"
            className="full-log-back-btn"
            onClick={() => navigate('/ParentDashboard')}
          >
            <ArrowLeft size={18} />
            <span>back to dashboard</span>
          </button>
        </div>
        <div className="glass-card full-log-card">
          <div className="card-header">
            <FileText size={22} strokeWidth={2} color="#315b3d" />
            <span>all entries</span>
          </div>
          {loading ? (
            <p className="empty-msg-light">loading history…</p>
          ) : error ? (
            <p className="empty-msg-light" role="alert">{error}</p>
          ) : entries.length > 0 ? (
            <div className="history-list">
              {entries.map((entry) => (
                <div key={entry.id} className="history-item">
                  <strong>{entry.label}</strong>
                  <div className="empty-msg-light">{entry.detail}</div>
                  <div className="empty-msg-light">{new Date(entry.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-msg-light">No history yet. Log an activity to see it here.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FullLogPage;
