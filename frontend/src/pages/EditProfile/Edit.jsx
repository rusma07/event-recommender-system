import React, { useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./Edit.css";

const Edit = () => {
  const { user, setUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 👇 Call your backend API
      // Example: axios.put('/api/users/profile', formData)
      // Mock success
      setTimeout(() => {
        setUser({ ...user, name: formData.name, email: formData.email });
        alert("Profile updated successfully ✅");
        setLoading(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      alert("Failed to update profile ❌");
      setLoading(false);
    }
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-box">
        <h2>Edit Profile</h2>
        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />

          <label>New Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter new password"
          />

          <button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Edit;
