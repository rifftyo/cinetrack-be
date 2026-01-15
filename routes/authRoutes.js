const express = require('express');
const router = express.Router();
const {
  register,
  verifyOtp,
  login,
  requestPasswordReset,
  verifyResetOtp,
  resetPassword,
} = require('../controllers/authController');

router.post('/register', register);
router.post('/verify', verifyOtp);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
