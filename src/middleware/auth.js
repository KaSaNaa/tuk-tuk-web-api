const jwt = require('jsonwebtoken');

/**
 * User roles in the system:
 * ADMIN       - HQ / Central administrator (full access)
 * PROVINCIAL  - Provincial control officer (province-scoped)
 * DISTRICT    - District / Station officer (district-scoped)
 * DEVICE      - Tuk-tuk GPS device (location push only)
 */
const ROLES = {
  ADMIN:      'ADMIN',
  PROVINCIAL: 'PROVINCIAL',
  DISTRICT:   'DISTRICT',
  DEVICE:     'DEVICE',
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      code: 401,
      message: 'Authorization header missing or malformed. Use: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', code: 401, message: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ status: 'error', code: 401, message: 'Invalid token.' });
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ status: 'error', code: 401, message: 'Unauthenticated.' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      code: 403,
      message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
    });
  }
  next();
};

module.exports = { authenticate, authorize, ROLES };
