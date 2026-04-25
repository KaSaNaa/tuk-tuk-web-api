/**
 * DATA MODELS: User, Driver, Station, Province, District
 *
 * Internal entity definitions for the remaining domain objects.
 * Each module defines:
 *   1. Status/type enumerations (internal constants)
 *   2. A factory function for creating new entities (for insertion)
 *   3. A patch builder (for safe partial updates)
 *
 * None of these raw entities should ever be returned directly to clients.
 * All client-facing output goes through the resource layer.
 */

// ── USER ──────────────────────────────────────────────────────────────────────
const USER_ROLES = Object.freeze({
  ADMIN:      'ADMIN',
  PROVINCIAL: 'PROVINCIAL',
  DISTRICT:   'DISTRICT',
  DEVICE:     'DEVICE',
});

const createUserEntity = ({
  username, passwordHash, fullName, role,
  badgeNumber, provinceId, districtId, stationId, vehicleId,
  createdBy,
}) => ({
  username:     username.toLowerCase().trim(),
  passwordHash,                 // bcrypt hash — NEVER exposed in any resource
  fullName:     fullName || username,
  role,
  badgeNumber:  badgeNumber  || null,
  provinceId:   provinceId   || null,
  districtId:   districtId   || null,
  stationId:    stationId    || null,
  vehicleId:    vehicleId    || null,  // for DEVICE role — links token to vehicle
  isActive:     true,
  createdAt:    new Date().toISOString(),
  updatedAt:    null,
  lastLogin:    null,
  lastLoginIp:  null,   // stored for audit — never exposed in resource
  createdBy:    createdBy || null,
});

const buildUserUpdatePatch = (body, updatedBy) => {
  const ALLOWED = ['fullName', 'badgeNumber', 'provinceId', 'districtId', 'stationId', 'isActive'];
  const patch = { updatedAt: new Date().toISOString(), updatedBy };
  for (const key of ALLOWED) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (body.passwordHash) patch.passwordHash = body.passwordHash; // pre-hashed by controller
  return patch;
};

// ── DRIVER ────────────────────────────────────────────────────────────────────
const DRIVER_STATUS = Object.freeze({
  ACTIVE:    'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REVOKED:   'REVOKED',
});

const createDriverEntity = ({
  fullName, licenseNumber, licenseExpiry,
  nicNumber, dateOfBirth, phoneNumber, address,
  provinceId, createdBy,
}) => ({
  fullName,
  licenseNumber,
  licenseExpiry:  licenseExpiry  || null,
  nicNumber,                         // NIC — sensitive, restricted in resource by role
  dateOfBirth:    dateOfBirth    || null,
  phoneNumber:    phoneNumber    || null,
  address:        address        || null,
  provinceId:     provinceId     || null,
  status:         DRIVER_STATUS.ACTIVE,
  createdAt:      new Date().toISOString(),
  updatedAt:      null,
  createdBy:      createdBy      || null,
  updatedBy:      null,
});

const buildDriverUpdatePatch = (body, updatedBy) => {
  const ALLOWED = ['fullName', 'licenseExpiry', 'phoneNumber', 'address', 'status', 'provinceId'];
  const patch = { updatedAt: new Date().toISOString(), updatedBy };
  for (const key of ALLOWED) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch;
};

// ── STATION ───────────────────────────────────────────────────────────────────
const STATION_TYPE = Object.freeze({
  HEADQUARTERS: 'HEADQUARTERS',
  PROVINCIAL:   'PROVINCIAL',
  DISTRICT:     'DISTRICT',
  STATION:      'STATION',
});

const createStationEntity = ({
  name, code, districtId, provinceId,
  stationType, address, contactNumber,
  latitude, longitude, createdBy,
}) => ({
  name,
  code:          code          || null,
  districtId,
  provinceId,
  stationType:   stationType   || STATION_TYPE.STATION,
  address:       address       || null,
  contactNumber: contactNumber || null,
  coordinates: (latitude && longitude)
    ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    : null,
  isActive:  true,
  createdAt: new Date().toISOString(),
  updatedAt: null,
  createdBy: createdBy || null,
  updatedBy: null,
});

const buildStationUpdatePatch = (body, updatedBy) => {
  const ALLOWED = ['name', 'address', 'contactNumber', 'isActive'];
  const patch = { updatedAt: new Date().toISOString(), updatedBy };
  for (const key of ALLOWED) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (body.latitude && body.longitude) {
    patch.coordinates = { latitude: parseFloat(body.latitude), longitude: parseFloat(body.longitude) };
  }
  return patch;
};

// ── PROVINCE ──────────────────────────────────────────────────────────────────
const createProvinceEntity = ({ name, code, sinhaleName, tamilName, latitude, longitude }) => ({
  name,
  code:         code.toUpperCase(),
  sinhaleName:  sinhaleName  || null,
  tamilName:    tamilName    || null,
  coordinates:  (latitude && longitude)
    ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    : null,
  createdAt:    new Date().toISOString(),
  updatedAt:    null,
});

// ── DISTRICT ──────────────────────────────────────────────────────────────────
const createDistrictEntity = ({ name, code, provinceId, sinhaleName, tamilName, latitude, longitude }) => ({
  name,
  code:         code.toUpperCase(),
  provinceId,
  sinhaleName:  sinhaleName  || null,
  tamilName:    tamilName    || null,
  coordinates:  (latitude && longitude)
    ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    : null,
  createdAt:    new Date().toISOString(),
  updatedAt:    null,
});

module.exports = {
  USER_ROLES,   createUserEntity,     buildUserUpdatePatch,
  DRIVER_STATUS, createDriverEntity,  buildDriverUpdatePatch,
  STATION_TYPE,  createStationEntity, buildStationUpdatePatch,
  createProvinceEntity,
  createDistrictEntity,
};
