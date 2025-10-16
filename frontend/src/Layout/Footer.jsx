import React from "react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer = () => (
  <footer className="p-6 bg-slate-900 text-slate-200 border-t border-gray-300">
    <div className="flex flex-wrap justify-between items-center">
      {/* Logo / Text */}
      <div className="flex items-center gap-4">
        {/* You can add a logo here if needed */}
        <p className="text-sm">&copy; 2025 MySite. All rights reserved.</p>
      </div>

      {/* Social Links */}
      <div className="flex gap-2 mt-2 sm:mt-0">
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 text-xl hover:text-blue-700 transition-colors"
        >
          <FaFacebook />
        </a>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 text-xl hover:text-blue-700 transition-colors"
        >
          <FaInstagram />
        </a>
        <a
          href="https://linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 text-xl hover:text-blue-700 transition-colors"
        >
          <FaLinkedin />
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
