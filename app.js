const express = require('express');

const app = express();

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

module.exports = app;
