const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authMiddleware');
const statisticsController = require('../controllers/statisticsController');

router.get('/', authenticateToken, statisticsController.getStatistics);
router.get('/insights', authenticateToken, statisticsController.getInsights);

module.exports = router;
