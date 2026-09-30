const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error) {
    return res.status(400).json({ errors: error.errors });
  }
};

module.exports = validate;
