import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';  // authService verwenden

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const data = await register(username, email, password);  // authService verwenden
      
      console.log('Registration successful:', data);
      
      // Automatisch anmelden nach Registrierung
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/'); // Zur Hauptseite
      } else {
        navigate('/login'); // Zur Login-Seite
      }
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registrierung fehlgeschlagen. Möglicherweise wird der Benutzername bereits verwendet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Registrieren</h2>
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
          <label>E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
        <div className="form-group">
          <label>Passwort bestätigen</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Wird registriert...' : 'Registrieren'}
        </button>
      </form>
      <div className="login-link">
        Bereits ein Konto? <a href="/login">Anmelden</a>
      </div>
    </div>
  );
}

export default Register;