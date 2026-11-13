'use strict';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { AppError } = require('../utils/http');
const env = require('../config/env');
async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Invalid or inactive account');
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) { next(err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError ? new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token') : err); }
}
const allowRoles = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
const safeUser = ({ passwordHash, ...user }) => user;
async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
  return { token, user: safeUser(user) };
}
module.exports = { authenticate, allowRoles, safeUser, login };
