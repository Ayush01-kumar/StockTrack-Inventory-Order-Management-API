'use strict';
class AppError extends Error {
  constructor(statusCode, code, message) { super(message); this.statusCode = statusCode; this.code = code; }
}
const fail = (status, code, message) => { throw new AppError(status, code, message); };
const notFound = (message = 'Resource not found') => fail(404, 'NOT_FOUND', message);
const conflict = (message) => fail(409, 'CONFLICT', message);
const decimal = (value) => value.toFixed(2);
module.exports = { AppError, fail, notFound, conflict, decimal };
