import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorDetails = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorDetails
    });
  }

  // Handle MongoDB E11000 duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'code';
    const val = err.keyValue ? err.keyValue[field] : '';
    if (field === 'email') {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }
    return res.status(409).json({
      success: false,
      error: `A short link with this ${field === 'code' ? 'short code' : 'custom alias'} ("${val}") already exists.`
    });
  }

  // Handle Mongoose cast errors (invalid ObjectIds)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid resource identifier: "${err.value}"`
    });
  }

  // Handle Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: messages.join('. ')
    });
  }

  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected internal server error occurred'
    : err.message || 'Server error';

  if (statusCode === 500) {
    console.error(`[Error 500] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(err.code ? { code: err.code } : {})
  });
}
