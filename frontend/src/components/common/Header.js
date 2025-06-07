// components/common/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/components/Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Don't show header on login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <Link to="/" className="logo">
          <div className="logo-icon">🏓</div>
          <span className="logo-text">ft_transcendence</span>
        </Link>

        {/* Navigation - Desktop */}
        <nav className="nav-desktop">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <i className="fas fa-home"></i>
            <span>Home</span>
          </Link>
          <Link 
            to="/game" 
            className={`nav-link ${isActive('/game') ? 'active' : ''}`}
          >
            <i className="fas fa-gamepad"></i>
            <span>Play</span>
          </Link>
          <Link 
            to="/leaderboard" 
            className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
          >
            <i className="fas fa-trophy"></i>
            <span>Leaderboard</span>
          </Link>
          <Link 
            to="/chat" 
            className={`nav-link ${isActive('/chat') ? 'active' : ''}`}
          >
            <i className="fas fa-comments"></i>
            <span>Chat</span>
          </Link>
        </nav>

        {/* User Menu */}
        {user && (
          <div className="user-section" ref={userMenuRef}>
            <button 
              className="user-menu-trigger"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <img 
                src={user.avatar || '/default-avatar.png'} 
                alt="Profile"
                className="user-avatar"
              />
              <span className="username">{user.username}</span>
              <i className={`fas fa-chevron-${showUserMenu ? 'up' : 'down'}`}></i>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <img 
                    src={user.avatar || '/default-avatar.png'} 
                    alt="Profile"
                    className="dropdown-avatar"
                  />
                  <div className="user-details">
                    <div className="dropdown-username">{user.username}</div>
                    <div className="dropdown-email">{user.email}</div>
                  </div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <Link 
                  to="/profile" 
                  className="dropdown-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  <i className="fas fa-user"></i>
                  <span>My Profile</span>
                </Link>
                
                <Link 
                  to="/settings" 
                  className="dropdown-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  <i className="fas fa-cog"></i>
                  <span>Settings</span>
                </Link>
                
                <div className="dropdown-divider"></div>
                
                <button 
                  className="dropdown-item logout-btn"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          <i className={`fas fa-${showMobileMenu ? 'times' : 'bars'}`}></i>
        </button>
      </div>

      {/* Mobile Navigation */}
      {showMobileMenu && (
        <nav className="nav-mobile">
          <Link 
            to="/" 
            className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}
          >
            <i className="fas fa-home"></i>
            <span>Home</span>
          </Link>
          <Link 
            to="/game" 
            className={`mobile-nav-link ${isActive('/game') ? 'active' : ''}`}
          >
            <i className="fas fa-gamepad"></i>
            <span>Play</span>
          </Link>
          <Link 
            to="/leaderboard" 
            className={`mobile-nav-link ${isActive('/leaderboard') ? 'active' : ''}`}
          >
            <i className="fas fa-trophy"></i>
            <span>Leaderboard</span>
          </Link>
          <Link 
            to="/chat" 
            className={`mobile-nav-link ${isActive('/chat') ? 'active' : ''}`}
          >
            <i className="fas fa-comments"></i>
            <span>Chat</span>
          </Link>
          <Link 
            to="/profile" 
            className={`mobile-nav-link ${isActive('/profile') ? 'active' : ''}`}
          >
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </Link>
          <button 
            className="mobile-nav-link logout-mobile"
            onClick={handleLogout}
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </nav>
      )}
    </header>
  );
};

export default Header;