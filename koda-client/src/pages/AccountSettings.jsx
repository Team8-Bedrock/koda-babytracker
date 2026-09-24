// Account settings page
// what needs to be done:
// 1. needs to be functional (have the email that was registered show up and actually save on the backend, reset password, etc.)
// 2. ui/ux clean up 
// 3. habitat isnt showing on the page for some reason
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { User, Users, Baby, Lock, LogOut, Settings as SettingsIcon } from 'lucide-react';
import '../styling/global/App.css';
import '../styling/pages/accountSettings.css';
import { API_URL } from '../config';
import Layout from '../components/Layout';
import { getSelectedChildForUser } from '../utils/authStorage';
import CaregiverLinkPanel from '../components/settings/CaregiverLinkPanel';
import CaregiverManagementPanel from '../components/settings/CaregiverManagementPanel';
import ChildProfilePicker from '../components/settings/ChildProfilePicker';

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
  const email = localStorage.getItem('email') || '';
  const [selectedChild, setSelectedChild] = useState(null);
  const [role, setRole] = useState(null);

  const [category, setCategory] = useState(null);

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
        setAccessChecked(true);
      })
      .catch(() => setAccessChecked(true));
  }, [navigate]);

  if (!accessChecked) return null;

  const isCaregiver = role === 'caregiver';
  const childName = selectedChild?.name || 'Gracie';

  const panelTitles = {
    account: 'account settings',
    caretaker: isCaregiver ? 'link to a parent' : 'caretaker settings',
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

                    <button type="button" className="glass-card save-btn-card" onClick={handleLogout}>
                      <LogOut size={20} />
                      <span>log out</span>
                    </button>
                  </div>

                  <button type="button" className="account-toggle-link account-toggle-link--bottom" onClick={closeCategory}>
                    show less
                  </button>
                </div>
              ) : (
                <button type="button" className="glass-card save-btn-card" onClick={() => openCategory('account')}>
                  <User size={20} />
                  <span>account settings</span>
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
                <button type="button" className="glass-card save-btn-card" onClick={() => openCategory('caretaker')}>
                  <Users size={20} />
                  <span>{panelTitles.caretaker}</span>
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
                  <button type="button" className="glass-card save-btn-card" onClick={() => openCategory('baby')}>
                    <Baby size={20} />
                    <span>{childName}'s settings</span>
                  </button>
                )}
              </CollapseRow>
            )}

          </div>
        </div>

      </div>
    </Layout>
  );
};

export default AccountSettings;
