// frontend/src/routes.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';

// Import components
import Home from './components/Home';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Profile from './components/profile/Profile';
import ProfileSettings from './components/profile/ProfileSettings'; // WICHTIG: ProfileSettings importieren
import GameLobby from './components/game/GameLobby';
import PongGame from './components/game/PongGame';
import Leaderboard from './components/game/Leaderboard';
import ChatRoom from './components/chat/ChatRoom';
import AdminDashboard from './components/admin/AdminDashboard';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      
      {/* WICHTIGE NEUE ROUTE FÜR SETTINGS: */}
      <Route
        path="/profile/settings"
        element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <GameLobby />
          </ProtectedRoute>
        }
      />

      <Route
        path="/game/play"
        element={
          <ProtectedRoute>
            <PongGame />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatRoom />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch all route - 404 */}
      <Route 
        path="*" 
        element={
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            minHeight: '50vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <h1>404 - Seite nicht gefunden</h1>
            <p>Die angeforderte Seite existiert nicht.</p>
            <a href="/" style={{ 
              color: '#667eea', 
              textDecoration: 'none',
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              border: '2px solid #667eea',
              borderRadius: '5px'
            }}>
              Zurück zur Startseite
            </a>
          </div>
        } 
      />
    </Routes>
  );
};

export default AppRoutes;