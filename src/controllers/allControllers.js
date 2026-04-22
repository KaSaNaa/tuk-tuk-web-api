// ── GEO CONTROLLER (Provinces + Districts) ────────────────────────────────────
const { dbAsync } = require('../config/database');
const { successResponse, errorResponse, getPagination, paginationMeta, getSortOptions } = require('../middleware/response');
const { createProvinceEntity, createDistrictEntity, createStationEntity, buildStationUpdatePatch, createDriverEntity, buildDriverUpdatePatch } = require('../models/domainModels');
const { toProvinceResource, toDistrictResource, toStationListItem, toStationDetail, toDriverListItem, toDriverDetail, toUserResource } = require('../resources/index');
const bcrypt = require('bcryptjs');
const { buildUserUpdatePatch } = require('../models/domainModels');

// ═══════════════════════════ PROVINCES ════════════════════════════════════════

const getProvinces = async (req, res, next) => {
  try {
    const sort = getSortOptions(req.query, ['name', 'code', 'createdAt'], 'name', 1);
    const provinces = await dbAsync.provinces.findWithSort({}, sort);
    const resources = await Promise.all(provinces.map(async (p) => {
      const districtCount = await dbAsync.districts.count({ provinceId: p._id });
      return toProvinceResource(p, { districtCount });
    }));
    return successResponse(res, resources, { total: resources.length });
  } catch (err) { next(err); }
};

const getProvinceById = async (req, res, next) => {
  try {
    const province = await dbAsync.provinces.findOne({ _id: req.params.id });
    if (!province) return errorResponse(res, 404, 'Province not found.');
    const districts = await dbAsync.districts.findWithSort({ provinceId: province._id }, { name: 1 });
    return successResponse(res, toProvinceResource(province, { districts }));
  } catch (err) { next(err); }
};

const createProvince = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return errorResponse(res, 400, 'name and code are required.');
    const entity  = createProvinceEntity(req.body);
    const created = await dbAsync.provinces.insert(entity);
    return successResponse(res, toProvinceResource(created), null, 201);
  } catch (err) { next(err); }
};

const updateProvince = async (req, res, next) => {
  try {
    const { name, sinhaleName, tamilName } = req.body;
    const n = await dbAsync.provinces.update({ _id: req.params.id }, { $set: { name, sinhaleName, tamilName, updatedAt: new Date().toISOString() } });
    if (!n) return errorResponse(res, 404, 'Province not found.');
    return successResponse(res, toProvinceResource(await dbAsync.provinces.findOne({ _id: req.params.id })));
  } catch (err) { next(err); }
};

const deleteProvince = async (req, res, next) => {
  try {
    const count = await dbAsync.districts.count({ provinceId: req.params.id });
    if (count > 0) return errorResponse(res, 409, 'Cannot delete province with existing districts.');
    const n = await dbAsync.provinces.remove({ _id: req.params.id });
    if (!n) return errorResponse(res, 404, 'Province not found.');
    return res.status(204).send();
  } catch (err) { next(err); }
};

// ═══════════════════════════ DISTRICTS ════════════════════════════════════════

const getDistricts = async (req, res, next) => {
  try {
    const query = req.query.provinceId ? { provinceId: req.query.provinceId } : {};
    const sort = getSortOptions(req.query, ['name', 'code', 'createdAt'], 'name', 1);
    const districts = await dbAsync.districts.findWithSort(query, sort);
    const resources = await Promise.all(districts.map(async (d) => {
      const [province, stationCount] = await Promise.all([
        dbAsync.provinces.findOne({ _id: d.provinceId }),
        dbAsync.stations.count({ districtId: d._id }),
      ]);
      return toDistrictResource(d, { province, stationCount });
    }));
    return successResponse(res, resources, { total: resources.length });
  } catch (err) { next(err); }
};

const getDistrictById = async (req, res, next) => {
  try {
    const district = await dbAsync.districts.findOne({ _id: req.params.id });
    if (!district) return errorResponse(res, 404, 'District not found.');
    const [province, stations] = await Promise.all([
      dbAsync.provinces.findOne({ _id: district.provinceId }),
      dbAsync.stations.findWithSort({ districtId: district._id }, { name: 1 }),
    ]);
    return successResponse(res, toDistrictResource(district, { province, stations }));
  } catch (err) { next(err); }
};

const createDistrict = async (req, res, next) => {
  try {
    const { name, code, provinceId } = req.body;
    if (!name || !code || !provinceId) return errorResponse(res, 400, 'name, code, and provinceId are required.');
    if (!await dbAsync.provinces.findOne({ _id: provinceId })) return errorResponse(res, 404, 'Province not found.');
    const created = await dbAsync.districts.insert(createDistrictEntity(req.body));
    return successResponse(res, toDistrictResource(created), null, 201);
  } catch (err) { next(err); }
};

const updateDistrict = async (req, res, next) => {
  try {
    const { name, sinhaleName, tamilName } = req.body;
    const n = await dbAsync.districts.update({ _id: req.params.id }, { $set: { name, sinhaleName, tamilName, updatedAt: new Date().toISOString() } });
    if (!n) return errorResponse(res, 404, 'District not found.');
    const updated  = await dbAsync.districts.findOne({ _id: req.params.id });
    const province = await dbAsync.provinces.findOne({ _id: updated.provinceId });
    return successResponse(res, toDistrictResource(updated, { province }));
  } catch (err) { next(err); }
};

const deleteDistrict = async (req, res, next) => {
  try {
    if (await dbAsync.stations.count({ districtId: req.params.id }) > 0)
      return errorResponse(res, 409, 'Cannot delete district with existing stations.');
    const n = await dbAsync.districts.remove({ _id: req.params.id });
    if (!n) return errorResponse(res, 404, 'District not found.');
    return res.status(204).send();
  } catch (err) { next(err); }
};

// ═══════════════════════════ STATIONS ════════════════════════════════════════

const getStations = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.districtId)  query.districtId  = req.query.districtId;
    if (req.query.provinceId)  query.provinceId  = req.query.provinceId;
    if (req.query.type)        query.stationType = req.query.type;
    const { page, limit, skip } = getPagination(req.query);
    const all   = await dbAsync.stations.findWithSort(query, { name: 1 });
    const paged = all.slice(skip, skip + limit);
    const resources = await Promise.all(paged.map(async (s) => {
      const [district, province] = await Promise.all([
        dbAsync.districts.findOne({ _id: s.districtId }),
        dbAsync.provinces.findOne({ _id: s.provinceId }),
      ]);
      return toStationListItem(s, { district, province });
    }));
    return successResponse(res, resources, paginationMeta(all.length, page, limit));
  } catch (err) { next(err); }
};

const getStationById = async (req, res, next) => {
  try {
    const station = await dbAsync.stations.findOne({ _id: req.params.id });
    if (!station) return errorResponse(res, 404, 'Station not found.');
    const [district, province, vehicles] = await Promise.all([
      dbAsync.districts.findOne({ _id: station.districtId }),
      dbAsync.provinces.findOne({ _id: station.provinceId }),
      dbAsync.vehicles.findWithSort({ stationId: station._id }, { registrationNumber: 1 }, 20),
    ]);
    return successResponse(res, toStationDetail(station, { district, province, vehicles }));
  } catch (err) { next(err); }
};

const createStation = async (req, res, next) => {
  try {
    const { name, districtId, provinceId } = req.body;
    if (!name || !districtId || !provinceId) return errorResponse(res, 400, 'name, districtId, and provinceId are required.');
    if (!await dbAsync.districts.findOne({ _id: districtId })) return errorResponse(res, 404, 'District not found.');
    const created = await dbAsync.stations.insert(createStationEntity({ ...req.body, createdBy: req.user.id }));
    return successResponse(res, toStationListItem(created), null, 201);
  } catch (err) { next(err); }
};

const updateStation = async (req, res, next) => {
  try {
    const patch = buildStationUpdatePatch(req.body, req.user.id);
    const n     = await dbAsync.stations.update({ _id: req.params.id }, { $set: patch });
    if (!n) return errorResponse(res, 404, 'Station not found.');
    return successResponse(res, toStationListItem(await dbAsync.stations.findOne({ _id: req.params.id })));
  } catch (err) { next(err); }
};

const deleteStation = async (req, res, next) => {
  try {
    if (await dbAsync.vehicles.count({ stationId: req.params.id }) > 0)
      return errorResponse(res, 409, 'Cannot delete station with registered vehicles.');
    const n = await dbAsync.stations.remove({ _id: req.params.id });
    if (!n) return errorResponse(res, 404, 'Station not found.');
    return res.status(204).send();
  } catch (err) { next(err); }
};

// ═══════════════════════════ DRIVERS ════════════════════════════════════════

const getDrivers = async (req, res, next) => {
  try {
    const query = req.query.status ? { status: req.query.status } : {};
    const { page, limit, skip } = getPagination(req.query);
    const sort = getSortOptions(req.query, ['fullName', 'licenseNumber', 'status', 'createdAt'], 'fullName', 1);
    const all   = await dbAsync.drivers.findWithSort(query, sort);
    const paged = all.slice(skip, skip + limit).map(toDriverListItem);
    return successResponse(res, paged, paginationMeta(all.length, page, limit));
  } catch (err) { next(err); }
};

const getDriverById = async (req, res, next) => {
  try {
    const driver = await dbAsync.drivers.findOne({ _id: req.params.id });
    if (!driver) return errorResponse(res, 404, 'Driver not found.');
    const vehicles = await dbAsync.vehicles.findWithSort({ driverId: driver._id }, { registrationNumber: 1 });
    return successResponse(res, toDriverDetail(driver, vehicles, req.user.role));
  } catch (err) { next(err); }
};

const createDriver = async (req, res, next) => {
  try {
    const { fullName, licenseNumber, nicNumber } = req.body;
    if (!fullName || !licenseNumber || !nicNumber) return errorResponse(res, 400, 'fullName, licenseNumber, and nicNumber are required.');
    const created = await dbAsync.drivers.insert(createDriverEntity({ ...req.body, createdBy: req.user.id }));
    return successResponse(res, toDriverListItem(created), null, 201);
  } catch (err) { next(err); }
};

const updateDriver = async (req, res, next) => {
  try {
    const patch = buildDriverUpdatePatch(req.body, req.user.id);
    const n     = await dbAsync.drivers.update({ _id: req.params.id }, { $set: patch });
    if (!n) return errorResponse(res, 404, 'Driver not found.');
    return successResponse(res, toDriverListItem(await dbAsync.drivers.findOne({ _id: req.params.id })));
  } catch (err) { next(err); }
};

const deleteDriver = async (req, res, next) => {
  try {
    if (await dbAsync.vehicles.count({ driverId: req.params.id, status: 'ACTIVE' }) > 0)
      return errorResponse(res, 409, 'Cannot remove driver assigned to active vehicles.');
    const n = await dbAsync.drivers.remove({ _id: req.params.id });
    if (!n) return errorResponse(res, 404, 'Driver not found.');
    return res.status(204).send();
  } catch (err) { next(err); }
};

// ═══════════════════════════ USERS ════════════════════════════════════════

const getUsers = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.role)       query.role       = req.query.role;
    if (req.query.provinceId) query.provinceId = req.query.provinceId;
    const { page, limit, skip } = getPagination(req.query);
    const sort = getSortOptions(req.query, ['username', 'fullName', 'role', 'createdAt'], 'username', 1);
    const all   = await dbAsync.users.findWithSort(query, sort);
    const paged = all.slice(skip, skip + limit).map(toUserResource);
    return successResponse(res, paged, paginationMeta(all.length, page, limit));
  } catch (err) { next(err); }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await dbAsync.users.findOne({ _id: req.params.id });
    if (!user) return errorResponse(res, 404, 'User not found.');
    return successResponse(res, toUserResource(user));
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const patch = buildUserUpdatePatch(req.body, req.user.id);
    if (req.body.password) {
      if (req.body.password.length < 8) return errorResponse(res, 400, 'Password must be at least 8 characters.');
      patch.passwordHash = await bcrypt.hash(req.body.password, 12);
    }
    const n = await dbAsync.users.update({ _id: req.params.id }, { $set: patch });
    if (!n) return errorResponse(res, 404, 'User not found.');
    return successResponse(res, toUserResource(await dbAsync.users.findOne({ _id: req.params.id })));
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return errorResponse(res, 400, 'Cannot delete your own account.');
    const n = await dbAsync.users.remove({ _id: req.params.id });
    if (!n) return errorResponse(res, 404, 'User not found.');
    return res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = {
  getProvinces, getProvinceById, createProvince, updateProvince, deleteProvince,
  getDistricts, getDistrictById, createDistrict, updateDistrict, deleteDistrict,
  getStations,  getStationById,  createStation,  updateStation,  deleteStation,
  getDrivers,   getDriverById,   createDriver,   updateDriver,   deleteDriver,
  getUsers,     getUserById,     updateUser,     deleteUser,
};
