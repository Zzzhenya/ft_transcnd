import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserService from '../services/userService';
import '../styles/components/Settings.css';

function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user') || '{}');
  });
  
  const [settings, setSettings] = useState({
    notifications: true,
    soundEffects: true,
    theme: 'light',
    language: 'de',
    privacy: 'friends'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    bio: user.bio || ''
  });

  const [deleteData, setDeleteData] = useState({
    password: '',
    confirmText: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load user profile on component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await UserService.getProfile();
      setUser(profile);
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        bio: profile.bio || ''
      });
      
      // Update localStorage with fresh data
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      console.error('Error loading profile:', error);
      // If there's an auth error, the interceptor will handle redirection
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleProfileEdit = () => {
    setIsEditing(true);
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await UserService.updateProfile(formData);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setIsEditing(false);
      alert('Profil erfolgreich aktualisiert!');
    } catch (error) {
      console.error('Error updating profile:', error);
      const message = error.response?.data?.message || 'Fehler beim Aktualisieren des Profils';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileCancel = () => {
    setFormData({
      username: user.username || '',
      email: user.email || '',
      bio: user.bio || ''
    });
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDeleteInputChange = (e) => {
    setDeleteData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePasswordInputChange = (e) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDeleteAccount = async () => {
    if (!deleteData.password) {
      alert('Bitte gib dein Passwort ein.');
      return;
    }

    if (deleteData.confirmText !== 'LÖSCHEN') {
      alert('Bitte bestätige die Löschung durch Eingabe von "LÖSCHEN".');
      return;
    }

    const finalConfirm = window.confirm(
      'LETZTE WARNUNG: Diese Aktion kann NICHT rückgängig gemacht werden. ' +
      'Dein gesamtes Konto und alle Daten werden permanent gelöscht. Fortfahren?'
    );

    if (!finalConfirm) return;

    setIsDeleting(true);
    try {
      await UserService.deleteAccount(deleteData.password);
      
      // Clear all local data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      alert('Dein Konto wurde erfolgreich gelöscht.');
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      const message = error.response?.data?.message || 'Fehler beim Löschen des Kontos';
      alert(message);
    } finally {
      setIsDeleting(false);
      setDeleteData({ password: '', confirmText: '' });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Bitte fülle alle Felder aus.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Das neue Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setIsLoading(true);
    try {
      await UserService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      alert('Passwort erfolgreich geändert!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      const message = error.response?.data?.message || 'Fehler beim Ändern des Passworts';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={handleBack} disabled={isLoading}>
          ← Zurück
        </button>
        <h1>Einstellungen</h1>
      </div>

      <div className="settings-content">
        {/* Profil-Sektion */}
        <div className="settings-section">
          <h2>Profil</h2>
          <div className="profile-card">
            {!isEditing ? (
              <div>
                <div className="profile-info">
                  <p><strong>Benutzername:</strong> {user.username || 'N/A'}</p>
                  <p><strong>E-Mail:</strong> {user.email || 'N/A'}</p>
                  <p><strong>Bio:</strong> {user.bio || 'Keine Bio verfügbar'}</p>
                </div>
                <button 
                  className="btn edit-btn" 
                  onClick={handleProfileEdit}
                  disabled={isLoading}
                >
                  {isLoading ? 'Laden...' : 'Profil bearbeiten'}
                </button>
              </div>
            ) : (
              <div className="profile-edit-form">
                <div className="form-group">
                  <label>Benutzername:</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Benutzername"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label>E-Mail:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="E-Mail"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Bio:</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Erzähle etwas über dich..."
                    rows="3"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-actions">
                  <button 
                    className="btn save-btn" 
                    onClick={handleProfileSave}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Speichere...' : 'Speichern'}
                  </button>
                  <button 
                    className="btn cancel-btn" 
                    onClick={handleProfileCancel}
                    disabled={isLoading}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Passwort ändern */}
        <div className="settings-section">
          <h2>Sicherheit</h2>
          <div className="settings-card">
            {!isChangingPassword ? (
              <button 
                className="btn edit-btn" 
                onClick={() => setIsChangingPassword(true)}
                disabled={isLoading}
              >
                Passwort ändern
              </button>
            ) : (
              <div className="password-change-form">
                <div className="form-group">
                  <label>Aktuelles Passwort:</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Aktuelles Passwort"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Neues Passwort:</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Neues Passwort (min. 6 Zeichen)"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label>Neues Passwort bestätigen:</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    placeholder="Neues Passwort bestätigen"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-actions">
                  <button 
                    className="btn save-btn" 
                    onClick={handleChangePassword}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Ändere...' : 'Passwort ändern'}
                  </button>
                  <button 
                    className="btn cancel-btn" 
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={isLoading}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spiel-Einstellungen */}
        <div className="settings-section">
          <h2>Spiel-Einstellungen</h2>
          <div className="settings-card">
            <div className="setting-item">
              <label>Soundeffekte</label>
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={(e) => handleSettingChange('soundEffects', e.target.checked)}
              />
            </div>
            <div className="setting-item">
              <label>Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
              >
                <option value="light">Hell</option>
                <option value="dark">Dunkel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Benachrichtigungen */}
        <div className="settings-section">
          <h2>Benachrichtigungen</h2>
          <div className="settings-card">
            <div className="setting-item">
              <label>Benachrichtigungen aktivieren</label>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Privatsphäre */}
        <div className="settings-section">
          <h2>Privatsphäre</h2>
          <div className="settings-card">
            <div className="setting-item">
              <label>Profil sichtbar für</label>
              <select
                value={settings.privacy}
                onChange={(e) => handleSettingChange('privacy', e.target.value)}
              >
                <option value="everyone">Alle</option>
                <option value="friends">Nur Freunde</option>
                <option value="private">Privat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sprache */}
        <div className="settings-section">
          <h2>Sprache</h2>
          <div className="settings-card">
            <div className="setting-item">
              <label>Sprache</label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>

        {/* Konto löschen - Gefährlicher Bereich */}
        <div className="settings-section danger-section">
          <h2>Konto löschen</h2>
          <div className="settings-card">
            <div className="danger-warning">
              <p><strong>⚠️ WARNUNG:</strong> Diese Aktion kann nicht rückgängig gemacht werden!</p>
              <p>Alle deine Daten, Spielstatistiken und dein Profil werden permanent gelöscht.</p>
            </div>
            
            <div className="delete-form">
              <div className="form-group">
                <label>Passwort eingeben:</label>
                <input
                  type="password"
                  name="password"
                  value={deleteData.password}
                  onChange={handleDeleteInputChange}
                  placeholder="Dein Passwort"
                  disabled={isDeleting}
                />
              </div>
              
              <div className="form-group">
                <label>Tippe "LÖSCHEN" um zu bestätigen:</label>
                <input
                  type="text"
                  name="confirmText"
                  value={deleteData.confirmText}
                  onChange={handleDeleteInputChange}
                  placeholder="LÖSCHEN"
                  disabled={isDeleting}
                />
              </div>
            </div>

            <button 
              className="btn danger-btn" 
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deleteData.password || deleteData.confirmText !== 'LÖSCHEN'}
            >
              {isDeleting ? 'Lösche Konto...' : 'Konto permanent löschen'}
            </button>
          </div>
        </div>
      </div>
    </div>
    );
}

export default Settings;