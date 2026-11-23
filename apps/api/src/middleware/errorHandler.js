import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `A record with this ${field} already exists.`,
    });
  }

  // Handle Multer upload limits
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds allowed 25MB limit.',
    });
  }

  // Default internal server error
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error occurred',
  });
}
