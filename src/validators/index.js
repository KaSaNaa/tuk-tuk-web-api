/**
 * INPUT VALIDATORS
 *
 * All request body and query parameter validation is centralised here.
 * Controllers only run if validation passes — invalid input never reaches
 * business logic or the database layer.
 *
 * Uses express-validator. Each validator is an array of check() rules
 * followed by the shared handleValidation middleware.
 */

const { body, query, validationResult } = require('express-validator');


// Shared: runs after check() rules, returns 422 if any fail
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status:  'error',
      code:    422,
      message: 'Validation failed.',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── AUTH ──────────────────────────────────────────────────────────────────────
const validateLogin = [
  body('username').trim().notEmpty().withMessage('username is required.').isLength({ max: 60 }),
  body('password').notEmpty().withMessage('password is required.').isLength({ max: 128 }),
  handleValidation,
];

const validateRegister = [
  body('username').trim().notEmpty().isLength({ min: 3, max: 60 })
    .matches(/^[a-z0-9_]+$/).withMessage('username must be lowercase letters, numbers, and underscores only.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
  body('role').isIn(['ADMIN', 'PROVINCIAL', 'DISTRICT', 'DEVICE']).withMessage('Invalid role.'),
  body('fullName').optional().trim().isLength({ max: 100 }),
  body('badgeNumber').optional().trim().isLength({ max: 30 }),
  handleValidation,
];

// ── VEHICLE ───────────────────────────────────────────────────────────────────
const validateCreateVehicle = [
  body('registrationNumber').trim().notEmpty().withMessage('registrationNumber is required.')
    .isLength({ max: 20 }).matches(/^[A-Z0-9\s-]+$/i).withMessage('Invalid registration number format.'),
  body('deviceId').trim().notEmpty().withMessage('deviceId is required.').isLength({ max: 50 }),
  body('make').optional().trim().isLength({ max: 50 }),
  body('model').optional().trim().isLength({ max: 50 }),
  body('colour').optional().trim().isLength({ max: 30 }),
  body('yearOfRegistration').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('yearOfRegistration must be a valid year.'),
  body('provinceId').optional().isString().isLength({ max: 40 }),
  body('districtId').optional().isString().isLength({ max: 40 }),
  body('stationId').optional().isString().isLength({ max: 40 }),
  body('driverId').optional().isString().isLength({ max: 40 }),
  handleValidation,
];

const validateUpdateVehicle = [
  body('status').optional().isIn(['ACTIVE', 'SUSPENDED', 'DEREGISTERED']).withMessage('Invalid status.'),
  body('yearOfRegistration').optional().isInt({ min: 1990, max: new Date().getFullYear() + 1 }),
  body('make').optional().trim().isLength({ max: 50 }),
  body('colour').optional().trim().isLength({ max: 30 }),
  handleValidation,
];

// ── LOCATION PING ─────────────────────────────────────────────────────────────
const validatePushLocation = [
  body('vehicleId').notEmpty().withMessage('vehicleId is required.').isString().isLength({ max: 40 }),
  body('latitude').notEmpty().withMessage('latitude is required.')
    .isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90.'),
  body('longitude').notEmpty().withMessage('longitude is required.')
    .isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180.'),
  body('speed').optional().isFloat({ min: 0, max: 200 }).withMessage('speed must be between 0 and 200 km/h.'),
  body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('heading must be between 0 and 360 degrees.'),
  body('accuracy').optional().isFloat({ min: 0, max: 1000 }),
  body('altitude').optional().isFloat({ min: -500, max: 9000 }),
  body('satellites').optional().isInt({ min: 0, max: 50 }),
  handleValidation,
];

// ── DRIVER ────────────────────────────────────────────────────────────────────
const validateCreateDriver = [
  body('fullName').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('fullName is required (2–100 chars).'),
  body('licenseNumber').trim().notEmpty().isLength({ max: 20 }).matches(/^[A-Z0-9]+$/i).withMessage('Invalid license number format.'),
  body('nicNumber').trim().notEmpty().isLength({ min: 10, max: 15 })
    .matches(/^[0-9]{9}[0-9Vv]$|^[0-9]{12}$/).withMessage('nicNumber must be a valid Sri Lanka NIC (old or new format).'),
  body('phoneNumber').optional().trim().matches(/^\+?[0-9]{7,15}$/).withMessage('Invalid phone number.'),
  body('licenseExpiry').optional().isISO8601().withMessage('licenseExpiry must be a valid date (YYYY-MM-DD).'),
  handleValidation,
];

// ── STATION ───────────────────────────────────────────────────────────────────
const validateCreateStation = [
  body('name').trim().notEmpty().isLength({ min: 3, max: 150 }).withMessage('name is required (3–150 chars).'),
  body('districtId').notEmpty().withMessage('districtId is required.'),
  body('provinceId').notEmpty().withMessage('provinceId is required.'),
  body('stationType').optional().isIn(['HEADQUARTERS', 'PROVINCIAL', 'DISTRICT', 'STATION']).withMessage('Invalid stationType.'),
  body('contactNumber').optional().matches(/^\+?[0-9]{7,15}$/).withMessage('Invalid contact number.'),
  body('latitude').optional().isFloat({ min: 5.7, max: 10.0 }).withMessage('latitude must be within Sri Lanka bounds.'),
  body('longitude').optional().isFloat({ min: 79.4, max: 82.0 }).withMessage('longitude must be within Sri Lanka bounds.'),
  handleValidation,
];

// ── GEO ───────────────────────────────────────────────────────────────────────
const validateCreateProvince = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('code').trim().notEmpty().isLength({ min: 2, max: 5 }).matches(/^[A-Z]+$/i).withMessage('code must be letters only.'),
  handleValidation,
];

const validateCreateDistrict = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('code').trim().notEmpty().isLength({ min: 2, max: 5 }).matches(/^[A-Z]+$/i),
  body('provinceId').notEmpty().withMessage('provinceId is required.'),
  handleValidation,
];

// ── QUERY PARAM VALIDATORS ───────────────────────────────────────────────────
const validateHistoryQuery = [
  query('from').optional().isISO8601().withMessage('from must be a valid ISO 8601 datetime.'),
  query('to').optional().isISO8601().withMessage('to must be a valid ISO 8601 datetime.'),
  query('limit').optional().isInt({ min: 1, max: 5000 }).withMessage('limit must be between 1 and 5000.'),
  query('page').optional().isInt({ min: 1 }),
  handleValidation,
];

const validatePaginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('limit must be between 1 and 500.'),
  query('sort').optional().matches(/^[a-zA-Z]+:(asc|desc)$/).withMessage('sort must be in format field:asc or field:desc (e.g. registrationNumber:asc).'),
  handleValidation,
];

module.exports = {
  validateLogin, validateRegister,
  validateCreateVehicle, validateUpdateVehicle,
  validatePushLocation,
  validateCreateDriver,
  validateCreateStation,
  validateCreateProvince, validateCreateDistrict,
  validateHistoryQuery, validatePaginationQuery,
};
