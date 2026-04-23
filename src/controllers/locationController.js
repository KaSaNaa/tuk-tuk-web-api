const { dbAsync } = require('../config/database');
const { successResponse, errorResponse, getPagination, paginationMeta } = require('../middleware/response');
const { createLocationPingEntity, isWithinSriLanka } = require('../models/locationModel');
const { toLocationResource } = require('../resources/index');

// POST /api/v1/locations — device pushes a GPS ping
const pushLocation = async (req, res, next) => {
  try {
    const { vehicleId, latitude, longitude, speed, heading, accuracy, altitude, satellites, timestamp } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
      return errorResponse(res, 400, 'Invalid coordinates. Latitude: -90 to 90. Longitude: -180 to 180.');

    // Data model: coordinate domain validation (Sri Lanka bounds)
    if (!isWithinSriLanka(lat, lng))
      return errorResponse(res, 422, 'Coordinates are outside Sri Lanka operational boundary.');

    const vehicle = await dbAsync.vehicles.findOne({ _id: vehicleId });
    if (!vehicle) return errorResponse(res, 404, 'Vehicle not found.');
    if (vehicle.status !== 'ACTIVE') return errorResponse(res, 403, 'Vehicle is not active. Location updates rejected.');

    if (req.user.role === 'DEVICE' && req.user.vehicleId !== vehicleId)
      return errorResponse(res, 403, 'Device token is not authorised for this vehicle.');

    // Data model: build entity via factory (consistent field normalisation)
    const entity = createLocationPingEntity({ vehicleId, latitude: lat, longitude: lng, speed, heading, accuracy, altitude, satellites, deviceTimestamp: timestamp });
    const ping   = await dbAsync.locations.insert(entity);

    // Update vehicle's denormalised last-known-location snapshot
    await dbAsync.vehicles.update({ _id: vehicleId }, {
      $set: { lastLocation: { latitude: lat, longitude: lng, timestamp: ping.timestamp }, updatedAt: new Date().toISOString() }
    });

    // Resource model: return minimal acknowledgement (device doesn't need full resource)
    return successResponse(res, { pingId: ping._id, timestamp: ping.timestamp, receivedAt: ping.receivedAt }, null, 201);
  } catch (err) { next(err); }
};

// GET /api/v1/locations — police query with filters
const getLocations = async (req, res, next) => {
  try {
    const { from, to, vehicleId, provinceId, districtId, stationId } = req.query;
    const { page, limit, skip } = getPagination(req.query);

    let scopeProvinceId = provinceId;
    let scopeDistrictId  = districtId;
    if (req.user.role === 'PROVINCIAL' && req.user.provinceId) scopeProvinceId = req.user.provinceId;
    if (req.user.role === 'DISTRICT'   && req.user.districtId) scopeDistrictId  = req.user.districtId;

    const vehicleQuery = {};
    if (vehicleId)       vehicleQuery._id        = vehicleId;
    if (scopeProvinceId) vehicleQuery.provinceId = scopeProvinceId;
    if (scopeDistrictId)  vehicleQuery.districtId  = scopeDistrictId;
    if (stationId)       vehicleQuery.stationId  = stationId;

    let vehicleIds;
    if (Object.keys(vehicleQuery).length > 0) {
      const vehicles = await dbAsync.vehicles.find(vehicleQuery, { _id: 1 });
      vehicleIds = vehicles.map(v => v._id);
      if (!vehicleIds.length) return successResponse(res, [], paginationMeta(0, page, limit));
    }

    const locQuery = {};
    if (vehicleIds) locQuery.vehicleId = { $in: vehicleIds };
    if (from || to) {
      locQuery.timestamp = {};
      if (from) locQuery.timestamp.$gte = new Date(from).toISOString();
      if (to)   locQuery.timestamp.$lte = new Date(to).toISOString();
    }

    const all   = await dbAsync.locations.findWithSort(locQuery, { timestamp: -1 });
    const total = all.length;
    const paged = all.slice(skip, skip + limit);

    // Resource model: each ping becomes a full location resource
    const resources = await Promise.all(paged.map(async (ping) => {
      const vehicle = await dbAsync.vehicles.findOne({ _id: ping.vehicleId }, { registrationNumber: 1 });
      return toLocationResource(ping, vehicle);
    }));

    return successResponse(res, resources, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

// GET /api/v1/locations/live — latest ping per active vehicle (dashboard)
const getLiveView = async (req, res, next) => {
  try {
    const vehicleQuery = { status: 'ACTIVE' };
    if (req.query.provinceId) vehicleQuery.provinceId = req.query.provinceId;
    if (req.query.districtId)  vehicleQuery.districtId  = req.query.districtId;
    if (req.user.role === 'PROVINCIAL' && req.user.provinceId) vehicleQuery.provinceId = req.user.provinceId;
    if (req.user.role === 'DISTRICT'   && req.user.districtId) vehicleQuery.districtId  = req.user.districtId;

    const vehicles  = await dbAsync.vehicles.find(vehicleQuery);
    const liveItems = await Promise.all(vehicles.map(async (v) => {
      const lastPings = await dbAsync.locations.findWithSort({ vehicleId: v._id }, { timestamp: -1 }, 1);
      const driver    = v.driverId ? await dbAsync.drivers.findOne({ _id: v.driverId }, { fullName: 1 }) : null;
      if (!lastPings.length) return null;

      // Resource model: live view is a simplified representation
      return {
        vehicleId:          v._id,
        href:               `/api/v1/vehicles/${v._id}`,
        registrationNumber: v.registrationNumber,
        driver:             driver ? driver.fullName : null,
        location:           toLocationResource(lastPings[0], v),
      };
    }));

    const active = liveItems.filter(Boolean);
    return successResponse(res, active, { total: active.length, asOf: new Date().toISOString() });
  } catch (err) { next(err); }
};

module.exports = { pushLocation, getLocations, getLiveView };
