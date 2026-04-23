const { dbAsync } = require('../config/database');
const { successResponse, errorResponse, getPagination, paginationMeta, getSortOptions } = require('../middleware/response');
const { createVehicleEntity, buildVehicleUpdatePatch, VEHICLE_STATUS } = require('../models/vehicleModel');
const { toVehicleListItem, toVehicleDetail } = require('../resources/vehicleResource');
const { toLocationResource } = require('../resources/index');

const applyJurisdictionScope = (query, user) => {
  if (user.role === 'PROVINCIAL' && user.provinceId) query.provinceId = user.provinceId;
  if (user.role === 'DISTRICT'   && user.districtId) query.districtId  = user.districtId;
  return query;
};

const getVehicles = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.provinceId) query.provinceId = req.query.provinceId;
    if (req.query.districtId)  query.districtId  = req.query.districtId;
    if (req.query.stationId)   query.stationId   = req.query.stationId;
    if (req.query.status)      query.status       = req.query.status;
    if (req.query.driverId)    query.driverId     = req.query.driverId;
    applyJurisdictionScope(query, req.user);

    const { page, limit, skip } = getPagination(req.query);
    const sort = getSortOptions(req.query, ['registrationNumber', 'make', 'model', 'status', 'yearOfRegistration', 'createdAt'], 'registrationNumber', 1);
    const all   = await dbAsync.vehicles.findWithSort(query, sort);
    const total = all.length;
    const paged = all.slice(skip, skip + limit);

    const resources = await Promise.all(paged.map(async (vehicle) => {
      const [driver, district, province, lastPings] = await Promise.all([
        vehicle.driverId   ? dbAsync.drivers.findOne({ _id: vehicle.driverId })     : null,
        vehicle.districtId  ? dbAsync.districts.findOne({ _id: vehicle.districtId }) : null,
        vehicle.provinceId ? dbAsync.provinces.findOne({ _id: vehicle.provinceId }) : null,
        dbAsync.locations.findWithSort({ vehicleId: vehicle._id }, { timestamp: -1 }, 1),
      ]);
      return toVehicleListItem(vehicle, { driver, district, province, lastPing: lastPings[0] || null });
    }));

    return successResponse(res, resources, paginationMeta(total, page, limit));
  } catch (err) { next(err); }
};

const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await dbAsync.vehicles.findOne({ _id: req.params.id });
    if (!vehicle) return errorResponse(res, 404, 'Vehicle not found.');

    if (req.user.role === 'PROVINCIAL' && req.user.provinceId && vehicle.provinceId !== req.user.provinceId)
      return errorResponse(res, 403, 'Vehicle is outside your province.');
    if (req.user.role === 'DISTRICT' && req.user.districtId && vehicle.districtId !== req.user.districtId)
      return errorResponse(res, 403, 'Vehicle is outside your district.');

    const [driver, district, province, station, lastPings] = await Promise.all([
      vehicle.driverId   ? dbAsync.drivers.findOne({ _id: vehicle.driverId })     : null,
      vehicle.districtId  ? dbAsync.districts.findOne({ _id: vehicle.districtId }) : null,
      vehicle.provinceId ? dbAsync.provinces.findOne({ _id: vehicle.provinceId }) : null,
      vehicle.stationId  ? dbAsync.stations.findOne({ _id: vehicle.stationId })   : null,
      dbAsync.locations.findWithSort({ vehicleId: vehicle._id }, { timestamp: -1 }, 1),
    ]);

    return successResponse(res, toVehicleDetail(
      vehicle, { driver, district, province, station, lastPing: lastPings[0] || null }, req.user.role
    ));
  } catch (err) { next(err); }
};

const createVehicle = async (req, res, next) => {
  try {
    const entity  = createVehicleEntity({ ...req.body, createdBy: req.user.id });
    const created = await dbAsync.vehicles.insert(entity);
    return successResponse(res, toVehicleDetail(created, {}, req.user.role), null, 201);
  } catch (err) { next(err); }
};

const updateVehicle = async (req, res, next) => {
  try {
    const patch = buildVehicleUpdatePatch(req.body, req.user.id);
    const n     = await dbAsync.vehicles.update({ _id: req.params.id }, { $set: patch });
    if (!n) return errorResponse(res, 404, 'Vehicle not found.');
    const updated = await dbAsync.vehicles.findOne({ _id: req.params.id });
    return successResponse(res, toVehicleDetail(updated, {}, req.user.role));
  } catch (err) { next(err); }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const n = await dbAsync.vehicles.update(
      { _id: req.params.id },
      { $set: { status: VEHICLE_STATUS.DEREGISTERED, updatedAt: new Date().toISOString(), updatedBy: req.user.id } }
    );
    if (!n) return errorResponse(res, 404, 'Vehicle not found.');
    return res.status(204).send();
  } catch (err) { next(err); }
};

const getLastLocation = async (req, res, next) => {
  try {
    const vehicle = await dbAsync.vehicles.findOne({ _id: req.params.id });
    if (!vehicle) return errorResponse(res, 404, 'Vehicle not found.');
    const lastPings = await dbAsync.locations.findWithSort({ vehicleId: req.params.id }, { timestamp: -1 }, 1);
    if (!lastPings.length) return errorResponse(res, 404, 'No location data available for this vehicle.');
    return successResponse(res, {
      vehicle: { id: vehicle._id, registrationNumber: vehicle.registrationNumber, href: `/api/v1/vehicles/${vehicle._id}` },
      location: toLocationResource(lastPings[0], vehicle),
    });
  } catch (err) { next(err); }
};

const getLocationHistory = async (req, res, next) => {
  try {
    const vehicle = await dbAsync.vehicles.findOne({ _id: req.params.id });
    if (!vehicle) return errorResponse(res, 404, 'Vehicle not found.');

    const toDate   = req.query.to   ? new Date(req.query.to)   : new Date();
    const fromDate = req.query.from ? new Date(req.query.from) : new Date(toDate.getTime() - 86400000);

    if (isNaN(fromDate) || isNaN(toDate)) return errorResponse(res, 400, 'Invalid date format. Use ISO 8601.');
    if (fromDate >= toDate) return errorResponse(res, 400, 'from must be before to.');

    const maxPoints = Math.min(parseInt(req.query.limit) || 1000, 5000);
    const pings = await dbAsync.locations.findWithSort(
      { vehicleId: req.params.id, timestamp: { $gte: fromDate.toISOString(), $lte: toDate.toISOString() } },
      { timestamp: 1 }, maxPoints
    );

    return successResponse(res, {
      vehicle: { id: vehicle._id, registrationNumber: vehicle.registrationNumber, href: `/api/v1/vehicles/${vehicle._id}` },
      window:  { from: fromDate.toISOString(), to: toDate.toISOString() },
      count:   pings.length,
      history: pings.map(p => toLocationResource(p, vehicle)),
    });
  } catch (err) { next(err); }
};

module.exports = { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle, getLastLocation, getLocationHistory };
