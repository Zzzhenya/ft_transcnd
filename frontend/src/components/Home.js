import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) {
    return <div>Laden...</div>;
  }

  return (
    <div className="home-container">
      <h1>Willkommen bei ft_transcendence, {user.username}!</h1>
      <div className="dashboard">
        <div className="card">
          <h2>Dein Profil</h2>
          <p>Benutzername: {user.username}</p>
          <p>E-Mail: {user.email}</p>
        </div>
        <div className="card">
          <h2>Pong spielen</h2>
          <p>Starte ein neues Spiel oder tritt einer laufenden Partie bei.</p>
          <button className="btn">Spielen</button>
        </div>
        <div className="card">
          <h2>Rangliste</h2>
          <p>Sieh dir die besten Spieler an.</p>
          <button className="btn">Rangliste anzeigen</button>
        </div>
      </div>
      <button className="logout-btn" onClick={handleLogout}>Abmelden</button>
    </div>
  );
}

export default Home;