import React from 'react';
import '../pages/Aboutus.css'; 

const AboutUs = () => {
  return (
    <section className="about-us">
      <div className="container">
        <h1>About Us</h1>
        <p>
          Welcome to <strong>Eventhub</strong>, your all-in-one platform for discovering, managing, and attending events effortlessly. Whether it's a workshop, conference, seminar, or competition, our platform helps you stay updated, register on time, and never miss an opportunity.
        </p>

        <h2>Our Mission</h2>
        <p>
          We aim to centralize event information and streamline participation — making event planning and attendance efficient, transparent, and user-friendly.
        </p>

        <h2>Why Choose Us?</h2>
        <ul>
          <li>Centralized event timeline to never miss a deadline</li>
          <li>Personalized event recommendations tailored to your interests</li>
          <li>Built with a user-first approach for simplicity and reliability</li>
          <li>Empowering event organizers and attendees to connect easily</li>
        </ul>

        <h2>Join Our Community</h2>
        <p>
          Whether you’re a student, professional, or enthusiast, Eventhub helps you stay informed, plan ahead, and seize every opportunity for growth and networking.
        </p>

        <h2>Contact Us</h2>
        <p>Email: <a href="mailto:contact@eventhub.com">contact@eventhub.com</a></p>
        <p>Phone: +977-9841123456</p>
      </div>
    </section>
  );
};

export default AboutUs;
