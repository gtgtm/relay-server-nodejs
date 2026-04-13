/**
 * Standardized API response formatting
 */

/**
 * Success response format
 * @param {*} data - Response data payload
 * @param {number} statusCode - HTTP status code (default 200)
 * @param {string} message - Optional success message
 */
function success(data, statusCode = 200, message = null) {
  return {
    status: statusCode,
    data,
    ...(message && { message }),
  };
}

/**
 * Error response format
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} details - Additional error details
 */
function error(errorMsg, statusCode = 400, details = {}) {
  return {
    status: statusCode,
    error: errorMsg,
    message: errorMsg,
    timestamp: new Date().toISOString(),
    ...details,
  };
}

/**
 * Paginated response format
 * @param {array} data - Array of items
 * @param {number} total - Total item count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 */
function paginated(data, total, page, limit) {
  return {
    status: 200,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  success,
  error,
  paginated,
};
