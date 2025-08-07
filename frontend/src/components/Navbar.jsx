import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">EventMgmt</Link>
        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>
      <div className={`navbar-links ${menuOpen ? 'active' : ''}`}>
        <Link
          to="/"
          className={location.pathname === '/' ? 'active-link' : ''}
          onClick={() => setMenuOpen(false)}
        >
          Home
        </Link>
        <Link
          to="/login"
          className={location.pathname === '/login' ? 'active-link' : ''}
          onClick={() => setMenuOpen(false)}
        >
          Login
        </Link>
      </div>
    </nav>
  )
}
