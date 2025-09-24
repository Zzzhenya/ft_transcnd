import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const handleGoToProfile = () => {
    navigate('/profile'); // Falls du später eine separate Profil-Seite haben möchtest
  };

  const handlePlayGame = () => {
    navigate('/game'); // Falls du später eine Spiel-Seite haben möchtest
  };

  return (
    <div className="home-container">
      <h1>Hey {user.username || 'Benutzer'} <br></br> Willkommen bei ft_transcendence, !</h1>
      <div className="dashboard">
        <div className="card">
          <h2>Dein Profil</h2>
          <p>Benutzername: {user.username || 'N/A'}</p>
          <p>E-Mail: {user.email || 'N/A'}</p>
          <div className="profile-actions">
            <button className="btn profile-btn" onClick={handleGoToProfile}>
              Profil anzeigen
            </button>
            <button className="btn settings-btn" onClick={handleGoToSettings}>
              Einstellungen
            </button>
          </div>
        </div>
        <div className="card">
          <h2>Pong spielen</h2>
          <p>Starte ein neues Spiel oder tritt einer laufenden Partie bei.</p>
          <button className="btn" onClick={handlePlayGame}>Spielen</button>
        </div>
      </div>
      <button className="logout-btn" onClick={handleLogout}>Abmelden</button>
    </div>
  );
}

export default Home;