// components/profile/Profile.js
import React, { useState, useEffect } from 'react';
import UserService from '../../services/userService';
import EditProfile from './EditProfile';
import UserStats from './UserStats';
import MatchHistory from './MatchHistory';
import '../../styles/components/Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [profileData, statsData] = await Promise.all([
        UserService.getProfile(),
        UserService.getUserStats()
      ]);
      
      setUser(profileData);
      setStats(statsData);
      setError('');
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    try {
      const response = await UserService.uploadAvatar(file);
      setUser(prev => ({ ...prev, avatar: response.avatar }));
      setError('');
    } catch (err) {
      setError('Failed to upload avatar');
      console.error('Error uploading avatar:', err);
    }
  };

  const handleProfileUpdate = async (updatedData) => {
    try {
      const updatedUser = await UserService.updateProfile(updatedData);
      setUser(updatedUser);
      setShowEditModal(false);
      setError('');
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-container">
        <div className="error-message">{error}</div>
        <button onClick={loadUserData} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar-section">
          <div className="avatar-container">
            <img 
              src={user?.avatar || '/default-avatar.png'} 
              alt="Profile Avatar"
              className="profile-avatar"
            />
            <label htmlFor="avatar-upload" className="avatar-upload-button">
              <i className="fas fa-camera"></i>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
        
        <div className="profile-info">
          <h1 className="profile-username">{user?.username}</h1>
          <p className="profile-email">{user?.email}</p>
          <p className="profile-member-since">
            Member since {new Date(user?.created_at).toLocaleDateString()}
          </p>
          <button 
            onClick={() => setShowEditModal(true)}
            className="edit-profile-button"
          >
            <i className="fas fa-edit"></i> Edit Profile
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="profile-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Match History
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="quick-stats">
              <div className="stat-card">
                <h3>Games Played</h3>
                <span className="stat-value">{stats?.gamesPlayed || 0}</span>
              </div>
              <div className="stat-card">
                <h3>Win Rate</h3>
                <span className="stat-value">{stats?.winRate || 0}%</span>
              </div>
              <div className="stat-card">
                <h3>Current Streak</h3>
                <span className="stat-value">{stats?.currentStreak || 0}</span>
              </div>
              <div className="stat-card">
                <h3>Best Streak</h3>
                <span className="stat-value">{stats?.bestStreak || 0}</span>
              </div>
            </div>
            
            <div className="recent-activity">
              <h3>Recent Activity</h3>
              <p>No recent games played.</p>
            </div>
          </div>
        )}

        {activeTab === 'stats' && <UserStats stats={stats} />}

        {activeTab === 'history' && <MatchHistory />}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <div className="settings-section">
              <h3>Account Settings</h3>
              <button 
                onClick={() => setShowEditModal(true)}
                className="settings-button"
              >
                Edit Profile Information
              </button>
              <button className="settings-button">
                Change Password
              </button>
              <button className="settings-button">
                Two-Factor Authentication
              </button>
            </div>
            
            <div className="settings-section danger-zone">
              <h3>Danger Zone</h3>
              <button className="delete-account-button">
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditProfile
          user={user}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Profile;