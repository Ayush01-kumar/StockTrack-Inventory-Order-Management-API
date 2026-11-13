'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const guard = require('@ayush_rajput/expressguard-toolkit');
const env = require('./config/env');
const api = require('./routes/api');
const { AppError } = require('./utils/http');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((x) => x.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(guard.requestId());
app.use(guard.requestLogger());
app.use('/api/v1/auth', guard.rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use(guard.rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.get('/health', (req, res) => res.json({ status: 'ok', requestId: req.id }));
app.use('/api/v1', api);
app.use((req, res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found')));
// Convert known Prisma failures before ExpressGuard formats the final response.
app.use((err, req, res, next) => {
  if (err.code === 'P2002') return next(new AppError(409, 'DUPLICATE_RECORD', 'A record with that unique value already exists'));
  if (err.code === 'P2003') return next(new AppError(409, 'RELATED_RECORD', 'The operation conflicts with related records'));
  if (err.code === 'P2025') return next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
  return next(err);
});
app.use(guard.errorHandler());
module.exports = app;
