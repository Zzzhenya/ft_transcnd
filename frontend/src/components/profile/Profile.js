// frontend/src/components/profile/Profile.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/userService';
import UserStats from './UserStats';
import MatchHistory from './MatchHistory';
import EditProfile from './EditProfile';
import '../../styles/components/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [matchHistory, setMatchHistory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const [statsData, historyData] = await Promise.all([
        userService.getUserStats(),
        userService.getMatchHistory(1, 10)
      ]);
      
      setUserStats(statsData);
      setMatchHistory(historyData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Fehler beim Laden der Profildaten');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleProfileUpdate = (updatedUser) => {
    updateUser(updatedUser);
  };

  const handleSettingsClick = () => {
    navigate('/profile/settings');
  };

  if (isLoading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Profil wird geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error">
        <p>{error}</p>
        <button onClick={fetchUserData} className="retry-button">
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <img 
              src={user?.avatar || '/default-avatar.png'} 
              alt={`${user?.username}'s Avatar`}
              onError={(e) => {
                e.target.src = '/default-avatar.png';
              }}
            />
          </div>
          <div className="profile-info">
            <h1>{user?.username}</h1>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-joined">
              Mitglied seit: {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
            </p>
          </div>
          <div className="profile-actions">
            <button 
              onClick={handleSettingsClick}
              className="settings-button"
              title="Profil Einstellungen"
            >
              <i className="settings-icon">⚙️</i>
              Settings
            </button>
          </div>
        </div>

        {/* Quick Stats Overview */}
        {userStats && (
          <div className="profile-quick-stats">
            <div className="quick-stat">
              <span className="stat-value">{userStats.gamesPlayed}</span>
              <span className="stat-label">Spiele</span>
            </div>
            <div className="quick-stat">
              <span className="stat-value">{userStats.gamesWon}</span>
              <span className="stat-label">Siege</span>
            </div>
            <div className="quick-stat">
              <span className="stat-value">{userStats.winRate}%</span>
              <span className="stat-label">Siegesquote</span>
            </div>
            <div className="quick-stat">
              <span className="stat-value">{userStats.currentStreak}</span>
              <span className="stat-label">Aktuelle Serie</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="profile-tabs">
          <button 
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            Profil bearbeiten
          </button>
          <button 
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleTabChange('stats')}
          >
            Statistiken
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            Spielverlauf
          </button>
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {activeTab === 'profile' && (
            <EditProfile 
              user={user}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
          
          {activeTab === 'stats' && userStats && (
            <UserStats stats={userStats} />
          )}
          
          {activeTab === 'history' && matchHistory && (
            <MatchHistory 
              matches={matchHistory.matches}
              totalCount={matchHistory.totalCount}
              currentPage={matchHistory.currentPage}
              totalPages={matchHistory.totalPages}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;