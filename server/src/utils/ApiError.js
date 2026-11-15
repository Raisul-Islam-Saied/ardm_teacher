class ApiError extends Error {
    constructor(statusCode, message, errors = [], isOperational = true, stack = '', meta = null) {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.message = message;
        this.errors = errors;
        this.isOperational = isOperational;
        this.meta = meta;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

module.exports = ApiError;
