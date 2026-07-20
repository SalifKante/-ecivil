import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { isProduction } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound('ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

/** Normalizes any thrown value into the { error: { code, message, details? } } shape. */
function normalize(err) {
  if (err instanceof ApiError) {
    return { statusCode: err.statusCode, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Document validation failed',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return { statusCode: 400, code: 'INVALID_ID', message: `Invalid value for ${err.path}` };
  }

  // Duplicate key
  if (err?.code === 11000) {
    return {
      statusCode: 409,
      code: 'DUPLICATE_KEY',
      message: 'Resource already exists',
      details: Object.keys(err.keyPattern ?? {}).map((path) => ({ path, message: 'must be unique' })),
    };
  }

  return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export function errorHandler(err, req, res, next) {
  const { statusCode, code, message, details } = normalize(err);

  const log = statusCode >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
  log({ err, statusCode, code, method: req.method, url: req.originalUrl }, message);

  const body = { error: { code, message } };
  if (details) body.error.details = details;
  // Stack traces are a disclosure risk — never past development.
  if (!isProduction && statusCode >= 500) body.error.stack = err.stack;

  res.status(statusCode).json(body);
}
