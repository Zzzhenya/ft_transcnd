// frontend/src/components/common/Header.js - Updated with Admin Link
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/components/Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Check if user is admin
  const isAdmin = user && (user.username === 'admin' || user.role === 'admin');

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo">
            <h1>ft_transcendence</h1>
          </Link>
        </div>

        <nav className="header-nav">
          {user ? (
            <>
              <Link to="/game" className="nav-link">
                Game
              </Link>
              <Link to="/leaderboard" className="nav-link">
                Leaderboard
              </Link>
              <Link to="/chat" className="nav-link">
                Chat
              </Link>
              <Link to="/profile" className="nav-link">
                Profile
              </Link>
              
              {/* Admin Link - only show for admin users */}
              {isAdmin && (
                <Link to="/admin" className="nav-link admin-link">
                  Admin
                </Link>
              )}
              
              <div className="user-info">
                <img 
                  src={user.avatar || '/default-avatar.png'} 
                  alt="Avatar" 
                  className="user-avatar"
                />
                <span className="username">{user.username}</span>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="nav-link">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;