const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { dbAsync }  = require('../config/database');
const { successResponse, errorResponse } = require('../middleware/response');
const { USER_ROLES, createUserEntity } = require('../models/domainModels');
const { toUserResource, toAuthResource } = require('../resources/index');

const generateToken = (user, expiresIn) =>
  jwt.sign(
    { id: user._id, username: user.username, role: user.role,
      provinceId: user.provinceId || null, districtId: user.districtId || null,
      stationId: user.stationId || null, vehicleId: user.vehicleId || null },
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '8h' }
  );

// POST /api/v1/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return errorResponse(res, 400, 'username and password are required.');

    // Data model: raw user entity from DB (includes passwordHash)
    const user = await dbAsync.users.findOne({ username: username.toLowerCase().trim() });
    if (!user || !user.isActive) return errorResponse(res, 401, 'Invalid credentials or account inactive.');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return errorResponse(res, 401, 'Invalid credentials.');

    // Audit: record last login time and IP (data model fields)
    await dbAsync.users.update({ _id: user._id }, {
      $set: { lastLogin: new Date().toISOString(), lastLoginIp: req.ip }
    });

    const expiresIn = user.role === USER_ROLES.DEVICE ? (process.env.JWT_DEVICE_EXPIRES_IN || '365d') : (process.env.JWT_EXPIRES_IN || '8h');
    const token = generateToken(user, expiresIn);

    // Resource model: toAuthResource strips passwordHash and lastLoginIp
    return successResponse(res, toAuthResource(user, token, expiresIn));
  } catch (err) { next(err); }
};

// POST /api/v1/auth/register  (ADMIN only)
const register = async (req, res, next) => {
  try {
    const { username, password, fullName, role, badgeNumber, provinceId, districtId, stationId, vehicleId } = req.body;
    if (!username || !password || !role) return errorResponse(res, 400, 'username, password, and role are required.');
    if (!Object.values(USER_ROLES).includes(role)) return errorResponse(res, 400, `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(', ')}`);
    if (password.length < 8) return errorResponse(res, 400, 'Password must be at least 8 characters.');

    const existing = await dbAsync.users.findOne({ username: username.toLowerCase().trim() });
    if (existing) return errorResponse(res, 409, 'Username already exists.');

    const passwordHash = await bcrypt.hash(password, 12);

    // Data model: entity factory enforces field structure and defaults
    const entity  = createUserEntity({ username, passwordHash, fullName, role, badgeNumber, provinceId, districtId, stationId, vehicleId, createdBy: req.user.id });
    const created = await dbAsync.users.insert(entity);

    // Resource model: toUserResource excludes passwordHash and audit-only fields
    return successResponse(res, toUserResource(created), null, 201);
  } catch (err) { next(err); }
};

// GET /api/v1/auth/me
const me = async (req, res, next) => {
  try {
    const user = await dbAsync.users.findOne({ _id: req.user.id });
    if (!user) return errorResponse(res, 404, 'User not found.');
    return successResponse(res, toUserResource(user));
  } catch (err) { next(err); }
};

module.exports = { login, register, me };
