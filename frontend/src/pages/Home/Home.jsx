import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import Button from '../../components/Button/Button';
import AboutUs from '../Aboutus/Aboutus';

const Home = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login'); // Navigate to login page
  };

  return (
    <>
      <section className="hero">
        {/* Image from public folder */}
        <img src="/assets/Tech_events__1_-removebg-preview.png" alt="Tech Events" />
        <h1>Your Next Meetup Awaits!
</h1>
        <p>
          Be part of 100+ local events and communities. Connect, learn, and engage with fellow innovators and enthusiasts.
        </p>
        <Button onClick={handleGetStarted}>Get Started</Button>
      </section>

      <section id="about" className="about-section">
        <AboutUs />
      </section>
    </>
  );
};

export default Home;
