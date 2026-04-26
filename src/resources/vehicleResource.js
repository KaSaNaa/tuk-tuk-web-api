/**
 * RESOURCE MODEL: Vehicle
 *
 * Transforms internal Vehicle entities (from the data model / DB)
 * into client-facing resource representations.
 *
 * Per WSO2 guidelines: "The resource model is driven by client interactions."
 * "There is typically no one-to-one correspondence between data model elements
 * and resources of the API."
 *
 * Key differences from internal data model:
 *   - Internal `_id`       → resource `id`
 *   - `deviceImei`         → OMITTED entirely from standard view (sensitive)
 *   - `engineNumber`       → OMITTED from collection view; exposed in detail only for ADMIN
 *   - `chassisNumber`      → Same restriction as engineNumber
 *   - `createdBy/updatedBy`→ OMITTED (internal audit, not client concern)
 *   - `href`               → ADDED (self-link for resource discoverability)
 *   - `driver`             → EMBEDDED as nested sub-resource (not raw FK)
 *   - `district/province`  → EMBEDDED as nested sub-resources
 *   - `lastLocation`       → EMBEDDED as LocationPing sub-resource
 *
 * The resource model also defines the LocationPing sub-resource used
 * inside vehicle responses.
 */

const BASE_PATH = '/api/v1';

/**
 * Minimal location sub-resource — embedded inside vehicle responses.
 * Only coordinates and timestamp are needed for a position snapshot.
 */
const toLocationSubResource = (ping) => {
  if (!ping) return null;
  return {
    latitude:  ping.latitude,
    longitude: ping.longitude,
    speed:     ping.speed     !== undefined ? ping.speed     : null,
    heading:   ping.heading   !== undefined ? ping.heading   : null,
    timestamp: ping.timestamp,
    receivedAt: ping.receivedAt || null,
  };
};

/**
 * Minimal reference sub-resource — for linked entities (driver, district, etc.)
 * Provides just enough to identify the related entity; clients follow href for detail.
 */
const toRefSubResource = (entity, resourcePath) => {
  if (!entity) return null;
  return {
    id:   entity._id,
    name: entity.name || entity.fullName || null,
    href: entity._id ? `${BASE_PATH}/${resourcePath}/${entity._id}` : null,
  };
};

/**
 * Collection item representation — used when listing vehicles.
 * Intentionally omits sensitive forensic fields (engine/chassis numbers).
 */
const toVehicleListItem = (vehicle, { driver, district, province, lastPing } = {}) => ({
  id:                 vehicle._id,
  href:               `${BASE_PATH}/vehicles/${vehicle._id}`,
  registrationNumber: vehicle.registrationNumber,
  deviceId:           vehicle.deviceId,
  make:               vehicle.make,
  model:              vehicle.model,
  colour:             vehicle.colour,
  yearOfRegistration: vehicle.yearOfRegistration,
  status:             vehicle.status,
  driver:             toRefSubResource(driver, 'drivers'),
  district:           toRefSubResource(district, 'districts'),
  province:           toRefSubResource(province, 'provinces'),
  lastLocation:       toLocationSubResource(lastPing),
  // engineNumber, chassisNumber, deviceImei — deliberately excluded from list view
});

/**
 * Full detail representation — used for GET /vehicles/:id.
 * Includes forensic fields for ADMIN/PROVINCIAL; excludes for DISTRICT.
 */
const toVehicleDetail = (vehicle, { driver, district, province, station, lastPing } = {}, role) => {
  const includeForensic = role === 'ADMIN' || role === 'PROVINCIAL';
  return {
    id:                 vehicle._id,
    href:               `${BASE_PATH}/vehicles/${vehicle._id}`,
    registrationNumber: vehicle.registrationNumber,
    deviceId:           vehicle.deviceId,
    // deviceImei is NEVER in any resource — it identifies hardware uniquely
    make:               vehicle.make,
    model:              vehicle.model,
    colour:             vehicle.colour,
    yearOfRegistration: vehicle.yearOfRegistration,
    status:             vehicle.status,

    // Forensic fields — ADMIN and PROVINCIAL only
    ...(includeForensic && {
      engineNumber:  vehicle.engineNumber,
      chassisNumber: vehicle.chassisNumber,
    }),

    // Embedded sub-resources (not raw FK IDs)
    driver:   toRefSubResource(driver, 'drivers'),
    station:  toRefSubResource(station, 'stations'),
    district: toRefSubResource(district, 'districts'),
    province: toRefSubResource(province, 'provinces'),

    lastLocation: toLocationSubResource(lastPing),

    // Temporal metadata — creation time is useful for clients; internal audit excluded
    registeredAt: vehicle.createdAt,
    updatedAt:    vehicle.updatedAt || null,
  };
};

module.exports = { toVehicleListItem, toVehicleDetail, toLocationSubResource, toRefSubResource };
