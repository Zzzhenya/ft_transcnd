import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Home from './components/Home';
import './App.css';

/**
 * Diese Funktion berechnet die Summe von zwei Zahlen.
 * 
 * @param {number} a - Die erste Zahl
 * @param {number} b - Die zweite Zahl
 * @returns {number} Die Summe der beiden Zahlen
 */
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

/**
 * Diese Funktion berechnet die Summe von drei Zahlen.
 * 
 * @param {number} a - Die erste Zahl
 * @param {number} b - Die zweite Zahl
 * @returns {number} Die Summe der beiden Zahlen
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;