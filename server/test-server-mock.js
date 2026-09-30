const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { z } = require('zod');

// --- Mock User Model ---
const users = [];
const UserMock = {
  findOne: async ({ email }) => users.find(u => u.email === email),
  findById: async (id) => {
    const user = users.find(u => String(u._id) === String(id));
    if (!user) return null;
    return {
      ...user,
      select: () => {
        const { password, ...rest } = user;
        return rest;
      }
    };
  },
  create: async (data) => {
    const newUser = { _id: Math.random().toString(36).slice(2), ...data, createdAt: new Date() };
    users.push(newUser);
    return newUser;
  }
};

// --- Mocking process.env ---
process.env.JWT_SECRET = 'test_secret_123';

// --- Auth logic using mock ---
const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

const generateToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (await UserMock.findOne({ email })) return res.status(400).json({ message: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await UserMock.create({ name, email, password: hashedPassword, role });
    res.status(201).json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }
    });
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserMock.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }
    });
  } catch (error) { next(error); }
};

const getMe = async (req, res, next) => res.json({ user: req.user });

const protect = async (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await UserMock.findById(decoded.id).then(u => u.select('-password'));
      if (!req.user) return res.status(401).json({ message: 'User not found' });
      next();
    } catch (e) { res.status(401).json({ message: 'Not authorized' }); }
  } else { res.status(401).json({ message: 'No token' }); }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: 'Not authorized for this route' });
  next();
};

const validate = (schema) => (req, res, next) => {
  try { req.body = schema.parse(req.body); next(); } catch (e) { res.status(400).json({ errors: e.errors }); }
};
const signupSchema = z.object({
  name: z.string().min(2), email: z.string().email(),
  password: z.string().min(6), role: z.enum(['customer', 'vendor'])
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

// --- App setup ---
const app = express();
app.use(express.json());
const router = express.Router();
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.get('/vendor-only', protect, authorize('vendor'), (req, res) => res.json({ message: 'Welcome, vendor!' }));
app.use('/api/auth', router);

app.listen(5000, () => console.log('Mock server running on 5000'));
