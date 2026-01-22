require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// CORS FIX for Railway (Express 5 compatible)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Preflight OPTIONS support (Express 5 fixes)
app.options('(.*)', cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const watchedRoutes = require('./routes/watchedRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/watched', watchedRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));
