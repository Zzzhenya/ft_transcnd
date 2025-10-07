import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// FIXED: Use relative URL instead of localhost
const API_URL = '/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login fehlgeschlagen');
      }

      // Token und User Daten speichern
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('Login successful:', data);
      
      // Zur Hauptseite weiterleiten
      navigate('/');
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login fehlgeschlagen. Bitte überprüfe deine Anmeldedaten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Anmelden</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Benutzername</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Wird angemeldet...' : 'Anmelden'}
        </button>
      </form>
      <div className="register-link">
        Noch kein Konto? <a href="/register">Registrieren</a>
      </div>
    </div>
  );
}

export default Login;