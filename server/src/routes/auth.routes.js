const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { signupSchema, loginSchema } = require('../validations/auth.schema');
const { protect } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);

// A simple test route to verify role restriction (vendor only)
router.get('/vendor-only', protect, authorize('vendor'), (req, res) => {
  res.json({ message: 'Welcome, vendor!' });
});

module.exports = router;
