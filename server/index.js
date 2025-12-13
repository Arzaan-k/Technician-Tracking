
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import locationRoutes from './routes/location.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);

app.get('/', (req, res) => {
    res.send('Location Tracking API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
