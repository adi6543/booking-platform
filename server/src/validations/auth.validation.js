const { z } = require('zod');

const signupSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be at most 128 characters'),
  role: z.enum(['customer', 'vendor'], {
    errorMap: () => ({ message: 'Role must be either "customer" or "vendor"' })
  })
});

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email('Invalid email address')
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
});

module.exports = { signupSchema, loginSchema };
