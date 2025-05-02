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

  return (
    <div className="home-container">
      <h1>Hey {user.username || 'Benutzer'} <br></br> Willkommen bei ft_transcendence, !</h1>
      <div className="dashboard">
        <div className="card">
          <h2>Dein Profil</h2>
          <p>Benutzername: {user.username || 'N/A'}</p>
          <p>E-Mail: {user.email || 'N/A'}</p>
        </div>
        <div className="card">
          <h2>Pong spielen</h2>
          <p>Starte ein neues Spiel oder tritt einer laufenden Partie bei.</p>
          <button className="btn">Spielen</button>
        </div>
      </div>
      <button className="logout-btn" onClick={handleLogout}>Abmelden</button>
    </div>
  );
}

export default Home;