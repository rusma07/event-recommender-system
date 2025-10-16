import React, { useState, useEffect } from 'react';
import './Register.css'; 
import { FiEye, FiEyeOff, FiGlobe } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { toast } from 'react-toastify';
const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.info("Passwords do not match!");
      return;
    }

    try {
      const BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL;
      const response = await axios.post(`${BACKEND_URL}/users/register`, {
        name: formData.username,
        email: formData.email,
        password: formData.password
      });

      toast.success(response.data.message); 
      navigate('/login'); 
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  useEffect(() => {
    document.body.classList.add('register-page');
    return () => document.body.classList.remove('register-page');
  }, []);

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h2>Create Account</h2>
        <p className="signup-subtext">Please fill in your details</p>

        <form onSubmit={handleRegister}>
          <label>Username</label>
          <input 
            type="text"
            name="username"
            placeholder="Enter your username"
            value={formData.username}
            onChange={handleChange}
            required 
          />

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

          <label>Confirm Password</label>
          <div className="password-input">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <span onClick={toggleConfirmPassword}>
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>

          <button type="submit" className="signup-btn">Register</button>

          <p style={{textAlign:'center'}}>Already have an account?</p>

          <Link to="/login" className="signup-alt-btn">
            <FiGlobe /> Log In
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Register;
