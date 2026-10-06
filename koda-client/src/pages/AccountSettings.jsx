import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Users, Baby, ChevronRight, Lock, LogOut, Settings as SettingsIcon } from 'lucide-react';
import '../styling/global/App.css';
import '../styling/pages/accountSettings.css';
import '../styling/pages/setUp.css';
import { API_URL } from '../config';
import Layout from '../components/Layout';
import { getSelectedChildForUser } from '../utils/authStorage';
import CaregiverLinkPanel from '../components/settings/CaregiverLinkPanel';
import CaregiverManagementPanel from '../components/settings/CaregiverManagementPanel';
import ChildProfilePicker from '../components/settings/ChildProfilePicker';
import DarkModeToggle from '../components/DarkModeToggle';

const CollapseRow = ({ open, children, topGap = false }) => (
  <div
    className={`account-collapse-row ${open ? 'account-collapse-row--open' : ''} ${topGap ? 'account-collapse-row--gap' : ''}`}
  >
    <div className="account-collapse-row-inner">
      {children}
    </div>
  </div>
);

const AccountSettings = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  const [role, setRole] = useState(null);

  const [category, setCategory] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('koda-dark-mode') === 'true');

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('koda-dark-mode', String(next));
      window.dispatchEvent(new CustomEvent('koda-dark-mode', { detail: { isDarkMode: next } }));
      return next;
    });
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    const savedChild = getSelectedChildForUser();
    if (savedChild) setSelectedChild(savedChild);

    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/auth/me`, {
      headers: { 'x-auth-token': token },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((user) => {
        setRole(user?.role || 'parent');
        setEmail(user?.email || '');
        setAccessChecked(true);
      })
      .catch(() => setAccessChecked(true));
  }, [navigate]);

  if (!accessChecked) return null;

  const isCaregiver = role === 'caregiver';
  const childName = selectedChild?.name || 'Gracie';

  const panelTitles = {
    account: 'account settings',
    caretaker: isCaregiver ? 'link to a parent' : 'caregiver settings',
    baby: `${childName}'s settings`,
  };

  const panelIcons = {
    account: <User size={22} strokeWidth={2} color="#315b3d" />,
    caretaker: <Users size={22} strokeWidth={2} color="#315b3d" />,
    baby: <Baby size={22} strokeWidth={2} color="#315b3d" />,
  };

  const openCategory = (id) => {
    setCategory(id);
  };

  const closeCategory = () => {
    setCategory(null);
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusMessage('please fill out all three fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage('new passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      setStatusMessage('');
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_URL}/api/account/change-password`,
        { currentPassword, newPassword },
        { headers: { 'x-auth-token': token } }
      );

      setStatusMessage('password updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Could not change password', error);
      setStatusMessage('unable to update password right now. please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/login');
  };

  return (
    <Layout>
      <div className="account-content">

        <div className="glass-card glass-card--translucent">
          <div className="card-header">
            <SettingsIcon size={22} strokeWidth={2} color="#315b3d" />
            <span>settings</span>
          </div>

          <div className="account-category-list">

            <CollapseRow open={category === null || category === 'account'}>
              {category === 'account' ? (
                <div className="glass-card account-expanded-card">
                  <div className="card-header account-card-header--flush">
                    {panelIcons.account}
                    <span>{panelTitles.account}</span>
                  </div>

                  <div className="account-panel-body">
                    <div>
                      <label className="account-field-label">email</label>
                      <p className="empty-msg-light account-empty-msg">
                        {email || 'no email on file'}
                      </p>
                    </div>

                    <div>
                      <div className="card-header account-card-header--panel">
                        <Lock size={20} strokeWidth={2} color="#315b3d" />
                        <span>change password</span>
                      </div>

                      <form onSubmit={handleChangePassword}>
                        <label className="account-field-label" htmlFor="currentPassword">current password</label>
                        <input
                          id="currentPassword"
                          type="password"
                          className="account-field-input"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                        />

                        <label className="account-field-label" htmlFor="newPassword">new password</label>
                        <input
                          id="newPassword"
                          type="password"
                          className="account-field-input"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                        />

                        <label className="account-field-label" htmlFor="confirmPassword">confirm new password</label>
                        <input
                          id="confirmPassword"
                          type="password"
                          className="account-field-input"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                        />

                        {statusMessage && (
                          <p className="empty-msg-light account-empty-msg--status">{statusMessage}</p>
                        )}

                        <button
                          type="submit"
                          className={`glass-card save-btn-card ${saving ? 'account-save-btn--saving' : ''}`}
                          disabled={saving}
                        >
                          <span>{saving ? 'saving…' : 'save password'}</span>
                        </button>
                      </form>
                    </div>

                  </div>

                  <button type="button" className="account-toggle-link account-toggle-link--bottom" onClick={closeCategory}>
                    show less
                  </button>
                </div>
              ) : (
                <button type="button" className="account-menu-btn" onClick={() => openCategory('account')}>
                  <span className="account-menu-icon"><User size={20} /></span>
                  <span className="account-menu-label">account settings</span>
                  <ChevronRight size={20} className="account-menu-chevron" />
                </button>
              )}
            </CollapseRow>

            <CollapseRow open={category === null || category === 'caretaker'}>
              {category === 'caretaker' ? (
                <div className="glass-card account-expanded-card">
                  <div className="card-header account-card-header--flush">
                    {panelIcons.caretaker}
                    <span>{panelTitles.caretaker}</span>
                  </div>

                  {isCaregiver ? <CaregiverLinkPanel /> : <CaregiverManagementPanel />}

                  <button type="button" className="account-toggle-link account-toggle-link--bottom" onClick={closeCategory}>
                    show less
                  </button>
                </div>
              ) : (
                <button type="button" className="account-menu-btn" onClick={() => openCategory('caretaker')}>
                  <span className="account-menu-icon"><Users size={20} /></span>
                  <span className="account-menu-label">{panelTitles.caretaker}</span>
                  <ChevronRight size={20} className="account-menu-chevron" />
                </button>
              )}
            </CollapseRow>

            {!isCaregiver && (
              <CollapseRow open={category === null || category === 'baby'}>
                {category === 'baby' ? (
                  <div className="glass-card account-expanded-card">
                    <div className="card-header account-card-header--flush">
                      {panelIcons.baby}
                      <span>{panelTitles.baby}</span>
                    </div>

                    <ChildProfilePicker />

                    <button type="button" className="account-toggle-link account-toggle-link--bottom" onClick={closeCategory}>
                      show less
                    </button>
                  </div>
                ) : (
                  <button type="button" className="account-menu-btn" onClick={() => openCategory('baby')}>
                    <span className="account-menu-icon"><Baby size={20} /></span>
                    <span className="account-menu-label">{childName}'s settings</span>
                    <ChevronRight size={20} className="account-menu-chevron" />
                  </button>
                )}
              </CollapseRow>
            )}

            <CollapseRow open={category === null}>
              <style>{`.koda-sky-card .dm-toggle{position:relative!important;inset:auto!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;margin:0!important;transform:none!important}@keyframes kodaTwinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.15)}}@keyframes kodaCloud{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}`}</style>
              <div
                className="koda-sky-card"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 22,
                  background: isDarkMode ? 'linear-gradient(135deg, #2b3a5c, #4b4f86)' : 'linear-gradient(135deg, #cfeaff, #fff1c9)',
                  color: isDarkMode ? '#f3efff' : '#315b3d',
                  boxShadow: '0 8px 20px rgba(20,45,30,0.15)',
                  transition: 'background 0.5s ease, color 0.5s ease',
                }}
              >
                {(isDarkMode ? [[14, 10], [70, 70], [140, 18], [200, 62], [46, 48]] : []).map(([x, y], i) => (
                  <span key={i} style={{ position: 'absolute', left: x, top: y, width: 4, height: 4, borderRadius: 999, background: '#fffbe0', animation: `kodaTwinkle 1.8s ease-in-out ${i * 0.3}s infinite`, pointerEvents: 'none' }} />
                ))}
                {!isDarkMode && (
                  <span style={{ position: 'absolute', left: 120, top: 8, width: 40, height: 14, borderRadius: 999, background: 'rgba(255,255,255,0.8)', animation: 'kodaCloud 4s ease-in-out infinite', pointerEvents: 'none' }} />
                )}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 800, fontSize: 17 }}>{isDarkMode ? 'good night' : 'good morning'}</span>
                  <span style={{ fontSize: 12, opacity: 0.75 }}>{isDarkMode ? 'night habitat is on' : 'day habitat is on'}</span>
                </div>
                <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
              </div>
            </CollapseRow>

          </div>
        </div>

        {category === null && (
          <button type="button" className="setup-btn-primary account-logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>log out</span>
          </button>
        )}

      </div>
    </Layout>
  );
};

export default AccountSettings;