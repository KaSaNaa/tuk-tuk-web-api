# Sri Lanka Police – Tuk-Tuk Tracking API

> **NB6007CEM Web API Development — Individual Coursework**
> Student ID: [YOUR_STUDENT_ID_HERE]

Real-Time Three-Wheeler (Tuk-Tuk) Tracking & Movement Logging System for Sri Lanka Law Enforcement.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Seed the database (9 provinces, 25 districts, 25 stations, 210 vehicles, 1-week history)
npm run seed

# 3. Start the API server
npm start

# 4. (Optional) Run GPS simulation
npm run simulate
```

API runs at: http://localhost:3000  
Swagger Docs: http://localhost:3000/api-docs

## 🔐 Default Credentials

| Role       | Username         | Password     |
|------------|------------------|--------------|
| ADMIN      | admin            | Admin@1234   |
| PROVINCIAL | wp_officer       | Admin@1234   |
| DISTRICT   | cmb_officer      | Admin@1234   |
| DEVICE     | device_dev-0001  | Device@5678  |

## 📡 Key Endpoints

| Method | Endpoint                          | Description                      |
|--------|-----------------------------------|----------------------------------|
| POST   | /api/v1/auth/login                | Login (get JWT)                  |
| GET    | /api/v1/vehicles/:id/location     | 🔴 Live last-known location       |
| GET    | /api/v1/vehicles/:id/history      | 📍 Movement log (time window)     |
| GET    | /api/v1/locations/live            | 🗺 Live dashboard (all vehicles)  |
| POST   | /api/v1/locations                 | 📡 GPS device push               |
| GET    | /api/v1/vehicles?provinceId=xxx   | Province-filtered vehicle list    |
| GET    | /api/v1/vehicles?districtId=xxx   | District-filtered vehicle list    |

## 🏛 System Architecture

```
GPS Device → POST /api/v1/locations (DEVICE token)
                        ↓
              [Location Store / NeDB]
                        ↓
Police Officer → GET /api/v1/vehicles/:id/location   (live)
              → GET /api/v1/vehicles/:id/history     (history)
              → GET /api/v1/locations/live           (dashboard)
```

## 🔑 Role-Based Access

| Role       | Scope              | Can Push Pings | Can View Vehicles |
|------------|--------------------|----------------|-------------------|
| ADMIN      | All                | Yes            | All               |
| PROVINCIAL | Own Province       | No             | Province          |
| DISTRICT   | Own District       | No             | District          |
| DEVICE     | Own Vehicle        | Yes (own only) | No                |

## 📁 Project Structure

```
src/
├── app.js                  — Express entry point
├── config/
│   ├── database.js         — NeDB async wrapper
│   └── swagger.js          — OpenAPI 3.0 spec
├── middleware/
│   ├── auth.js             — JWT + RBAC middleware
│   └── response.js         — Standard response helpers
├── controllers/
│   ├── authController.js
│   ├── geoController.js    — Provinces + Districts
│   ├── stationController.js
│   ├── vehicleController.js
│   ├── driverController.js
│   ├── locationController.js
│   └── userController.js
├── routes/
│   └── index.js
└── data/
    └── seed.js             — Seed script

scripts/
└── simulate.js             — GPS live simulation CLI
```

## 🌐 Live Deployment
- **API Service**: http://167.172.2.149/
- **Health Check**: http://167.172.2.149/api/v1/health

## 📚 Module

NB6007CEM – Web API Development  