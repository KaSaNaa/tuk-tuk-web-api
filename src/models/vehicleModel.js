/**
 * DATA MODEL: Vehicle
 *
 * This module defines the internal entity structure for a registered three-wheeler
 * (tuk-tuk) as stored in the database. This is the domain model — it includes
 * all internal fields, audit metadata, and raw foreign key references.
 *
 * Per WSO2 guidelines: "The domain model drives the implementation of the API."
 * The resource model (see src/resources/vehicleResource.js) then controls
 * what is exposed to API clients.
 *
 * Entity Relationships (internal):
 *   Vehicle  ──── belongs to ──── Driver    (driverId FK)
 *   Vehicle  ──── assigned to ─── Station   (stationId FK)
 *   Vehicle  ──── registered in ─ Province  (provinceId FK)
 *   Vehicle  ──── registered in ─ District  (districtId FK)
 *   Vehicle  ──── has many ──────  LocationPing (1-to-many, via vehicleId)
 */

const VEHICLE_STATUS = Object.freeze({
  ACTIVE:       'ACTIVE',
  SUSPENDED:    'SUSPENDED',
  DEREGISTERED: 'DEREGISTERED',
});

/**
 * Internal field definitions — mirrors what is stored in NeDB.
 * These names are INTERNAL ONLY. The resource layer translates
 * them into the public-facing representation.
 */
const VEHICLE_FIELDS = Object.freeze({
  // Identity
  id:                 '_id',           // internal NeDB auto-id
  registrationNumber: 'registrationNumber',
  deviceId:           'deviceId',      // hardware tracker identifier
  deviceImei:         'deviceImei',    // IMEI — sensitive, never exposed publicly

  // Physical attributes
  make:               'make',
  model:              'model',
  colour:             'colour',
  yearOfRegistration: 'yearOfRegistration',
  engineNumber:       'engineNumber',  // sensitive — law enforcement only
  chassisNumber:      'chassisNumber', // sensitive — law enforcement only

  // Relationships (FK references — internal IDs)
  driverId:    'driverId',
  stationId:   'stationId',
  provinceId:  'provinceId',
  districtId:  'districtId',

  // Operational state
  status:      'status',
  lastLocation:'lastLocation',  // denormalised snapshot for fast live queries

  // Audit metadata (internal — not exposed in public resource)
  createdAt:   'createdAt',
  updatedAt:   'updatedAt',
  createdBy:   'createdBy',   // userId of registering officer
  updatedBy:   'updatedBy',
});

/**
 * Factory: builds a new internal Vehicle entity document for DB insertion.
 * Controllers call this — never build raw DB objects ad hoc.
 */
const createVehicleEntity = ({
  registrationNumber, deviceId, deviceImei,
  make, model, colour, yearOfRegistration,
  engineNumber, chassisNumber,
  driverId, stationId, provinceId, districtId,
  createdBy,
}) => ({
  registrationNumber: registrationNumber.toUpperCase().replace(/\s/g, ''),
  deviceId:           deviceId || null,
  deviceImei:         deviceImei || null,       // stored but never in resource output
  make:               make || null,
  model:              model || null,
  colour:             colour || null,
  yearOfRegistration: yearOfRegistration ? parseInt(yearOfRegistration) : null,
  engineNumber:       engineNumber || null,     // stored but restricted in resource
  chassisNumber:      chassisNumber || null,    // stored but restricted in resource
  driverId:           driverId || null,
  stationId:          stationId || null,
  provinceId:         provinceId || null,
  districtId:         districtId || null,
  status:             VEHICLE_STATUS.ACTIVE,
  lastLocation:       null,
  createdAt:          new Date().toISOString(),
  updatedAt:          null,
  createdBy:          createdBy || null,
  updatedBy:          null,
});

/**
 * Builds an update patch object from allowed fields.
 * Prevents mass-assignment — only whitelisted fields can be updated.
 */
const buildVehicleUpdatePatch = (body, updatedBy) => {
  const ALLOWED = [
    'make', 'model', 'colour', 'yearOfRegistration',
    'engineNumber', 'chassisNumber',
    'driverId', 'stationId', 'provinceId', 'districtId',
    'status', 'deviceImei',
  ];
  const patch = { updatedAt: new Date().toISOString(), updatedBy: updatedBy || null };
  for (const key of ALLOWED) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  return patch;
};

module.exports = { VEHICLE_STATUS, VEHICLE_FIELDS, createVehicleEntity, buildVehicleUpdatePatch };
