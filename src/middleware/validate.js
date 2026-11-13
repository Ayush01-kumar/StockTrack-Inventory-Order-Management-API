'use strict';
const { AppError } = require('../utils/http');
module.exports = (schema) => (req, res, next) => {
  const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!parsed.success) return next(new AppError(400, 'VALIDATION_ERROR', parsed.error.issues.map((i) => `${i.path.slice(1).join('.')}: ${i.message}`).join('; ')));
  req.validated = parsed.data;
  next();
};
