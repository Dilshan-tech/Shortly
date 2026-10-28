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

  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected internal server error occurred'
    : err.message || 'Server error';

  if (statusCode === 500) {
    console.error(`[Error 500] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: message
  });
}
