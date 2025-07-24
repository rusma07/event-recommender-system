import express from 'express';
import eventRoutes from './routes/eventRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
app.use(express.json());

app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);

export default app;
