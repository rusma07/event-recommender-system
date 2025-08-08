import pool from '../db.js';

export const getAllEvents = async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM events ORDER BY id ASC');
    res.json(rows);                 // send rows straight to the client
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
};
