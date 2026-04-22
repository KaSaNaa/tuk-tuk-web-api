const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Sri Lanka Police – Tuk-Tuk Tracking API',
      version: '1.0.0',
      description: `
## Real-Time Three-Wheeler (Tuk-Tuk) Tracking & Movement Logging System

A centralized RESTful API for Sri Lanka Police to monitor registered three-wheelers in real time,
support investigations through historical movement logs, and provide province/district-filtered 
operational visibility.

### User Roles
| Role | Description |
|------|-------------|
| **ADMIN** | HQ / Central administrator — full system access |
| **PROVINCIAL** | Provincial control officer — scoped to their province |
| **DISTRICT** | District / Station officer — scoped to their district |
| **DEVICE** | GPS tracking device — may only push location pings |

### Authentication
All endpoints (except \`/auth/login\`) require a **Bearer JWT token** in the \`Authorization\` header.
      `,
      contact: { name: 'Sri Lanka Police ICT Division', email: 'ict@police.lk' },
      license: { name: 'Government of Sri Lanka' },
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Local Development' },
      { url: 'https://tuk-track-api.onrender.com/api/v1', description: 'Production (Render)' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from POST /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status:  { type: 'string', example: 'error' },
            code:    { type: 'integer', example: 400 },
            message: { type: 'string',  example: 'Validation error description' },
          },
        },
        Province: {
          type: 'object',
          properties: {
            _id:          { type: 'string' },
            name:         { type: 'string', example: 'Western Province' },
            code:         { type: 'string', example: 'WP' },
            sinhaleName:  { type: 'string', example: 'බස්නාහිර පළාත' },
            tamilName:    { type: 'string', example: 'மேல் மாகாணம்' },
            districtCount:{ type: 'integer' },
            createdAt:    { type: 'string', format: 'date-time' },
          },
        },
        District: {
          type: 'object',
          properties: {
            _id:        { type: 'string' },
            name:       { type: 'string', example: 'Colombo' },
            code:       { type: 'string', example: 'CMB' },
            provinceId: { type: 'string' },
            createdAt:  { type: 'string', format: 'date-time' },
          },
        },
        Station: {
          type: 'object',
          properties: {
            _id:          { type: 'string' },
            name:         { type: 'string', example: 'Colombo Fort Police Station' },
            code:         { type: 'string', example: 'COF' },
            districtId:   { type: 'string' },
            provinceId:   { type: 'string' },
            stationType:  { type: 'string', enum: ['HEADQUARTERS','PROVINCIAL','DISTRICT','STATION'] },
            address:      { type: 'string' },
            contactNumber:{ type: 'string' },
            coordinates:  { type: 'object', properties: { latitude: { type: 'number' }, longitude: { type: 'number' } } },
            isActive:     { type: 'boolean' },
          },
        },
        Vehicle: {
          type: 'object',
          properties: {
            _id:                { type: 'string' },
            registrationNumber: { type: 'string', example: 'WP CAB-1234' },
            deviceId:           { type: 'string', example: 'DEV-001' },
            make:               { type: 'string', example: 'Bajaj' },
            model:              { type: 'string', example: 'RE' },
            colour:             { type: 'string', example: 'Yellow' },
            driverId:           { type: 'string' },
            stationId:          { type: 'string' },
            provinceId:         { type: 'string' },
            districtId:         { type: 'string' },
            status:             { type: 'string', enum: ['ACTIVE','SUSPENDED','DEREGISTERED'] },
            lastLocation: {
              type: 'object',
              properties: {
                latitude:  { type: 'number' },
                longitude: { type: 'number' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        LocationPing: {
          type: 'object',
          properties: {
            _id:       { type: 'string' },
            vehicleId: { type: 'string' },
            latitude:  { type: 'number', example: 6.9271 },
            longitude: { type: 'number', example: 79.8612 },
            speed:     { type: 'number', example: 24.5, description: 'Speed in km/h' },
            heading:   { type: 'number', example: 180, description: 'Heading in degrees (0-360)' },
            accuracy:  { type: 'number', example: 5.0, description: 'GPS accuracy in metres' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Driver: {
          type: 'object',
          properties: {
            _id:           { type: 'string' },
            fullName:      { type: 'string', example: 'Kamal Perera' },
            licenseNumber: { type: 'string', example: 'B1234567' },
            licenseExpiry: { type: 'string', format: 'date' },
            nicNumber:     { type: 'string', example: '198512345678' },
            phoneNumber:   { type: 'string', example: '+94771234567' },
            status:        { type: 'string', enum: ['ACTIVE','SUSPENDED','REVOKED'] },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth',      description: 'Authentication and user identity' },
      { name: 'Provinces', description: 'Province master data management' },
      { name: 'Districts', description: 'District master data management' },
      { name: 'Stations',  description: 'Police station management' },
      { name: 'Vehicles',  description: 'Tuk-tuk vehicle registry and location' },
      { name: 'Drivers',   description: 'Driver / operator management' },
      { name: 'Locations', description: 'GPS location pings — push and query' },
      { name: 'Users',     description: 'System user management (ADMIN only)' },
    ],
    paths: {
      '/health': { get: { tags: ['Auth'], summary: 'Health check', security: [], responses: { 200: { description: 'API is running' } } } },
      '/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Login', security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username','password'], properties: { username: { type: 'string' }, password: { type: 'string' } } } } } },
          responses: { 200: { description: 'Returns JWT token' }, 401: { description: 'Invalid credentials' } },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register user (ADMIN only)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username','password','role'], properties: { username: { type: 'string' }, password: { type: 'string', minLength: 8 }, fullName: { type: 'string' }, role: { type: 'string', enum: ['ADMIN','PROVINCIAL','DISTRICT','DEVICE'] }, badgeNumber: { type: 'string' }, provinceId: { type: 'string' }, districtId: { type: 'string' }, stationId: { type: 'string' }, vehicleId: { type: 'string' } } } } } },
          responses: { 201: { description: 'User created' }, 409: { description: 'Username taken' } },
        },
      },
      '/auth/me': { get: { tags: ['Auth'], summary: 'Get current user profile', responses: { 200: { description: 'Current user' } } } },
      '/provinces': {
        get:  { tags: ['Provinces'], summary: 'List all 9 provinces', responses: { 200: { description: 'Province list' } } },
        post: { tags: ['Provinces'], summary: 'Create province (ADMIN)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name','code'], properties: { name: { type: 'string' }, code: { type: 'string' }, sinhaleName: { type: 'string' }, tamilName: { type: 'string' } } } } } }, responses: { 201: { description: 'Created' } } },
      },
      '/provinces/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get:    { tags: ['Provinces'], summary: 'Get province with districts', responses: { 200: { description: 'Province detail' }, 404: { description: 'Not found' } } },
        patch:  { tags: ['Provinces'], summary: 'Update province (ADMIN)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Provinces'], summary: 'Delete province (ADMIN)', responses: { 204: { description: 'Deleted' }, 409: { description: 'Has districts' } } },
      },
      '/districts': {
        get:  { tags: ['Districts'], summary: 'List all 25 districts', parameters: [{ name: 'provinceId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'District list' } } },
        post: { tags: ['Districts'], summary: 'Create district (ADMIN)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name','code','provinceId'], properties: { name: { type: 'string' }, code: { type: 'string' }, provinceId: { type: 'string' } } } } } }, responses: { 201: { description: 'Created' } } },
      },
      '/districts/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get:    { tags: ['Districts'], summary: 'Get district with stations', responses: { 200: { description: 'District detail' }, 404: { description: 'Not found' } } },
        patch:  { tags: ['Districts'], summary: 'Update district (ADMIN)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Districts'], summary: 'Delete district (ADMIN)', responses: { 204: { description: 'Deleted' } } },
      },
      '/stations': {
        get:  { tags: ['Stations'], summary: 'List police stations', parameters: [{ name: 'districtId', in: 'query', schema: { type: 'string' } }, { name: 'provinceId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Station list' } } },
        post: { tags: ['Stations'], summary: 'Create station (ADMIN/PROVINCIAL)', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Station' } } } }, responses: { 201: { description: 'Created' } } },
      },
      '/stations/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get:    { tags: ['Stations'], summary: 'Get station detail', responses: { 200: { description: 'Station' }, 404: { description: 'Not found' } } },
        patch:  { tags: ['Stations'], summary: 'Update station', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Stations'], summary: 'Delete station (ADMIN)', responses: { 204: { description: 'Deleted' } } },
      },
      '/vehicles': {
        get:  { tags: ['Vehicles'], summary: 'List tuk-tuks with last location', parameters: [{ name: 'provinceId', in: 'query', schema: { type: 'string' } }, { name: 'districtId', in: 'query', schema: { type: 'string' } }, { name: 'stationId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string', enum: ['ACTIVE','SUSPENDED','DEREGISTERED'] } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Vehicle list with pagination' } } },
        post: { tags: ['Vehicles'], summary: 'Register new tuk-tuk', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Vehicle' } } } }, responses: { 201: { description: 'Vehicle registered' } } },
      },
      '/vehicles/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get:    { tags: ['Vehicles'], summary: 'Get vehicle detail with last location', responses: { 200: { description: 'Vehicle' }, 404: { description: 'Not found' } } },
        patch:  { tags: ['Vehicles'], summary: 'Update vehicle', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Vehicles'], summary: 'Deregister vehicle (ADMIN)', responses: { 204: { description: 'Deregistered' } } },
      },
      '/vehicles/{id}/location': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: { tags: ['Vehicles'], summary: '🔴 LIVE: Get last known location of a tuk-tuk', responses: { 200: { description: 'Last GPS ping' }, 404: { description: 'No location data' } } },
      },
      '/vehicles/{id}/history': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: { tags: ['Vehicles'], summary: '📍 HISTORY: Movement log for a vehicle (time-window)', parameters: [{ name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Start of time window (ISO 8601)' }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'End of time window (ISO 8601)' }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 1000 } }], responses: { 200: { description: 'Movement history array' } } },
      },
      '/drivers': {
        get:  { tags: ['Drivers'], summary: 'List drivers', responses: { 200: { description: 'Driver list' } } },
        post: { tags: ['Drivers'], summary: 'Register driver', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Driver' } } } }, responses: { 201: { description: 'Driver registered' } } },
      },
      '/drivers/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get:    { tags: ['Drivers'], summary: 'Get driver detail', responses: { 200: { description: 'Driver' } } },
        patch:  { tags: ['Drivers'], summary: 'Update driver', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Drivers'], summary: 'Remove driver (ADMIN)', responses: { 204: { description: 'Removed' } } },
      },
      '/locations': {
        post: { tags: ['Locations'], summary: '📡 Device: Push GPS ping', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vehicleId','latitude','longitude'], properties: { vehicleId: { type: 'string' }, latitude: { type: 'number' }, longitude: { type: 'number' }, speed: { type: 'number' }, heading: { type: 'number' }, accuracy: { type: 'number' }, altitude: { type: 'number' }, satellites: { type: 'integer' } } } } } }, responses: { 201: { description: 'Ping recorded' }, 403: { description: 'Vehicle inactive or device not authorized' } } },
        get:  { tags: ['Locations'], summary: 'Query location data with filters', parameters: [{ name: 'provinceId', in: 'query', schema: { type: 'string' } }, { name: 'districtId', in: 'query', schema: { type: 'string' } }, { name: 'vehicleId', in: 'query', schema: { type: 'string' } }, { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } }, { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } }], responses: { 200: { description: 'Filtered location data' } } },
      },
      '/locations/live': {
        get: { tags: ['Locations'], summary: '🗺 Live dashboard: Latest ping per vehicle', parameters: [{ name: 'provinceId', in: 'query', schema: { type: 'string' } }, { name: 'districtId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Live vehicle positions' } } },
      },
      '/users': {
        get: { tags: ['Users'], summary: 'List system users (ADMIN)', parameters: [{ name: 'role', in: 'query', schema: { type: 'string' } }, { name: 'provinceId', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'User list' } } },
      },
      '/users/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get:    { tags: ['Users'], summary: 'Get user (ADMIN)', responses: { 200: { description: 'User' } } },
        patch:  { tags: ['Users'], summary: 'Update user (ADMIN)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
        delete: { tags: ['Users'], summary: 'Delete user (ADMIN)', responses: { 204: { description: 'Deleted' } } },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
