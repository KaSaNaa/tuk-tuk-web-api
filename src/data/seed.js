require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { dbAsync } = require('../config/database');

// ── Sri Lanka: All 9 Provinces & 25 Districts ────────────────────────────────
const PROVINCES = [
  { name: 'Western Province',       code: 'WP', sinhaleName: 'බස්නාහිර පළාත',   tamilName: 'மேல் மாகாணம்',       lat: 6.9271,  lng: 79.8612 },
  { name: 'Central Province',       code: 'CP', sinhaleName: 'මධ්‍යම පළාත',       tamilName: 'மத்திய மாகாணம்',    lat: 7.2906,  lng: 80.6337 },
  { name: 'Southern Province',      code: 'SP', sinhaleName: 'දකුණු පළාත',       tamilName: 'தென் மாகாணம்',      lat: 6.0535,  lng: 80.2210 },
  { name: 'Northern Province',      code: 'NP', sinhaleName: 'උතුරු පළාත',       tamilName: 'வடக்கு மாகாணம்',   lat: 9.6615,  lng: 80.0255 },
  { name: 'Eastern Province',       code: 'EP', sinhaleName: 'නැගෙනහිර පළාත',    tamilName: 'கிழக்கு மாகாணம்',  lat: 7.8731,  lng: 81.6709 },
  { name: 'North Western Province', code: 'NW', sinhaleName: 'වයඹ පළාත',         tamilName: 'வடமேல் மாகாணம்',   lat: 7.9403,  lng: 80.0196 },
  { name: 'North Central Province', code: 'NC', sinhaleName: 'උතුරු මධ්‍යම පළාත', tamilName: 'வட மத்திய மாகாணம்', lat: 8.3456,  lng: 80.4069 },
  { name: 'Uva Province',           code: 'UV', sinhaleName: 'ඌව පළාත',          tamilName: 'ஊவா மாகாணம்',      lat: 6.9934,  lng: 81.0550 },
  { name: 'Sabaragamuwa Province',  code: 'SB', sinhaleName: 'සබරගමුව පළාත',    tamilName: 'சபரகமுவ மாகாணம்',  lat: 6.7351,  lng: 80.3643 },
];

const DISTRICTS_BY_PROVINCE = {
  WP: [
    { name: 'Colombo',        code: 'CMB', lat: 6.9271,  lng: 79.8612 },
    { name: 'Gampaha',        code: 'GMP', lat: 7.0873,  lng: 79.9994 },
    { name: 'Kalutara',       code: 'KLT', lat: 6.5854,  lng: 79.9607 },
  ],
  CP: [
    { name: 'Kandy',          code: 'KND', lat: 7.2906,  lng: 80.6337 },
    { name: 'Matale',         code: 'MTL', lat: 7.4675,  lng: 80.6234 },
    { name: 'Nuwara Eliya',   code: 'NWE', lat: 6.9497,  lng: 80.7891 },
  ],
  SP: [
    { name: 'Galle',          code: 'GLL', lat: 6.0535,  lng: 80.2210 },
    { name: 'Matara',         code: 'MAT', lat: 5.9549,  lng: 80.5550 },
    { name: 'Hambantota',     code: 'HBT', lat: 6.1241,  lng: 81.1185 },
  ],
  NP: [
    { name: 'Jaffna',         code: 'JFN', lat: 9.6615,  lng: 80.0255 },
    { name: 'Kilinochchi',    code: 'KLN', lat: 9.3803,  lng: 80.4037 },
    { name: 'Mannar',         code: 'MNR', lat: 8.9760,  lng: 79.9044 },
    { name: 'Vavuniya',       code: 'VVN', lat: 8.7514,  lng: 80.4971 },
    { name: 'Mullaitivu',     code: 'MLT', lat: 9.2671,  lng: 80.8122 },
  ],
  EP: [
    { name: 'Trincomalee',    code: 'TRC', lat: 8.5874,  lng: 81.2152 },
    { name: 'Batticaloa',     code: 'BTC', lat: 7.7170,  lng: 81.6924 },
    { name: 'Ampara',         code: 'AMP', lat: 7.2987,  lng: 81.6669 },
  ],
  NW: [
    { name: 'Kurunegala',     code: 'KRN', lat: 7.4818,  lng: 80.3609 },
    { name: 'Puttalam',       code: 'PTL', lat: 8.0362,  lng: 79.8283 },
  ],
  NC: [
    { name: 'Anuradhapura',   code: 'ADP', lat: 8.3456,  lng: 80.4069 },
    { name: 'Polonnaruwa',    code: 'PLN', lat: 7.9403,  lng: 81.0002 },
  ],
  UV: [
    { name: 'Badulla',        code: 'BDL', lat: 6.9934,  lng: 81.0550 },
    { name: 'Monaragala',     code: 'MRG', lat: 6.8728,  lng: 81.3507 },
  ],
  SB: [
    { name: 'Ratnapura',      code: 'RTP', lat: 6.6828,  lng: 80.3992 },
    { name: 'Kegalle',        code: 'KGL', lat: 7.2513,  lng: 80.3464 },
  ],
};

const STATIONS_DATA = [
  // Western - Colombo
  { name: 'Police Headquarters',          code: 'PHQ',  district: 'CMB', type: 'HEADQUARTERS', lat: 6.9187, lng: 79.8584, phone: '+94112421111' },
  { name: 'Colombo Fort Police Station',  code: 'COF',  district: 'CMB', type: 'STATION',       lat: 6.9337, lng: 79.8487, phone: '+94112326941' },
  { name: 'Wellawatte Police Station',    code: 'WLW',  district: 'CMB', type: 'STATION',       lat: 6.8774, lng: 79.8590, phone: '+94112502911' },
  { name: 'Nugegoda Police Station',      code: 'NGG',  district: 'CMB', type: 'STATION',       lat: 6.8721, lng: 79.8891, phone: '+94112853388' },
  { name: 'Dehiwala Police Station',      code: 'DHW',  district: 'CMB', type: 'STATION',       lat: 6.8521, lng: 79.8665, phone: '+94112718891' },
  // Western - Gampaha
  { name: 'Gampaha Police Station',       code: 'GMP',  district: 'GMP', type: 'DISTRICT',      lat: 7.0873, lng: 79.9994, phone: '+94332222222' },
  { name: 'Negombo Police Station',       code: 'NGM',  district: 'GMP', type: 'STATION',       lat: 7.2095, lng: 79.8380, phone: '+94312223133' },
  { name: 'Ja-Ela Police Station',        code: 'JEL',  district: 'GMP', type: 'STATION',       lat: 7.0734, lng: 79.8913, phone: '+94112225544' },
  // Western - Kalutara
  { name: 'Kalutara Police Station',      code: 'KLT',  district: 'KLT', type: 'DISTRICT',      lat: 6.5854, lng: 79.9607, phone: '+94342222411' },
  // Central - Kandy
  { name: 'Kandy Provincial Police',      code: 'KND',  district: 'KND', type: 'PROVINCIAL',    lat: 7.2906, lng: 80.6337, phone: '+94812222099' },
  { name: 'Kandy City Police Station',    code: 'KNC',  district: 'KND', type: 'STATION',       lat: 7.2938, lng: 80.6407, phone: '+94812234567' },
  { name: 'Peradeniya Police Station',    code: 'PRD',  district: 'KND', type: 'STATION',       lat: 7.2677, lng: 80.5963, phone: '+94812388901' },
  // Southern - Galle
  { name: 'Galle Provincial Police',      code: 'GLL',  district: 'GLL', type: 'PROVINCIAL',    lat: 6.0535, lng: 80.2210, phone: '+94912222099' },
  { name: 'Galle Fort Police Station',    code: 'GLF',  district: 'GLL', type: 'STATION',       lat: 6.0290, lng: 80.2168, phone: '+94912222733' },
  { name: 'Hikkaduwa Police Station',     code: 'HKD',  district: 'GLL', type: 'STATION',       lat: 6.1395, lng: 80.1059, phone: '+94912275511' },
  // Northern - Jaffna
  { name: 'Jaffna Provincial Police',     code: 'JFN',  district: 'JFN', type: 'PROVINCIAL',    lat: 9.6615, lng: 80.0255, phone: '+94212222099' },
  { name: 'Jaffna Central Police',        code: 'JFC',  district: 'JFN', type: 'STATION',       lat: 9.6690, lng: 80.0072, phone: '+94212222100' },
  // Eastern - Trincomalee
  { name: 'Trincomalee Police Station',   code: 'TRC',  district: 'TRC', type: 'DISTRICT',      lat: 8.5874, lng: 81.2152, phone: '+94262222099' },
  // North Western - Kurunegala
  { name: 'Kurunegala Provincial Police', code: 'KRN',  district: 'KRN', type: 'PROVINCIAL',    lat: 7.4818, lng: 80.3609, phone: '+94372222099' },
  { name: 'Kurunegala City Station',      code: 'KRC',  district: 'KRN', type: 'STATION',       lat: 7.4876, lng: 80.3621, phone: '+94372222100' },
  // North Central - Anuradhapura
  { name: 'Anuradhapura Police Station',  code: 'ADP',  district: 'ADP', type: 'DISTRICT',      lat: 8.3456, lng: 80.4069, phone: '+94252222099' },
  // Uva - Badulla
  { name: 'Badulla Police Station',       code: 'BDL',  district: 'BDL', type: 'DISTRICT',      lat: 6.9934, lng: 81.0550, phone: '+94552222099' },
  // Sabaragamuwa - Ratnapura
  { name: 'Ratnapura Provincial Police',  code: 'RTP',  district: 'RTP', type: 'PROVINCIAL',    lat: 6.6828, lng: 80.3992, phone: '+94452222099' },
  { name: 'Ratnapura City Station',       code: 'RTC',  district: 'RTP', type: 'STATION',       lat: 6.6850, lng: 80.4011, phone: '+94452222100' },
  // Matara
  { name: 'Matara Police Station',        code: 'MAT',  district: 'MAT', type: 'DISTRICT',      lat: 5.9549, lng: 80.5550, phone: '+94412222099' },
];

const VEHICLE_MAKES = ['Bajaj', 'TVS', 'Piaggio', 'Mahindra', 'Ape'];
const VEHICLE_MODELS = { Bajaj: ['RE', 'RE Compact'], TVS: ['King Deluxe', 'King'], Piaggio: ['Ape City'], Mahindra: ['Alfa Plus'], Ape: ['City'] };
const COLOURS = ['Yellow', 'Yellow & Black', 'Green', 'Blue'];

const DRIVER_FIRST = ['Kamal','Nimal','Sunil','Anil','Ranjith','Samantha','Priya','Kasun','Dinesh','Chamara','Ruwan','Thilak','Asanka','Manoj','Sanjeewa','Nuwan','Lahiru','Isuru','Dilan','Prasad','Gayan','Saman','Upul','Chathura','Namal','Hasith','Eranda','Janaka','Tharaka','Madush'];
const DRIVER_LAST  = ['Perera','Silva','Fernando','Dissanayake','Wickramasinghe','Jayasinghe','Rajapaksa','Bandara','Herath','Senanayake','Gunawardena','Kumarasinghe','Ranasinghe','Jayawardena','Wijesinghe','Nanayakkara','Seneviratne','Pathirana','Madushanka','Rathnayake'];

function rnd(a, b)     { return a + Math.random() * (b - a); }
function rndInt(a, b)  { return Math.floor(rnd(a, b + 1)); }
function pick(arr)     { return arr[rndInt(0, arr.length - 1)]; }
function padLeft(n, w) { return String(n).padStart(w, '0'); }

function generateNIC() {
  const year = rndInt(1970, 1999);
  const days = rndInt(1, 366);
  const serial = padLeft(rndInt(1000, 9999), 4);
  const check  = rndInt(0, 9);
  return `${year}${padLeft(days,3)}${serial}${check}V`;
}

function generateRegPlate(provinceCode, seq) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const alpha = pick(letters) + pick(letters) + pick(letters);
  return `${provinceCode} ${alpha}-${padLeft(seq, 4)}`;
}

// Simulate realistic movement around a centre point
function generateMovementLog(vehicleId, centreLat, centreLng, weekAgo) {
  const pings = [];
  const pingIntervalMs = 5 * 60 * 1000; // ping every 5 min
  const totalDays = 7;
  const now = new Date();

  for (let day = totalDays; day >= 0; day--) {
    const dayStart = new Date(weekAgo.getTime() + day * 24 * 60 * 60 * 1000);
    const isWorkingDay = dayStart.getDay() !== 0; // no sunday

    if (!isWorkingDay && Math.random() < 0.3) continue; // 30% chance off on sunday

    // Working hours: 6am - 10pm  + some night trips
    const startHour = rndInt(5, 8);
    const endHour   = rndInt(19, 22);
    const workStart = new Date(dayStart);
    workStart.setHours(startHour, rndInt(0, 59), 0, 0);
    const workEnd = new Date(dayStart);
    workEnd.setHours(endHour, rndInt(0, 59), 0, 0);

    let currentLat = centreLat + rnd(-0.03, 0.03);
    let currentLng = centreLng + rnd(-0.03, 0.03);
    let t = workStart.getTime();

    while (t <= workEnd.getTime() && t <= now.getTime()) {
      // Drift movement
      currentLat += rnd(-0.002, 0.002);
      currentLng += rnd(-0.002, 0.002);
      // Clamp to Sri Lanka bounds roughly
      currentLat = Math.max(5.9, Math.min(9.9, currentLat));
      currentLng = Math.max(79.5, Math.min(81.9, currentLng));

      pings.push({
        vehicleId,
        latitude:  parseFloat(currentLat.toFixed(6)),
        longitude: parseFloat(currentLng.toFixed(6)),
        speed:     parseFloat(rnd(0, 55).toFixed(1)),
        heading:   parseFloat(rnd(0, 360).toFixed(0)),
        accuracy:  parseFloat(rnd(3, 15).toFixed(1)),
        altitude:  parseFloat(rnd(2, 200).toFixed(0)),
        satellites: rndInt(5, 12),
        timestamp:  new Date(t).toISOString(),
        receivedAt: new Date(t + rndInt(100, 2000)).toISOString(),
      });

      t += pingIntervalMs + rndInt(-60000, 60000); // small jitter
    }
  }
  return pings;
}

async function clearAll() {
  console.log('   Clearing existing data...');
  for (const col of ['users','provinces','districts','stations','vehicles','drivers','locations']) {
    await dbAsync[col].remove({}, { multi: true });
  }
}

async function seed() {
  console.log('\n🌱 Seeding Sri Lanka Police Tuk-Tuk Tracking API...\n');
  await clearAll();

  // ── Provinces ──────────────────────────────────────────────────────────────
  console.log('   Seeding 9 provinces...');
  const provinceMap = {};
  for (const p of PROVINCES) {
    const doc = await dbAsync.provinces.insert({
      name: p.name, code: p.code, sinhaleName: p.sinhaleName, tamilName: p.tamilName,
      coordinates: { latitude: p.lat, longitude: p.lng },
      createdAt: new Date().toISOString(),
    });
    provinceMap[p.code] = doc;
  }

  // ── Districts ──────────────────────────────────────────────────────────────
  console.log('   Seeding 25 districts...');
  const districtMap = {};
  for (const [provCode, districts] of Object.entries(DISTRICTS_BY_PROVINCE)) {
    const province = provinceMap[provCode];
    for (const d of districts) {
      const doc = await dbAsync.districts.insert({
        name: d.name, code: d.code, provinceId: province._id,
        coordinates: { latitude: d.lat, longitude: d.lng },
        createdAt: new Date().toISOString(),
      });
      districtMap[d.code] = doc;
    }
  }

  // ── Stations ────────────────────────────────────────────────────────────────
  console.log('   Seeding 25 police stations...');
  const stationMap = {};
  for (const s of STATIONS_DATA) {
    const district = districtMap[s.district];
    const province = provinceMap[Object.entries(DISTRICTS_BY_PROVINCE).find(([,ds]) => ds.find(d => d.code === s.district))?.[0]];
    const doc = await dbAsync.stations.insert({
      name: s.name, code: s.code,
      districtId: district._id, provinceId: province._id,
      stationType: s.type,
      address: `${s.name}, ${district.name}, Sri Lanka`,
      contactNumber: s.phone,
      coordinates: { latitude: s.lat, longitude: s.lng },
      isActive: true,
      createdAt: new Date().toISOString(),
    });
    stationMap[s.code] = { ...doc, districtCode: s.district, provCode: Object.entries(DISTRICTS_BY_PROVINCE).find(([,ds]) => ds.find(d => d.code === s.district))?.[0] };
  }

  // ── Drivers (220) ──────────────────────────────────────────────────────────
  console.log('   Seeding 220 drivers...');
  const driverDocs = [];
  for (let i = 0; i < 220; i++) {
    const firstName = pick(DRIVER_FIRST);
    const lastName  = pick(DRIVER_LAST);
    const year      = rndInt(1970, 2000);
    const expYear   = rndInt(2025, 2028);
    const doc = await dbAsync.drivers.insert({
      fullName:      `${firstName} ${lastName}`,
      licenseNumber: `B${padLeft(rndInt(1000000, 9999999), 7)}`,
      licenseExpiry: `${expYear}-${padLeft(rndInt(1,12),2)}-${padLeft(rndInt(1,28),2)}`,
      nicNumber:     generateNIC(),
      dateOfBirth:   `${year}-${padLeft(rndInt(1,12),2)}-${padLeft(rndInt(1,28),2)}`,
      phoneNumber:   `+9477${rndInt(1000000,9999999)}`,
      address:       `No.${rndInt(1,250)}, ${pick(['Main Street','Temple Road','Lake Road','Station Road'])}, ${pick(Object.values(districtMap)).name}`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
    driverDocs.push(doc);
  }

  // ── Vehicles (210) ─────────────────────────────────────────────────────────
  console.log('   Seeding 210 tuk-tuks...');
  const vehicleDocs = [];
  const stationList = Object.values(stationMap);
  let driverIdx = 0;

  for (let i = 1; i <= 210; i++) {
    const station    = pick(stationList);
    const district   = districtMap[station.districtCode];
    const province   = provinceMap[station.provCode];
    const make       = pick(VEHICLE_MAKES);
    const models     = VEHICLE_MODELS[make];
    const driver     = driverDocs[driverIdx++ % driverDocs.length];

    const doc = await dbAsync.vehicles.insert({
      registrationNumber: generateRegPlate(province.code, i),
      deviceId:   `DEV-${padLeft(i, 4)}`,
      deviceImei: `${rndInt(100000000000000, 999999999999999)}`,
      make,
      model:      pick(models),
      colour:     pick(COLOURS),
      yearOfRegistration: rndInt(2012, 2023),
      engineNumber:  `ENG${padLeft(rndInt(100000,999999),6)}`,
      chassisNumber: `CHS${padLeft(rndInt(100000000,999999999),9)}`,
      driverId:    driver._id,
      stationId:   station._id,
      provinceId:  province._id,
      districtId:  district._id,
      status:      Math.random() < 0.9 ? 'ACTIVE' : (Math.random() < 0.5 ? 'SUSPENDED' : 'ACTIVE'),
      createdAt:   new Date().toISOString(),
    });
    vehicleDocs.push({ ...doc, centreLat: district.coordinates.latitude, centreLng: district.coordinates.longitude });
  }

  // ── Location history (1 week) ──────────────────────────────────────────────
  console.log('   Generating 1-week location history for 210 vehicles (this takes ~30s)...');
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let totalPings = 0;

  for (const vehicle of vehicleDocs.filter(v => v.status === 'ACTIVE')) {
    const pings = generateMovementLog(vehicle._id, vehicle.centreLat, vehicle.centreLng, weekAgo);
    // Batch insert
    for (const ping of pings) {
      await dbAsync.locations.insert(ping);
    }
    totalPings += pings.length;

    // Update vehicle last known location
    if (pings.length > 0) {
      const last = pings[pings.length - 1];
      await dbAsync.vehicles.update({ _id: vehicle._id }, { $set: { lastLocation: { latitude: last.latitude, longitude: last.longitude, timestamp: last.timestamp } } });
    }
  }
  console.log(`   ✓ ${totalPings.toLocaleString()} location pings inserted.`);

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('   Seeding system users...');
  const pwHash = await bcrypt.hash('Admin@1234', 12);
  const devPwHash = await bcrypt.hash('Device@5678', 12);

  await dbAsync.users.insert({ username: 'admin', passwordHash: pwHash, fullName: 'System Administrator', role: 'ADMIN', badgeNumber: 'HQ-001', isActive: true, createdAt: new Date().toISOString(), lastLogin: null });
  await dbAsync.users.insert({ username: 'wp_officer', passwordHash: pwHash, fullName: 'WP Provincial Officer', role: 'PROVINCIAL', badgeNumber: 'WP-001', provinceId: provinceMap['WP']._id, isActive: true, createdAt: new Date().toISOString(), lastLogin: null });
  await dbAsync.users.insert({ username: 'cmb_officer', passwordHash: pwHash, fullName: 'Colombo District Officer', role: 'DISTRICT', badgeNumber: 'CMB-001', provinceId: provinceMap['WP']._id, districtId: districtMap['CMB']._id, isActive: true, createdAt: new Date().toISOString(), lastLogin: null });
  await dbAsync.users.insert({ username: 'np_officer', passwordHash: pwHash, fullName: 'Northern Province Officer', role: 'PROVINCIAL', badgeNumber: 'NP-001', provinceId: provinceMap['NP']._id, isActive: true, createdAt: new Date().toISOString(), lastLogin: null });

  // Create device users for first 5 vehicles
  for (let i = 0; i < 5; i++) {
    const v = vehicleDocs[i];
    await dbAsync.users.insert({
      username: `device_${v.deviceId.toLowerCase()}`,
      passwordHash: devPwHash,
      fullName: `Device ${v.deviceId}`,
      role: 'DEVICE',
      vehicleId: v._id,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    });
  }

  console.log('\n✅ Seed complete!\n');
  console.log('   Default credentials:');
  console.log('   ┌─────────────────────────────────────────────────────────┐');
  console.log('   │  Role          Username        Password                 │');
  console.log('   │  ADMIN         admin           Admin@1234               │');
  console.log('   │  PROVINCIAL    wp_officer      Admin@1234               │');
  console.log('   │  DISTRICT      cmb_officer     Admin@1234               │');
  console.log('   │  PROVINCIAL    np_officer      Admin@1234               │');
  console.log('   │  DEVICE        device_dev-0001 Device@5678              │');
  console.log('   └─────────────────────────────────────────────────────────┘\n');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
