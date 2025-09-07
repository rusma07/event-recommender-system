import React, { useState } from 'react';


const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate email submission
    console.log("Reset link sent to:", email);
    setSubmitted(true);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Reset Password</h2>
        <p className="login-subtext">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {submitted ? (
          <p style={{ color: 'green', marginTop: '1rem' }}>
             A reset link has been sent to <strong>{email}</strong>.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button type="submit" className="login-btn">Send Reset Link</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;