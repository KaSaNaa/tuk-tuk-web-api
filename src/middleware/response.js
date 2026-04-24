// ── Error response helper ────────────────────────────────────────────────────
const errorResponse = (res, status, message, details = null) => {
  const body = { status: 'error', code: status, message };
  if (details) body.details = details;
  return res.status(status).json(body);
};

// ── Success response helper ──────────────────────────────────────────────────
const successResponse = (res, data, meta = null, status = 200) => {
  const body = { status: 'success', code: status, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

// ── Global error handler ─────────────────────────────────────────────────────
const globalErrorHandler = (err, req, res, _next) => {
  console.error('[ERROR]', err.message, err.stack);
  if (err.errorType === 'uniqueViolated') {
    return errorResponse(res, 409, 'A resource with this unique identifier already exists.', { field: err.key });
  }
  return errorResponse(res, 500, 'Internal server error.', process.env.NODE_ENV === 'development' ? err.message : null);
};

// ── 404 handler ──────────────────────────────────────────────────────────────
const notFoundHandler = (req, res) => {
  return errorResponse(res, 404, `Route ${req.method} ${req.originalUrl} not found.`);
};

// ── Pagination helper ────────────────────────────────────────────────────────
const getPagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(500, Math.max(1, parseInt(query.limit) || 50));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

module.exports = { errorResponse, successResponse, globalErrorHandler, notFoundHandler, getPagination, paginationMeta };


// ── Sorting helper ────────────────────────────────────────────────────────────
// Parses ?sort=registrationNumber:asc or ?sort=createdAt:desc
// Returns a NeDB-compatible sort object e.g. { registrationNumber: 1 }
const getSortOptions = (query, allowedFields, defaultField = 'createdAt', defaultDir = -1) => {
  if (!query.sort) return { [defaultField]: defaultDir };
  const [field, dir] = query.sort.split(':');
  if (!allowedFields.includes(field)) return { [defaultField]: defaultDir };
  return { [field]: dir === 'desc' ? -1 : 1 };
};

module.exports = Object.assign(module.exports, { getSortOptions });
