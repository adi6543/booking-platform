const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { signupSchema, loginSchema } = require('../validations/auth.validation');

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d'; // User requested 7 days

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  businessName: user.businessName,
  businessDescription: user.businessDescription,
  category: user.category,
  city: user.city,
  area: user.area,
  pinCode: user.pinCode,
  createdAt: user.createdAt,
});

const signup = async (req, res, next) => {
  try {
    // Validate input
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      return res.status(400).json({ message: firstError });
    }

    const { name, email, password, role } = parsed.data;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const token = generateToken(user._id);

    // Explicitly returning mapped user object to avoid returning password
    res.status(201).json({
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    // Validate input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      return res.status(400).json({ message: firstError });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    // req.user is attached by authMiddleware
    res.json({
      user: buildUserResponse(req.user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, getMe };
