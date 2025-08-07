import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import navigate
import '../pages/Home.css';
import Button from '../components/Button';
import AboutUs from './Aboutus';

const Home = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login'); // Navigate to login page
  };

return (
  <>
    <section className="hero">
      <h1>Welcome to Eventhub</h1>
      <p>
        The ultimate event management platform designed specifically for technology festivals,
        hackathons, and tech conferences.
      </p>
      <Button onClick={handleGetStarted}>Get Started</Button>
    </section>

    <section id="about" className="about-section">
      <AboutUs />
    </section>
  </>
);
}
export default Home;
