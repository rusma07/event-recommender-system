import React from 'react';
import { recommendation } from '../api/recommend.js';
import './Recommendation.css';

export default function Recommendation() {
  return (
    <div className="recommendation">
      <h3>Recommended Events For You</h3>
      <ul>
        {recommendation.map((rec) => (
          <li key={rec.id}>
            <strong>{rec.event}</strong> - Interest: {rec.userInterest}%
          </li>
        ))}
      </ul>
    </div>
  )
}
