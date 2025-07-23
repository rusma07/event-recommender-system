import React from 'react';
import { schedule } from '../api/schedule.js';
import './Schedule.css';

export default function Schedule() {
  return (
    <div className="schedule">
      <h3>Event Schedule</h3>
      <ul>
        {schedule.map((item) => (
          <li key={item.id}>
            <strong>{item.event}</strong> — {item.time}
          </li>
        ))}
      </ul>
    </div>
  )
}
