const express = require('express');
const router  = express.Router();
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const V = require('../validators/index');

const authCtrl  = require('../controllers/authController');
const vehicleCtrl = require('../controllers/vehicleController');
const locationCtrl = require('../controllers/locationController');
const {
  getProvinces, getProvinceById, createProvince, updateProvince, deleteProvince,
  getDistricts, getDistrictById, createDistrict, updateDistrict, deleteDistrict,
  getStations,  getStationById,  createStation,  updateStation,  deleteStation,
  getDrivers,   getDriverById,   createDriver,   updateDriver,   deleteDriver,
  getUsers,     getUserById,     updateUser,     deleteUser,
} = require('../controllers/allControllers');

const ADMIN_PROV  = [ROLES.ADMIN, ROLES.PROVINCIAL];
const ALL_OFFICERS = [ROLES.ADMIN, ROLES.PROVINCIAL, ROLES.DISTRICT];

// ── HEALTH ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({
  status: 'ok', service: 'Tuk-Tuk Tracking API', version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// ── AUTH ──────────────────────────────────────────────────────────────────────
router.post('/auth/login',    V.validateLogin,    authCtrl.login);
router.post('/auth/register', authenticate, authorize(ROLES.ADMIN), V.validateRegister, authCtrl.register);
router.get ('/auth/me',       authenticate, authCtrl.me);

// ── PROVINCES ─────────────────────────────────────────────────────────────────
router.get   ('/provinces',     authenticate, authorize(...ALL_OFFICERS, ROLES.DEVICE), V.validatePaginationQuery, getProvinces);
router.post  ('/provinces',     authenticate, authorize(ROLES.ADMIN), V.validateCreateProvince, createProvince);
router.get   ('/provinces/:id', authenticate, authorize(...ALL_OFFICERS), getProvinceById);
router.patch ('/provinces/:id', authenticate, authorize(ROLES.ADMIN), updateProvince);
router.delete('/provinces/:id', authenticate, authorize(ROLES.ADMIN), deleteProvince);

// ── DISTRICTS ─────────────────────────────────────────────────────────────────
router.get   ('/districts',     authenticate, authorize(...ALL_OFFICERS), V.validatePaginationQuery, getDistricts);
router.post  ('/districts',     authenticate, authorize(ROLES.ADMIN), V.validateCreateDistrict, createDistrict);
router.get   ('/districts/:id', authenticate, authorize(...ALL_OFFICERS), getDistrictById);
router.patch ('/districts/:id', authenticate, authorize(ROLES.ADMIN), updateDistrict);
router.delete('/districts/:id', authenticate, authorize(ROLES.ADMIN), deleteDistrict);

// ── STATIONS ──────────────────────────────────────────────────────────────────
router.get   ('/stations',     authenticate, authorize(...ALL_OFFICERS), V.validatePaginationQuery, getStations);
router.post  ('/stations',     authenticate, authorize(...ADMIN_PROV),  V.validateCreateStation,   createStation);
router.get   ('/stations/:id', authenticate, authorize(...ALL_OFFICERS), getStationById);
router.patch ('/stations/:id', authenticate, authorize(...ADMIN_PROV),  updateStation);
router.delete('/stations/:id', authenticate, authorize(ROLES.ADMIN),   deleteStation);

// ── VEHICLES ──────────────────────────────────────────────────────────────────
router.get   ('/vehicles',              authenticate, authorize(...ALL_OFFICERS), V.validatePaginationQuery, vehicleCtrl.getVehicles);
router.post  ('/vehicles',              authenticate, authorize(...ADMIN_PROV),  V.validateCreateVehicle,   vehicleCtrl.createVehicle);
router.get   ('/vehicles/:id',          authenticate, authorize(...ALL_OFFICERS), vehicleCtrl.getVehicleById);
router.patch ('/vehicles/:id',          authenticate, authorize(...ADMIN_PROV),  V.validateUpdateVehicle,   vehicleCtrl.updateVehicle);
router.delete('/vehicles/:id',          authenticate, authorize(ROLES.ADMIN),   vehicleCtrl.deleteVehicle);
router.get   ('/vehicles/:id/location', authenticate, authorize(...ALL_OFFICERS), vehicleCtrl.getLastLocation);
router.get   ('/vehicles/:id/history',  authenticate, authorize(...ALL_OFFICERS), V.validateHistoryQuery, vehicleCtrl.getLocationHistory);

// ── LOCATIONS ─────────────────────────────────────────────────────────────────
// Note: live must come BEFORE :id to avoid Express treating "live" as an ID
router.get ('/locations/live', authenticate, authorize(...ALL_OFFICERS), locationCtrl.getLiveView);
router.post('/locations',      authenticate, authorize(ROLES.DEVICE, ...ALL_OFFICERS), V.validatePushLocation, locationCtrl.pushLocation);
router.get ('/locations',      authenticate, authorize(...ALL_OFFICERS), V.validatePaginationQuery, locationCtrl.getLocations);

// ── DRIVERS ───────────────────────────────────────────────────────────────────
router.get   ('/drivers',     authenticate, authorize(...ALL_OFFICERS), V.validatePaginationQuery, getDrivers);
router.post  ('/drivers',     authenticate, authorize(...ADMIN_PROV),  V.validateCreateDriver,    createDriver);
router.get   ('/drivers/:id', authenticate, authorize(...ALL_OFFICERS), getDriverById);
router.patch ('/drivers/:id', authenticate, authorize(...ADMIN_PROV),  updateDriver);
router.delete('/drivers/:id', authenticate, authorize(ROLES.ADMIN),   deleteDriver);

// ── USERS ─────────────────────────────────────────────────────────────────────
router.get   ('/users',     authenticate, authorize(ROLES.ADMIN), V.validatePaginationQuery, getUsers);
router.get   ('/users/:id', authenticate, authorize(ROLES.ADMIN), getUserById);
router.patch ('/users/:id', authenticate, authorize(ROLES.ADMIN), updateUser);
router.delete('/users/:id', authenticate, authorize(ROLES.ADMIN), deleteUser);

module.exports = router;
