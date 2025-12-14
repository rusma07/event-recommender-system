import React from "react";
import { FaFacebook, FaInstagram, FaLinkedin } from "react-icons/fa";

const Footer = () => (
  <footer className="w-full bg-slate-900 text-slate-200 border-t border-gray-300 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-center py-6">
        {/* Logo / Text */}
        <div className="flex items-center mb-4 sm:mb-0">
          <p className="text-sm text-center sm:text-left">
            &copy; 2025 TechEvents. All rights reserved.
          </p>
        </div>

        {/* Social Links */}
        <div className="flex gap-4">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200 text-xl"
            aria-label="Facebook"
          >
            <FaFacebook />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-500 hover:text-pink-400 transition-colors duration-200 text-xl"
            aria-label="Instagram"
          >
            <FaInstagram />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors duration-200 text-xl"
            aria-label="LinkedIn"
          >
            <FaLinkedin />
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;