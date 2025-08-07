import React, { useState } from 'react';
import '../pages/Form.css';
import { FiEye, FiEyeOff, FiGlobe } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="login-container">
      <div className="login-box">
  
        <h2>Welcome!</h2>
        <p className="login-subtext">Please enter your details</p>

        <form>
          <label>Username</label>
          <input type="name" placeholder="Enter your name" />

          <label>Password</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
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

          <button type="submit" className="login-btn">Log In</button>

          <button className="login-alt-btn">
            <FiGlobe /> Log in with Email
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
