const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const authenticateToken = require('../middlewares/authMiddleware');

router.get(
  '/now-playing',
  authenticateToken,
  movieController.getNowPlayingMovies
);
router.get('/top-rated', authenticateToken, movieController.getTopRatedMovies);
router.get('/discover', authenticateToken, movieController.searchMovies);
router.get('/:id', authenticateToken, movieController.getMovieDetail);

module.exports = router;
