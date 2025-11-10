import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});

    // Validation
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      toast.error("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: "Please enter a valid email address" });
      toast.error("Please enter a valid email address");
      return;
    }

    if (email.length > 254) {
      setErrors({ email: "Email is too long" });
      toast.error("Email address is too long");
      return;
    }

    setLoading(true);
    try {
      const BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL;
      await axios.post(`${BACKEND_URL}/users/forgot-password`, { email });
      setSubmitted(true);
      toast.success("Reset link sent to your email!");
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || "Failed to send reset link";
      toast.error(errorMessage);
      
      // Handle specific backend errors
      if (err.response?.status === 404) {
        setErrors({ email: "No account found with this email address" });
      } else if (err.response?.status === 400) {
        setErrors({ email: "Invalid email address" });
      } else if (err.response?.status === 429) {
        setErrors({ email: "Too many attempts. Please try again later." });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors({ ...errors, email: "" });
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Reset Password</h2>
        {submitted ? (
          <div className="success-message">
            <p style={{ color: "green", fontWeight: "bold" }}>Check your email</p>
            <p style={{ color: "green", marginTop: "10px" }}>
              We've sent a password reset link to: <strong>{email}</strong>
            </p>
            <p style={{ color: "gray", fontSize: "14px", marginTop: "10px" }}>
              Didn't receive the email? Check your spam folder or{" "}
              <button 
                onClick={() => setSubmitted(false)}
                style={{ color: "blue", background: "none", border: "none", cursor: "pointer" }}
              >
                try again
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={handleEmailChange}
              className={errors.email ? "error-input" : ""}
              required
            />
            {errors.email && (
              <p style={{ color: "red", fontSize: "14px", marginTop: "5px" }}>
                {errors.email}
              </p>
            )}
            <button 
              type="submit" 
              className="login-btn" 
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;