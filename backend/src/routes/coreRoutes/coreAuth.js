const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const { catchErrors } = require('@/handlers/errorHandlers');
const adminAuth = require('@/controllers/coreControllers/adminAuth');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  message: 'Too many attempts from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.route('/login').post(authLimiter, catchErrors(adminAuth.login));
// router.route('/register').post(catchErrors(adminAuth.register));

router.route('/forgetpassword').post(authLimiter, catchErrors(adminAuth.forgetPassword));
router.route('/resetpassword').post(authLimiter, catchErrors(adminAuth.resetPassword));

router.route('/logout').post(adminAuth.isValidAuthToken, catchErrors(adminAuth.logout));

module.exports = router;
