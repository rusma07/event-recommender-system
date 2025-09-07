import React, { useState, useEffect, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaBars, FaUserCircle } from 'react-icons/fa';
import './Navbar.css';
import { AuthContext } from '../../context/AuthContext';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [userDropdown, setUserDropdown] = useState(false); // toggle dropdown
  const navigate = useNavigate();

  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    setUserDropdown(false);
    navigate('/login');
  };

  // Scroll-based active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'dashboard', 'aboutus'];
      let current = '';
      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element && element.getBoundingClientRect().top <= 80) {
          current = section;
        }
      });
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="navbar">
      <div className="logo">Eventhub</div>

      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <FaBars size={24} color="white" />
      </button>

      <ul className={menuOpen ? 'nav-links open' : 'nav-links'}>
        <li>
          <NavLink to="/" className={activeSection === 'home' ? 'active' : ''}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/dashboard" className={activeSection === 'dashboard' ? 'active' : ''}>
            Events
          </NavLink>
        </li>
        <li>
          <NavLink to="/aboutus" className={activeSection === 'aboutus' ? 'active' : ''}>
            About us
          </NavLink>
        </li>

        {user ? (
          <li className="navbar-user" style={{ position: 'relative' }}>
            <FaUserCircle
              size={24}
              style={{ cursor: 'pointer' }}
              onClick={() => setUserDropdown(!userDropdown)}
            />

            {userDropdown && (
              <div className="user-dropdown">
                <p><strong>{user.name}</strong></p>
                <button onClick={() => navigate('/profile')}>Edit Profile</button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </li>
        ) : (
          <li>
            <NavLink to="/login" className={activeSection === 'login' ? 'active' : ''}>
              Login
            </NavLink>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
