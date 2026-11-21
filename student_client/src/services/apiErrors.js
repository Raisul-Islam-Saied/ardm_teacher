/**
 * Server validation error helpers.
 * Server shape (error.middleware.js): { success:false, message, errors:[{ field, message }] }
 */
export function extractFieldErrors(error) {
    const list = error?.response?.data?.errors;
    if (!Array.isArray(list)) return [];
    return list
        .filter((e) => e && (e.field || e.path))
        .map((e) => ({ field: e.field || e.path, message: e.message || e.msg || 'তথ্য সঠিক নয়' }));
}

export function isValidationError(error) {
    const status = error?.response?.status;
    return status === 400 || status === 409 || status === 404;
}
