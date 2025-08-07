import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import '../components/navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'dashboard', 'aboutus', 'login']; // section IDs or routes
      let current = '';

      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element) {
          const top = element.getBoundingClientRect().top;
          if (top <= 80) { // adjust offset for navbar height
            current = section;
          }
        }
      });

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // initialize on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="navbar">
      <div className="logo">Eventhub</div>

      <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
        <FaBars size={24} color="white" />
      </button>

      <div className="search-bar">
        <input type="text" placeholder="Search events..." />
        <button type="submit">Search</button>
      </div>

      <ul className={menuOpen ? 'nav-links open' : 'nav-links'}>
        <li>
          <NavLink
            to="/"
            className={activeSection === 'home' ? 'active' : ''}
            end
          >
            Home
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/dashboard"
            className={activeSection === 'dashboard' ? 'active' : ''}
          >
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/aboutus"
            className={activeSection === 'aboutus' ? 'active' : ''}
          >
            About us
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/login"
            className={activeSection === 'login' ? 'active' : ''}
          >
            Login
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
