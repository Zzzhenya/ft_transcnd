// frontend/src/components/profile/ProfileSettings.js
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import '../../styles/components/ProfileSettings.css';

const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Account deletion state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    password: '',
    confirmText: '',
    showConfirm: false
  });

  // Handle password change form
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password update submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('Neue Passwörter stimmen nicht überein');
        setIsLoading(false);
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('Neues Passwort muss mindestens 6 Zeichen lang sein');
        setIsLoading(false);
        return;
      }

      // Call API to change password
      await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setMessage('Passwort erfolgreich geändert');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Ändern des Passworts');
    }

    setIsLoading(false);
  };

  // Handle account deletion confirmation
  const handleDeleteConfirmation = (e) => {
    const { name, value } = e.target;
    setDeleteConfirmation(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle account deletion submission
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // Validate confirmation text
      if (deleteConfirmation.confirmText !== 'DELETE') {
        setError('Bitte gib "DELETE" ein, um die Löschung zu bestätigen');
        setIsLoading(false);
        return;
      }

      if (!deleteConfirmation.password) {
        setError('Passwort ist erforderlich');
        setIsLoading(false);
        return;
      }

      // Call API to delete account
      await userService.deleteAccount({
        password: deleteConfirmation.password
      });

      // Logout user after successful deletion
      logout();
      
      // Redirect will happen automatically through AuthContext
    } catch (error) {
      setError(error.response?.data?.message || 'Fehler beim Löschen des Accounts');
    }

    setIsLoading(false);
  };

  const showDeleteConfirmation = () => {
    setDeleteConfirmation(prev => ({
      ...prev,
      showConfirm: true
    }));
  };

  const hideDeleteConfirmation = () => {
    setDeleteConfirmation({
      password: '',
      confirmText: '',
      showConfirm: false
    });
  };

  return (
    <div className="profile-settings">
      <div className="settings-container">
        <h2>Profil Einstellungen</h2>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        {/* Password Change Section */}
        <div className="settings-section">
          <h3>Passwort ändern</h3>
          <form onSubmit={handlePasswordSubmit} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Aktuelles Passwort:</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Neues Passwort:</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                minLength="6"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Neues Passwort bestätigen:</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                minLength="6"
                required
                disabled={isLoading}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Wird geändert...' : 'Passwort ändern'}
            </button>
          </form>
        </div>

        {/* Account Deletion Section */}
        <div className="settings-section danger-section">
          <h3>Account löschen</h3>
          <p className="warning-text">
            <strong>Achtung:</strong> Das Löschen deines Accounts ist permanent und kann nicht rückgängig gemacht werden.
            Alle deine Daten, einschließlich Spielstatistiken und Nachrichten, werden unwiderruflich gelöscht.
          </p>

          {!deleteConfirmation.showConfirm ? (
            <button 
              onClick={showDeleteConfirmation}
              className="btn btn-danger"
              disabled={isLoading}
            >
              Account löschen
            </button>
          ) : (
            <div className="delete-confirmation">
              <form onSubmit={handleDeleteAccount} className="delete-form">
                <div className="form-group">
                  <label htmlFor="deletePassword">Passwort eingeben:</label>
                  <input
                    type="password"
                    id="deletePassword"
                    name="password"
                    value={deleteConfirmation.password}
                    onChange={handleDeleteConfirmation}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmText">
                    Gib "DELETE" ein, um die Löschung zu bestätigen:
                  </label>
                  <input
                    type="text"
                    id="confirmText"
                    name="confirmText"
                    value={deleteConfirmation.confirmText}
                    onChange={handleDeleteConfirmation}
                    placeholder="DELETE"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="form-actions">
                  <button 
                    type="button"
                    onClick={hideDeleteConfirmation}
                    className="btn btn-secondary"
                    disabled={isLoading}
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="submit"
                    className="btn btn-danger"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Wird gelöscht...' : 'Account endgültig löschen'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* User Info Display */}
        <div className="settings-section">
          <h3>Account Informationen</h3>
          <div className="user-info">
            <p><strong>Benutzername:</strong> {user?.username}</p>
            <p><strong>E-Mail:</strong> {user?.email}</p>
            <p><strong>Erstellt am:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;