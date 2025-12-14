import React, { useState, useContext } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock, FiEdit3, FiAlertCircle } from "react-icons/fi";
import { toast } from "react-toastify";

const Edit = () => {
  const { user, setUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const togglePassword = (field) =>
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));

  // Validation rules
  const validateField = (name, value) => {
    // Name validation
    if (name === "name") {
      if (value.trim().length < 2) return "Name must be at least 4 characters";
      return "";
    }

    // Email validation
    if (name === "email") {
      if (!value.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
      return "";
    }

    // Old password validation
    if (name === "oldPassword") {
      if (formData.newPassword && !value) return "Current password is required to change password";
      return "";
    }

    // New password validation
    if (name === "newPassword") {
      if (!value && formData.oldPassword) return "New password is required";
      if (value && value.length < 8) return "Password must be at least 8 characters";
      return "";
    }

    // Confirm password validation
    if (name === "confirmPassword") {
      if (formData.newPassword && !value) return "Please confirm your new password";
      if (value && value !== formData.newPassword) return "Passwords do not match";
      return "";
    }

    return "";
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    // Check if password fields are consistent
    const isChangingPassword = formData.oldPassword || formData.newPassword || formData.confirmPassword;
    if (isChangingPassword) {
      if (!formData.oldPassword) newErrors.oldPassword = "Current password is required to change password";
      if (!formData.newPassword) newErrors.newPassword = "New password is required";
      if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your new password";
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }

    // Validate on change if field has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors({ ...errors, [name]: error });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    
    const error = validateField(name, value);
    setErrors({ ...errors, [name]: error });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    // Validate all fields
    const newErrors = validateForm();
    setErrors(newErrors);

    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    setLoading(true);

    try {
      const BACKEND_URL = import.meta.env.VITE_API_BACKEND_URL;
      const token = localStorage.getItem("token");
      const res = await axios.put(`${BACKEND_URL}/users/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      toast.success("Profile updated successfully");
      
      // Clear password fields after successful update
      setFormData({
        ...formData,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      // Reset touched state for password fields
      setTouched({
        ...touched,
        oldPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, name, type, icon: Icon, placeholder, showToggle = false }) => (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700 flex items-center">
        <Icon className="h-4 w-4 mr-2" />
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={showToggle ? (showPassword[name.replace('Password', '').replace('old', 'old').replace('new', 'new').replace('confirm', 'confirm')] ? "text" : "password") : type}
          value={formData[name]}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full px-3 py-2 ${showToggle ? 'pr-10' : ''} border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
            errors[name] && touched[name]
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
          }`}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => togglePassword(name.replace('Password', '').replace('old', 'old').replace('new', 'new').replace('confirm', 'confirm'))}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword[name.replace('Password', '').replace('old', 'old').replace('new', 'new').replace('confirm', 'confirm')] ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {errors[name] && touched[name] && (
        <div className="flex items-start space-x-1 text-red-600 text-xs mt-1">
          <FiAlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{errors[name]}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FiEdit3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Edit Profile</h2>
              <p className="text-blue-100 text-sm">Update your account information</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" autoComplete="off">
          {/* Name Field */}
          <InputField
            label="Full Name"
            name="name"
            type="text"
            icon={FiUser}
            placeholder="Enter your full name"
          />

          {/* Email Field */}
          <InputField
            label="Email Address"
            name="email"
            type="email"
            icon={FiMail}
            placeholder="Enter your email"
          />

          {/* Password Section */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <FiLock className="h-4 w-4 mr-2" />
              Change Password
            </h3>
            <p className="text-xs text-gray-500">Leave blank to keep current password</p>
            
            {/* Current Password */}
            <div className="space-y-1">
              <label htmlFor="oldPassword" className="text-xs font-medium text-gray-600">
                Current Password
              </label>
              <div className="relative">
                <input
                  id="oldPassword"
                  name="oldPassword"
                  type={showPassword.old ? "text" : "password"}
                  value={formData.oldPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter current password"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.oldPassword && touched.oldPassword
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => togglePassword("old")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword.old ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.oldPassword && touched.oldPassword && (
                <div className="flex items-start space-x-1 text-red-600 text-xs mt-1">
                  <FiAlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{errors.oldPassword}</span>
                </div>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label htmlFor="newPassword" className="text-xs font-medium text-gray-600">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword.new ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter new password"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.newPassword && touched.newPassword
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => togglePassword("new")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword.new ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && touched.newPassword && (
                <div className="flex items-start space-x-1 text-red-600 text-xs mt-1">
                  <FiAlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{errors.newPassword}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-xs font-medium text-gray-600">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword.confirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Confirm new password"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.confirmPassword && touched.confirmPassword
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-blue-500 focus:border-transparent"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => togglePassword("confirm")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword.confirm ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && touched.confirmPassword && (
                <div className="flex items-start space-x-1 text-red-600 text-xs mt-1">
                  <FiAlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <NavLink
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors hover:underline"
            >
              Forgot Password?
            </NavLink>
            
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium text-white transition-all duration-200 flex items-center space-x-2 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <FiEdit3 className="h-4 w-4" />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Edit;