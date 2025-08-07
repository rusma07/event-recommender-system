import React from 'react';
import '../components/Button.css';

const Button = ({ children, ...props }) => (
  <button className="custom-button" {...props}>{children}</button>
);

export default Button;