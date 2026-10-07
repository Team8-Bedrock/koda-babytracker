// Shows offline duplicates for the parent to keep or discard.
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import '../styling/pages/activities.css';

const OfflineDuplicateReview = ({ onReviewed }) => {
    const [isParent, setIsParent] = useState(false);
    const [entries, setEntries] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        axios.get(`${API_URL}/api/auth/me`, {
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
        })
            .then(({ data }) => {
                if (active) setIsParent(data.role === 'parent');
            })
            .catch(() => {
                if (active) setIsParent(false);
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!isParent || saving) return;

        let active = true;

        const loadEntries = async () => {
            if (!navigator.onLine) return;

            try {
                const response = await axios.get(
                    `${API_URL}/api/offline-duplicates`,
                    {
                        headers: {
                            'x-auth-token': localStorage.getItem('token')
                        },
                        timeout: 15000
                    }
                );

                if (active) {
                    setEntries(response.data.entries || []);
                }
            } catch (err) {
                console.error('Could not load pending duplicates:', err);
            }
        };

        loadEntries();

        const timer = setInterval(loadEntries, 30000);
        window.addEventListener('online', loadEntries);
        window.addEventListener('focus', loadEntries);
        window.addEventListener('offline-sync-complete', loadEntries);

        return () => {
            active = false;
            clearInterval(timer);
            window.removeEventListener('online', loadEntries);
            window.removeEventListener('focus', loadEntries);
            window.removeEventListener('offline-sync-complete', loadEntries);
        };
    }, [isParent, saving]);

    const reviewEntry = async (action) => {
        if (saving || entries.length === 0) return;

        const entryId = entries[0]._id;

        setSaving(true);
        setError('');

        try {
            await axios.post(
                `${API_URL}/api/offline-duplicates/${entryId}/review`,
                { action },
                {
                    headers: {
                        'x-auth-token': localStorage.getItem('token')
                    },
                    timeout: 15000
                }
            );

            setEntries((current) =>
                current.filter((entry) => entry._id !== entryId)
            );

            onReviewed?.();
        } catch (err) {
            setError(
                err.response?.data?.error ||
                'Could not save your decision. Please try again.'
            );
        } finally {
            setSaving(false);
        }
    };

    if (!isParent || entries.length === 0) return null;

    const entry = entries[0];

    return (
        <div className="duplicate-overlay">
            <div
                className="duplicate-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="offline-review-title"
                aria-describedby="offline-review-description"
            >
                <h2 id="offline-review-title">Offline Duplicate Review</h2>

                <p id="offline-review-description">
                    This offline entry may duplicate an existing activity.
                    It has not been added to the activity history yet.
                </p>

                <div className="duplicate-details">
                    <p>
                        <strong>Child:</strong>{' '}
                        {entry.childId?.name || 'Unknown child'}
                    </p>
                    <p>
                        <strong>Activity:</strong> {entry.activityType}
                    </p>
                    <p>
                        <strong>Logged by:</strong>{' '}
                        {entry.loggedBy?.username || 'Unknown user'}
                        {entry.loggedBy?.role ? ` (${entry.loggedBy.role})` : ''}
                    </p>
                    <p>
                        <strong>Time:</strong>{' '}
                        {new Date(entry.loggedAt).toLocaleString()}
                    </p>
                </div>

                <p><strong>Keep this offline entry?</strong></p>
                <p>{entries.length} awaiting review</p>

                {error && (
                    <p className="duplicate-error" role="alert">{error}</p>
                )}

                <div className="duplicate-actions">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => reviewEntry('keep')}
                    >
                        {saving ? 'Saving…' : 'Keep'}
                    </button>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => reviewEntry('discard')}
                    >
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OfflineDuplicateReview;