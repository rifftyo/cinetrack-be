const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const authenticateToken = require('../middlewares/authMiddleware');
const userController = require('../controllers/userController');

router.get('/', authenticateToken, userController.getProfile);
router.put(
  '/',
  authenticateToken,
  upload.single('avatar'),
  userController.updateProfile
);

module.exports = router;
