import React, { useEffect } from 'react';
import './Aboutus.css';

const AboutUs = () => {
  useEffect(() => {
    document.body.classList.add('about-page');
    return () => document.body.classList.remove('about-page');
  }, []);

  return (
    <section className="about-us">
      <div className="container">
        <h1>About TechEvents</h1>
        <p>
          <strong>TechEvents</strong> is your all-in-one platform for discovering, managing, and attending events with ease. From workshops and conferences to competitions and seminars, we ensure you stay informed, register on time, and never miss an opportunity.
        </p>

        <h2>Our Mission</h2>
        <p>
          Our mission is to centralize event information and simplify participation. We strive to make event planning and attendance efficient, transparent, and seamless for both attendees and organizers.
        </p>

        <h2>Why Choose TechEvents?</h2>
        <ul>
          <li>Comprehensive event timeline to track all upcoming events</li>
          <li>Personalized recommendations tailored to your interests</li>
          <li>User-centric design for simplicity, reliability, and convenience</li>
          <li>Empowering organizers and attendees to connect effortlessly</li>
        </ul>

        <h2>Join Our Community</h2>
        <p>
          Whether you’re a student, professional, or enthusiast, TechEvents keeps you informed, helps you plan ahead, and enables you to seize every opportunity for personal and professional growth.
        </p>

        <h2>Contact Us</h2>
        <p>Email: <a href="mailto:contact@techevents.com">contact@techevents.com</a></p>
        <p>Phone: +977-9841123456</p>
      </div>
    </section>
  );
};

export default AboutUs;
