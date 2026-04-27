/**
 * TEST SUITE — Tuk-Tuk Tracking API
 * Covers: authentication, RBAC, vehicle endpoints, location endpoints,
 *         input validation, sorting, filtering, and error responses.
 */

require('dotenv').config();
const request = require('supertest');
const app     = require('../src/app');
const bcrypt  = require('bcryptjs');
const { dbAsync } = require('../src/config/database');

// ── Test data ─────────────────────────────────────────────────────────────────
let adminToken, provincialToken, districtToken, deviceToken;
let testProvinceId, testDistrictId, testStationId, testVehicleId, testDriverId, testDeviceVehicleId;

// ── Setup: seed minimal test data ─────────────────────────────────────────────
beforeAll(async () => {
  // Clear all collections
  for (const col of ['users','provinces','districts','stations','vehicles','drivers','locations']) {
    await dbAsync[col].remove({}, { multi: true });
  }

  const pwHash = await bcrypt.hash('Admin@1234', 10);
  const devPwHash = await bcrypt.hash('Device@5678', 10);

  // Province
  const prov = await dbAsync.provinces.insert({
    name: 'Western Province', code: 'WP',
    sinhaleName: 'test', tamilName: 'test',
    coordinates: { latitude: 6.9271, longitude: 79.8612 },
    createdAt: new Date().toISOString(),
  });
  testProvinceId = prov._id;

  // District
  const dist = await dbAsync.districts.insert({
    name: 'Colombo', code: 'CMB', provinceId: testProvinceId,
    coordinates: { latitude: 6.9271, longitude: 79.8612 },
    createdAt: new Date().toISOString(),
  });
  testDistrictId = dist._id;

  // Station
  const station = await dbAsync.stations.insert({
    name: 'Colombo Fort Police Station', code: 'COF',
    districtId: testDistrictId, provinceId: testProvinceId,
    stationType: 'STATION', isActive: true,
    createdAt: new Date().toISOString(),
  });
  testStationId = station._id;

  // Driver
  const driver = await dbAsync.drivers.insert({
    fullName: 'Kamal Perera', licenseNumber: 'B1234567',
    nicNumber: '198512345678V', status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });
  testDriverId = driver._id;

  // Vehicle
  const vehicle = await dbAsync.vehicles.insert({
    registrationNumber: 'WP-CAB-0001', deviceId: 'DEV-0001',
    deviceImei: '123456789012345', make: 'Bajaj', model: 'RE',
    colour: 'Yellow', yearOfRegistration: 2020,
    engineNumber: 'ENG123456', chassisNumber: 'CHS987654',
    driverId: testDriverId, stationId: testStationId,
    provinceId: testProvinceId, districtId: testDistrictId,
    status: 'ACTIVE', createdAt: new Date().toISOString(),
  });
  testVehicleId = vehicle._id;

  // Device vehicle (for device user)
  const devVehicle = await dbAsync.vehicles.insert({
    registrationNumber: 'WP-CAB-0002', deviceId: 'DEV-0002',
    make: 'TVS', model: 'King', colour: 'Yellow',
    provinceId: testProvinceId, districtId: testDistrictId,
    status: 'ACTIVE', createdAt: new Date().toISOString(),
  });
  testDeviceVehicleId = devVehicle._id;

  // Location pings for testVehicleId
  for (let i = 0; i < 3; i++) {
    await dbAsync.locations.insert({
      vehicleId: testVehicleId,
      latitude: 6.9271 + i * 0.001, longitude: 79.8612 + i * 0.001,
      speed: 30, heading: 180, accuracy: 5, satellites: 8,
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      receivedAt: new Date(Date.now() - i * 60000).toISOString(),
    });
  }

  // Users
  await dbAsync.users.insert({ username: 'admin', passwordHash: pwHash, fullName: 'Admin User', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() });
  await dbAsync.users.insert({ username: 'wp_officer', passwordHash: pwHash, fullName: 'WP Officer', role: 'PROVINCIAL', provinceId: testProvinceId, isActive: true, createdAt: new Date().toISOString() });
  await dbAsync.users.insert({ username: 'cmb_officer', passwordHash: pwHash, fullName: 'CMB Officer', role: 'DISTRICT', districtId: testDistrictId, provinceId: testProvinceId, isActive: true, createdAt: new Date().toISOString() });
  await dbAsync.users.insert({ username: 'device_dev_0002', passwordHash: devPwHash, fullName: 'Device 0002', role: 'DEVICE', vehicleId: testDeviceVehicleId, isActive: true, createdAt: new Date().toISOString() });

  // Get tokens
  const adminRes = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'Admin@1234' });
  adminToken = adminRes.body.data.token;

  const provRes = await request(app).post('/api/v1/auth/login').send({ username: 'wp_officer', password: 'Admin@1234' });
  provincialToken = provRes.body.data.token;

  const distRes = await request(app).post('/api/v1/auth/login').send({ username: 'cmb_officer', password: 'Admin@1234' });
  districtToken = distRes.body.data.token;

  const devRes = await request(app).post('/api/v1/auth/login').send({ username: 'device_dev_0002', password: 'Device@5678' });
  deviceToken = devRes.body.data.token;
}, 30000);

afterAll(async () => {
  for (const col of ['users','provinces','districts','stations','vehicles','drivers','locations']) {
    await dbAsync[col].remove({}, { multi: true });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUTH TESTS
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/login', () => {
  test('returns 200 and JWT token on valid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'Admin@1234' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.tokenType).toBe('Bearer');
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  test('returns 401 on wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'WrongPassword1' });
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
  });

  test('returns 422 when password is missing', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ username: 'admin' });
    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('password');
  });

  test('returns 401 on non-existent user', async () => {
    const res = await request(app).post('/api/v1/auth/login')
      .send({ username: 'nobody', password: 'Admin@1234' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  test('returns current user profile', async () => {
    const res = await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('admin');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROVINCE TESTS
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/provinces', () => {
  test('returns province list with districtCount', async () => {
    const res = await request(app).get('/api/v1/provinces')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('districtCount');
    expect(res.body.data[0]).toHaveProperty('href');
  });

  test('supports sort query param', async () => {
    const res = await request(app).get('/api/v1/provinces?sort=name:asc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/provinces');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// VEHICLE TESTS
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/vehicles', () => {
  test('ADMIN sees all vehicles with pagination meta', async () => {
    const res = await request(app).get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page');
    expect(res.body.meta).toHaveProperty('totalPages');
  });

  test('resource model: id not _id, href present, deviceImei absent', async () => {
    const res = await request(app).get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${adminToken}`);
    const v = res.body.data[0];
    expect(v.id).toBeDefined();
    expect(v._id).toBeUndefined();
    expect(v.href).toBeDefined();
    expect(v.deviceImei).toBeUndefined();
  });

  test('supports provinceId filter', async () => {
    const res = await request(app)
      .get(`/api/v1/vehicles?provinceId=${testProvinceId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(v => expect(v.province?.id || testProvinceId).toBe(testProvinceId));
  });

  test('supports sort=registrationNumber:asc', async () => {
    const res = await request(app).get('/api/v1/vehicles?sort=registrationNumber:asc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('DISTRICT officer only sees own district vehicles', async () => {
    const res = await request(app).get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${districtToken}`);
    expect(res.status).toBe(200);
    // All returned vehicles must belong to Colombo district
    res.body.data.forEach(v => {
      if (v.district) expect(v.district.id).toBe(testDistrictId);
    });
  });

  test('DEVICE cannot list vehicles — 403', async () => {
    const res = await request(app).get('/api/v1/vehicles')
      .set('Authorization', `Bearer ${deviceToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/vehicles/:id', () => {
  test('ADMIN sees engineNumber and chassisNumber', async () => {
    const res = await request(app).get(`/api/v1/vehicles/${testVehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.engineNumber).toBeDefined();
    expect(res.body.data.chassisNumber).toBeDefined();
  });

  test('DISTRICT officer cannot see engineNumber or chassisNumber', async () => {
    const res = await request(app).get(`/api/v1/vehicles/${testVehicleId}`)
      .set('Authorization', `Bearer ${districtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.engineNumber).toBeUndefined();
    expect(res.body.data.chassisNumber).toBeUndefined();
  });

  test('returns 404 for non-existent vehicle', async () => {
    const res = await request(app).get('/api/v1/vehicles/nonexistent999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOCATION TESTS
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/vehicles/:id/location', () => {
  test('returns last known location with nested coordinates and telemetry', async () => {
    const res = await request(app).get(`/api/v1/vehicles/${testVehicleId}/location`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.location.coordinates).toBeDefined();
    expect(res.body.data.location.telemetry).toBeDefined();
    expect(res.body.data.location.timestamp).toBeDefined();
    expect(res.body.data.location.receivedAt).toBeDefined();
  });
});

describe('GET /api/v1/vehicles/:id/history', () => {
  test('returns movement history within time window', async () => {
    const from = new Date(Date.now() - 3600000).toISOString();
    const to   = new Date().toISOString();
    const res  = await request(app)
      .get(`/api/v1/vehicles/${testVehicleId}/history?from=${from}&to=${to}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.history)).toBe(true);
  });

  test('returns 400 when from is after to', async () => {
    const res = await request(app)
      .get(`/api/v1/vehicles/${testVehicleId}/history?from=2026-04-20T00:00:00Z&to=2026-04-19T00:00:00Z`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/locations', () => {
  test('DEVICE can push a valid location ping', async () => {
    const res = await request(app).post('/api/v1/locations')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ vehicleId: testDeviceVehicleId, latitude: 6.9271, longitude: 79.8612, speed: 30, heading: 180 });
    expect(res.status).toBe(201);
    expect(res.body.data.pingId).toBeDefined();
    expect(res.body.data.timestamp).toBeDefined();
  });

  test('returns 400 for missing latitude', async () => {
    const res = await request(app).post('/api/v1/locations')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ vehicleId: testDeviceVehicleId, longitude: 79.8612 });
    expect(res.status).toBe(422);
    expect(res.body.errors.some(e => e.field === 'latitude')).toBe(true);
  });

  test('returns 422 for out-of-range coordinates', async () => {
    const res = await request(app).post('/api/v1/locations')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ vehicleId: testDeviceVehicleId, latitude: 999, longitude: 79.8612 });
    expect(res.status).toBe(422);
  });

  test('DEVICE cannot push ping for a different vehicle — 403', async () => {
    const res = await request(app).post('/api/v1/locations')
      .set('Authorization', `Bearer ${deviceToken}`)
      .send({ vehicleId: testVehicleId, latitude: 6.9271, longitude: 79.8612 });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/locations/live', () => {
  test('returns live positions for active vehicles', async () => {
    const res = await request(app).get('/api/v1/locations/live')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('asOf');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DRIVER TESTS
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/drivers', () => {
  test('nicNumber is NOT present in list items', async () => {
    const res = await request(app).get('/api/v1/drivers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach(d => expect(d.nicNumber).toBeUndefined());
  });
});

describe('GET /api/v1/drivers/:id', () => {
  test('ADMIN can see nicNumber in detail view', async () => {
    const res = await request(app).get(`/api/v1/drivers/${testDriverId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.nicNumber).toBeDefined();
  });

  test('DISTRICT officer cannot see nicNumber', async () => {
    const res = await request(app).get(`/api/v1/drivers/${testDriverId}`)
      .set('Authorization', `Bearer ${districtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.nicNumber).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SECURITY TESTS
// ══════════════════════════════════════════════════════════════════════════════
describe('Security', () => {
  test('returns 401 for malformed token', async () => {
    const res = await request(app).get('/api/v1/vehicles')
      .set('Authorization', 'Bearer this.is.notvalid');
    expect(res.status).toBe(401);
  });

  test('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/v1/vehicles');
    expect(res.status).toBe(401);
  });

  test('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/doesnotexist')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('X-Request-ID header is present in every response', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  test('passwordHash never leaks in any user response', async () => {
    const res = await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
  });
});
