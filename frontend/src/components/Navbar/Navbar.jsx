import React, { useEffect, useRef, useState, useContext } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaUserCircle } from "react-icons/fa";
import "./Navbar.css";
import { AuthContext } from "../../context/AuthContext";
import useAuth from "../../hooks/useAuth";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // single source of truth for user
  const { user } = useAuth() || {};
  // only grab logout from context
  const { logout } = useContext(AuthContext) || {};

  const dropdownRef = useRef(null);
  const hamburgerRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout?.();
    } finally {
      setUserDropdown(false);
      navigate("/login");
    }
  };

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdown(false);
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!userDropdown) return;
      const target = e.target;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !hamburgerRef.current?.contains(target)
      ) {
        setUserDropdown(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [userDropdown]);

  return (
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

      {/* Links */}
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

        {/* Admin link only for admins */}
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
                <button role="menuitem" onClick={handleLogout}>
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
  );
};

export default Navbar;
