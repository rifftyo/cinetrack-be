const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const watchedController = require('../controllers/watchedController');

router.post('/', authenticateToken, watchedController.addWatchedMovie);
router.get('/', authenticateToken, watchedController.getWatchedMovies);
router.put(
  '/:tmdb_id',
  authenticateToken,
  watchedController.updateWatchedMovie
);

module.exports = router;
