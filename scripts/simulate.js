#!/usr/bin/env node
/**
 * Tuk-Tuk Location Simulation Script
 * Logs in as a DEVICE user and pushes periodic GPS pings to the API.
 * Usage:  node scripts/simulate.js [baseUrl] [username] [password] [vehicleId]
 *
 * Example:
 *   node scripts/simulate.js http://localhost:3000 device_dev-0001 Device@5678 <vehicleId>
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const USERNAME = process.argv[3] || 'device_dev-0001';
const PASSWORD = process.argv[4] || 'Device@5678';
let   VEHICLE_ID = process.argv[5] || null; // resolved from /auth/me if not provided
const INTERVAL_MS = parseInt(process.argv[6]) || 10000; // ping every 10s

let token       = null;
let lat         = 6.9271;   // Start: Colombo
let lng         = 79.8612;
let heading     = Math.random() * 360;
let tripCount   = 0;

async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}/api/v1${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  return resp.json();
}

async function login() {
  console.log(`🔐 Logging in as ${USERNAME}...`);
  const result = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!result.data?.token) throw new Error(`Login failed: ${result.message}`);
  token     = result.data.token;
  const user = result.data.user;
  if (!VEHICLE_ID) VEHICLE_ID = user.vehicleId;
  if (!VEHICLE_ID) throw new Error('No vehicleId found. Pass vehicleId as 5th argument.');
  console.log(`✅ Logged in. Role: ${user.role} | Vehicle: ${VEHICLE_ID}`);
}

function moveVehicle() {
  // Slightly random movement, biasing toward current heading
  const turnDegrees = (Math.random() - 0.5) * 40; // ±20 degrees turn
  heading = (heading + turnDegrees + 360) % 360;
  const speed = 15 + Math.random() * 40; // 15-55 km/h
  const distPerPing = (speed / 3600) * (INTERVAL_MS / 1000) * 0.01; // rough lat/lng degrees

  lat += Math.cos((heading * Math.PI) / 180) * distPerPing;
  lng += Math.sin((heading * Math.PI) / 180) * distPerPing;

  // Bounce back if leaving Sri Lanka rough bounds
  if (lat < 5.9 || lat > 9.9) { heading = (heading + 180) % 360; lat = Math.max(5.9, Math.min(9.9, lat)); }
  if (lng < 79.5 || lng > 81.9) { heading = (heading + 180) % 360; lng = Math.max(79.5, Math.min(81.9, lng)); }

  return { speed: parseFloat(speed.toFixed(1)), heading: parseFloat(heading.toFixed(0)) };
}

async function sendPing() {
  const { speed, heading: h } = moveVehicle();
  tripCount++;

  const body = {
    vehicleId: VEHICLE_ID,
    latitude:  parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
    speed,
    heading:   h,
    accuracy:  parseFloat((3 + Math.random() * 10).toFixed(1)),
    altitude:  parseFloat((5 + Math.random() * 100).toFixed(0)),
    satellites: Math.floor(6 + Math.random() * 6),
  };

  try {
    const result = await apiFetch('/locations', { method: 'POST', body: JSON.stringify(body) });
    if (result.status === 'success') {
      console.log(`📍 [Ping #${tripCount}] ${new Date().toLocaleTimeString()} | lat:${body.latitude} lng:${body.longitude} | speed:${speed}km/h | heading:${h}°`);
    } else {
      console.error(`❌ Ping failed: ${result.message}`);
      if (result.code === 401) { token = null; await login(); }
    }
  } catch (err) {
    console.error(`❌ Network error: ${err.message}`);
  }
}

async function run() {
  console.log('\n🚗 Tuk-Tuk GPS Simulator');
  console.log(`   API     : ${BASE_URL}`);
  console.log(`   Interval: ${INTERVAL_MS / 1000}s\n`);

  await login();
  await sendPing(); // First ping immediately

  const intervalId = setInterval(sendPing, INTERVAL_MS);
  process.on('SIGINT', () => {
    console.log(`\n🛑 Simulator stopped. Total pings sent: ${tripCount}`);
    clearInterval(intervalId);
    process.exit(0);
  });
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
