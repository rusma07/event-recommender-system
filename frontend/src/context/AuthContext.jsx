import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // optional: for auth check

  // Login function
  const login = async (email, password) => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/users/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user)); // save full user object
      setUser(res.data.user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  // Register function
  const register = async (formData) => {
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/users/register', formData);
      localStorage.setItem('token', res.data.token || ''); // optional if backend returns token
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true };
    } catch (error) {
      console.error('Register error:', error.response?.data?.message || error.message);
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Auto-restore user from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
