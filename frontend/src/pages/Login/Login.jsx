import React, { useState, useEffect, useContext } from 'react';
import './Login.css';
import { FiEye, FiEyeOff, FiGlobe } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Use context inside component
  const { user, setUser } = useContext(AuthContext);

  useEffect(() => {
    document.body.classList.add('login-page');
    return () => document.body.classList.remove('login-page');
  }, []);

  const togglePassword = () => setShowPassword(!showPassword);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/users/login', {
        email: formData.email,
        password: formData.password
      });

      // Save JWT token and user info in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // ✅ Update context so Navbar shows username immediately
      setUser(response.data.user);

      alert(`Welcome, ${response.data.user.name}`);
      navigate('/dashboard'); // redirect after login
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Welcome!</h2>
        <p className="login-subtext">Please enter your details</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span onClick={togglePassword}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" /> Remember me.
            </label>
            <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p style={{ textAlign: 'center' }}>Don't have an account?</p>
          <Link to="/signup" className="login-alt-btn">
            <FiGlobe /> Sign Up
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Login;
