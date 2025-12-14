import React, { useEffect, useRef, useState, useContext } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaUserCircle } from "react-icons/fa";
import "./Navbar.css";
import { AuthContext } from "../../context/AuthContext";
import useAuth from "../../hooks/useAuth";
import ConfirmationModal from "../Modal/ConfirmationModal";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuth() || {};
  const { logout } = useContext(AuthContext) || {};

  const dropdownRef = useRef(null);
  const hamburgerRef = useRef(null);

  // Trigger logout confirmation modal
  const requestLogout = () => {
    setUserDropdown(false);
    setShowLogoutConfirm(true);
  };

  // Handle logout after confirmation
  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout?.();
    } finally {
      setLoggingOut(false);
      setShowLogoutConfirm(false);
      navigate("/login");
    }
  };

  // Close menus when route changes
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdown(false);
  }, [location.pathname]);

  // Close dropdown when clicking outside or pressing ESC
  useEffect(() => {
    const handleClick = (e) => {
      if (!userDropdown) return;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !hamburgerRef.current?.contains(e.target)
      ) {
        setUserDropdown(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setUserDropdown(false);
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [userDropdown]);

  return (
    <>
      {/* Navbar */}
      <nav className="navbar" aria-label="Main">
        <div className="logo" role="banner">
          Tech <br />
          <span>Events</span>
        </div>

        {/* Hamburger for mobile */}
        <button
          ref={hamburgerRef}
          className="hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <FaBars size={24} />
        </button>

        {/* Navigation links */}
        <ul
          id="primary-navigation"
          className={menuOpen ? "nav-links open" : "nav-links"}
          role="menubar"
        >
          <li role="none">
            <NavLink
              to="/"
              role="menuitem"
              className={({ isActive }) => (isActive ? "active" : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              Home
            </NavLink>
          </li>

          <li role="none">
            <NavLink
              to="/event"
              role="menuitem"
              className={({ isActive }) => (isActive ? "active" : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              Events
            </NavLink>
          </li>

          <li role="none">
            <NavLink
              to="/aboutus"
              role="menuitem"
              className={({ isActive }) => (isActive ? "active" : undefined)}
              onClick={() => setMenuOpen(false)}
            >
              About us
            </NavLink>
          </li>

          {/* Admin link only for admin users */}
          {user?.role === "admin" && (
            <li role="none">
              <NavLink
                to="/admin/events"
                role="menuitem"
                className={({ isActive }) => (isActive ? "active" : undefined)}
                onClick={() => setMenuOpen(false)}
              >
                Admin
              </NavLink>
            </li>
          )}

          {/* User section */}
          {user ? (
            <li className="navbar-user" role="none">
              <button
                className="user-icon-btn"
                onClick={() => setUserDropdown((s) => !s)}
                aria-haspopup="menu"
                aria-expanded={userDropdown}
                aria-controls="user-menu"
                title="Account"
              >
                <FaUserCircle size={26} className="user-icon" />
              </button>

              {userDropdown && (
                <div
                  id="user-menu"
                  className="user-dropdown"
                  role="menu"
                  ref={dropdownRef}
                >
                  <p role="presentation">
                    <strong>{user.name}</strong>
                  </p>
                  <button role="menuitem" onClick={() => navigate("/profile")}>
                    Edit Profile
                  </button>
                  <button role="menuitem" onClick={requestLogout}>
                    Logout
                  </button>
                </div>
              )}
            </li>
          ) : (
            <li role="none">
              <NavLink
                to="/login"
                role="menuitem"
                className={({ isActive }) => (isActive ? "active" : undefined)}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* Centered Confirmation Modal */}
      <ConfirmationModal
        open={showLogoutConfirm}
        title="Log out?"
        message="Are you sure you want to sign out of your account?"
        confirmText="Log out"
        cancelText="Cancel"
        danger
        loading={loggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
};

export default Navbar;
