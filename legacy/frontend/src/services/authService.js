// Fixed authService.js - uses relative URLs through nginx proxy
const API_URL = '/api';  // CHANGED: von localhost:5000 zu relativ

export const register = async (username, email, password) => {
  try {
    console.log('Making register request to:', `${API_URL}/auth/register`);
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registrierung fehlgeschlagen');
    }
    
    console.log('Register successful:', data);
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const login = async (username, password) => {  // CHANGED: username statt email
  try {
    console.log('Making login request to:', `${API_URL}/auth/login`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password })  // CHANGED: username statt email
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login fehlgeschlagen');
    }
    
    console.log('Login successful:', data);
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('User logged out');
};

export const getCurrentUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  const token = getToken();
  const user = getCurrentUser();
  return !!(token && user);
};