import express from 'express';
import eventRoutes from './routes/eventRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/events', eventRoutes);
export default app;

