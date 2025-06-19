/**
 * Global error handling middleware for Express
 * Ensures all errors are returned as JSON responses
 */
const errorHandler = (err, req, res, next) => {
    // Default error status and message
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log error in development
    if (process.env.NODE_ENV !== 'production') {
        console.error(err);
    }

    // Send JSON response
    res.status(status).json({
        error: message,
        status,
        // Only include stack trace in development
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = errorHandler; 