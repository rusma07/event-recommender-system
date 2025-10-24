import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL;
      await axios.post(`${BACKEND_URL}/users/forgot-password`, { email });
      setSubmitted(true);
      toast.success("Reset link sent to your email!");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send reset link");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Reset Password</h2>
        {submitted ? (
          <p style={{ color: "green" }}>Check your email: {email}</p>
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
