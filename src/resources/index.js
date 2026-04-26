/**
 * RESOURCE MODELS: LocationPing, Driver, Station, Province, District, User
 *
 * Each representer (toXxxResource) function takes an internal entity
 * from the data model and returns a clean, client-facing representation.
 *
 * Conventions followed:
 *   - Internal `_id`     → public `id`
 *   - Raw FK ids         → replaced with embedded sub-resource objects
 *   - Sensitive fields   → omitted entirely or role-gated
 *   - Audit fields       → omitted (createdBy, updatedBy, lastLoginIp)
 *   - `href`             → always added for resource discoverability
 *   - Null FK fields     → preserved as null (not omitted) for predictability
 */

const BASE_PATH = '/api/v1';

// ── LOCATION PING ──────────────────────────────────────────────────────────────
/**
 * Full location ping resource — collection and detail use the same shape.
 * Both device-reported timestamp and server receivedAt are exposed for audit.
 */
const toLocationResource = (ping, vehicleRef = null) => ({
  id:         ping._id,
  href:       `${BASE_PATH}/locations/${ping._id}`,
  vehicle:    vehicleRef
    ? { id: vehicleRef._id, registrationNumber: vehicleRef.registrationNumber, href: `${BASE_PATH}/vehicles/${vehicleRef._id}` }
    : { id: ping.vehicleId, href: `${BASE_PATH}/vehicles/${ping.vehicleId}` },
  coordinates: {
    latitude:  ping.latitude,
    longitude: ping.longitude,
  },
  telemetry: {
    speed:      ping.speed      !== null ? ping.speed      : null,  // km/h
    heading:    ping.heading    !== null ? ping.heading    : null,  // degrees
    accuracy:   ping.accuracy   !== null ? ping.accuracy   : null,  // metres
    altitude:   ping.altitude   !== null ? ping.altitude   : null,  // metres
    satellites: ping.satellites !== null ? ping.satellites : null,
  },
  timestamp:  ping.timestamp,   // device-reported time
  receivedAt: ping.receivedAt,  // server ingestion time
});

// ── DRIVER ─────────────────────────────────────────────────────────────────────
/**
 * Collection item — omits NIC number (personally identifiable, sensitive).
 * Clients needing NIC must request the detail view and must be ADMIN/PROVINCIAL.
 */
const toDriverListItem = (driver) => ({
  id:            driver._id,
  href:          `${BASE_PATH}/drivers/${driver._id}`,
  fullName:      driver.fullName,
  licenseNumber: driver.licenseNumber,
  licenseExpiry: driver.licenseExpiry,
  phoneNumber:   driver.phoneNumber,
  status:        driver.status,
  // nicNumber, dateOfBirth — omitted from list view
});

/**
 * Full detail — includes NIC and DOB for authorised officers.
 * The controller passes the caller's role; this representer gates the fields.
 */
const toDriverDetail = (driver, vehicles = [], role) => {
  const includePersonal = role === 'ADMIN' || role === 'PROVINCIAL';
  return {
    id:            driver._id,
    href:          `${BASE_PATH}/drivers/${driver._id}`,
    fullName:      driver.fullName,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: driver.licenseExpiry,
    phoneNumber:   driver.phoneNumber,
    address:       driver.address,
    status:        driver.status,

    ...(includePersonal && {
      nicNumber:   driver.nicNumber,
      dateOfBirth: driver.dateOfBirth,
    }),

    vehicles: vehicles.map(v => ({
      id:                 v._id,
      href:               `${BASE_PATH}/vehicles/${v._id}`,
      registrationNumber: v.registrationNumber,
      status:             v.status,
    })),

    registeredAt: driver.createdAt,
    updatedAt:    driver.updatedAt || null,
  };
};

// ── STATION ────────────────────────────────────────────────────────────────────
const toStationListItem = (station, { district, province } = {}) => ({
  id:           station._id,
  href:         `${BASE_PATH}/stations/${station._id}`,
  name:         station.name,
  code:         station.code,
  stationType:  station.stationType,
  contactNumber:station.contactNumber,
  isActive:     station.isActive,
  coordinates:  station.coordinates || null,
  district: district
    ? { id: district._id, name: district.name, href: `${BASE_PATH}/districts/${district._id}` }
    : null,
  province: province
    ? { id: province._id, name: province.name, code: province.code, href: `${BASE_PATH}/provinces/${province._id}` }
    : null,
});

const toStationDetail = (station, { district, province, vehicles = [] } = {}) => ({
  ...toStationListItem(station, { district, province }),
  address:     station.address,
  vehicles:    vehicles.map(v => ({
    id:                 v._id,
    href:               `${BASE_PATH}/vehicles/${v._id}`,
    registrationNumber: v.registrationNumber,
    status:             v.status,
  })),
  registeredAt: station.createdAt,
  updatedAt:    station.updatedAt || null,
});

// ── PROVINCE ───────────────────────────────────────────────────────────────────
const toProvinceResource = (province, { districts = [], districtCount } = {}) => ({
  id:           province._id,
  href:         `${BASE_PATH}/provinces/${province._id}`,
  name:         province.name,
  code:         province.code,
  sinhaleName:  province.sinhaleName,
  tamilName:    province.tamilName,
  coordinates:  province.coordinates || null,
  districtCount: districtCount !== undefined ? districtCount : districts.length,
  ...(districts.length > 0 && {
    districts: districts.map(d => ({
      id:   d._id,
      name: d.name,
      code: d.code,
      href: `${BASE_PATH}/districts/${d._id}`,
    })),
  }),
  createdAt: province.createdAt,
});

// ── DISTRICT ───────────────────────────────────────────────────────────────────
const toDistrictResource = (district, { province, stations = [], stationCount } = {}) => ({
  id:           district._id,
  href:         `${BASE_PATH}/districts/${district._id}`,
  name:         district.name,
  code:         district.code,
  sinhaleName:  district.sinhaleName,
  tamilName:    district.tamilName,
  coordinates:  district.coordinates || null,
  stationCount: stationCount !== undefined ? stationCount : stations.length,
  province: province
    ? { id: province._id, name: province.name, code: province.code, href: `${BASE_PATH}/provinces/${province._id}` }
    : null,
  ...(stations.length > 0 && {
    stations: stations.map(s => ({
      id:   s._id,
      name: s.name,
      code: s.code,
      href: `${BASE_PATH}/stations/${s._id}`,
    })),
  }),
  createdAt: district.createdAt,
});

// ── USER ───────────────────────────────────────────────────────────────────────
/**
 * User resource — passwordHash is NEVER present in any output.
 * lastLoginIp is internal audit data and is also excluded.
 * The representer enforces these exclusions structurally,
 * so they cannot accidentally leak through.
 */
const toUserResource = (user) => ({
  id:          user._id,
  href:         `${BASE_PATH}/users/${user._id}`,
  username:    user.username,
  // passwordHash: intentionally excluded — never in resource
  // lastLoginIp: intentionally excluded — internal audit only
  fullName:    user.fullName,
  role:        user.role,
  badgeNumber: user.badgeNumber,
  provinceId:  user.provinceId   || null,
  districtId:  user.districtId   || null,
  stationId:   user.stationId    || null,
  vehicleId:   user.vehicleId    || null,
  isActive:    user.isActive,
  lastLogin:   user.lastLogin    || null,
  createdAt:   user.createdAt,
  updatedAt:   user.updatedAt    || null,
});

/**
 * Auth token response — what is returned after a successful login.
 * Minimal user profile embedded alongside the token.
 */
const toAuthResource = (user, token, expiresIn) => ({
  token,
  tokenType:  'Bearer',
  expiresIn,
  user: {
    id:          user._id,
    username:    user.username,
    fullName:    user.fullName,
    role:        user.role,
    provinceId:  user.provinceId   || null,
    districtId:  user.districtId   || null,
    stationId:   user.stationId    || null,
    vehicleId:   user.vehicleId    || null,
  },
});

module.exports = {
  toLocationResource,
  toDriverListItem, toDriverDetail,
  toStationListItem, toStationDetail,
  toProvinceResource,
  toDistrictResource,
  toUserResource,
  toAuthResource,
};
