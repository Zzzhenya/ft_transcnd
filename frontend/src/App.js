import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Home from './components/Home';
import Settings from './components/Settings';
import './App.css';

/**
 * Diese Funktion prüft, ob ein Benutzer authentifiziert ist.
 * 
 * @param {React.Component} children - Die zu schützende Komponente
 * @returns {React.Component} Die geschützte Route oder Weiterleitung zum Login
 */
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

/**
 * Die Haupt-App-Komponente mit allen Routen.
 * 
 * @returns {React.Component} Die App-Komponente
 */
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;