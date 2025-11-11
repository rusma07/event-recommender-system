import React, { useState, useEffect, useContext } from "react";
import "./Login.css";
import { FiEye, FiEyeOff, FiGlobe } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  const togglePassword = () => setShowPassword(!showPassword);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    // Remove error while typing
    setErrors({ ...errors, [e.target.name]: "" });
  };

  // ✅ Inline validation
  const validateForm = () => {
    let newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL;

      const { data } = await axios.post(`${BACKEND_URL}/users/login`, {
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Welcome, ${data.user.name}!`);

      // 🔹 Optional: check onboarding status right away
      let isNewUser = false;
      try {
        const res = await fetch(
          `${BACKEND_URL}/interactions/${data.user.id}/onboarding-status`,
          { credentials: "include" } // remove if you don't use cookies
        );
        const json = await res.json();
        isNewUser = !!json?.isNewUser;
      } catch {
        // If this fails, ProtectedRoute will still handle it later
      }

      // ✅ Navigate based on status (or let ProtectedRoute handle it)
      navigate(isNewUser ? "/onboarding" : "/event", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
          />
          {errors.email && <p className="error-text">{errors.email}</p>}

          <label>Password</label>
          <div className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
            <span onClick={togglePassword}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </span>
          </div>
          {errors.password && <p className="error-text">{errors.password}</p>}

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                name="rememberMe"
                onChange={(e) =>
                  setFormData({ ...formData, rememberMe: e.target.checked })
                }
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>

          <p style={{ textAlign: "center" }}>Don't have an account?</p>
          <Link to="/signup" className="login-alt-btn">
            <FiGlobe /> Sign Up
          </Link>
        </form>
      </div>
    </div>
  );
};

export default Login;
