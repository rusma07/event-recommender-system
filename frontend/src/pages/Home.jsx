import React from 'react';
import Recommendation from '../components/Recommendation.jsx';
import Schedule from '../components/Schedule.jsx';
import './Home.css';

export default function Home() {
  return (
    <main className="home-page">
      <h1>Welcome to the Event Management System</h1>
      <div className="home-content">
        <Recommendation/>
        <Schedule />
      </div>
    </main>
  )
}
