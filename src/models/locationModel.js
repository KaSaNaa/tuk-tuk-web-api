/**
 * DATA MODEL: LocationPing
 *
 * Internal entity for a single GPS location event pushed by a tracking device.
 * The internal model stores raw telemetry including receivedAt (server-side
 * timestamp), which differs from the device-reported timestamp. This distinction
 * is important for forensic investigations.
 *
 * Entity Relationships (internal):
 *   LocationPing ──── belongs to ──── Vehicle (vehicleId FK)
 *
 * NOTE: receivedAt vs timestamp
 *   - timestamp: reported by the GPS device (may be slightly in the past due to
 *                buffering or network latency)
 *   - receivedAt: when the server ingested the record (always server UTC)
 *   Both are stored internally; the resource layer exposes both for audit purposes.
 */

/**
 * Validates coordinate range for Sri Lanka (approximate bounding box).
 * The boundary check is a data-model concern — not a business rule.
 */
const SRI_LANKA_BOUNDS = Object.freeze({
  LAT: { MIN: 5.7, MAX: 10.0 },
  LNG: { MIN: 79.4, MAX: 82.0 },
});

const isWithinSriLanka = (lat, lng) =>
  lat >= SRI_LANKA_BOUNDS.LAT.MIN && lat <= SRI_LANKA_BOUNDS.LAT.MAX &&
  lng >= SRI_LANKA_BOUNDS.LNG.MIN && lng <= SRI_LANKA_BOUNDS.LNG.MAX;

/**
 * Factory: builds a LocationPing entity document for DB insertion.
 */
const createLocationPingEntity = ({
  vehicleId,
  latitude, longitude,
  speed, heading, accuracy, altitude, satellites,
  deviceTimestamp, // optional — device-reported time; falls back to server time
}) => {
  const now = new Date().toISOString();
  return {
    vehicleId,
    latitude:   parseFloat(parseFloat(latitude).toFixed(6)),
    longitude:  parseFloat(parseFloat(longitude).toFixed(6)),
    speed:      speed     !== undefined && speed     !== null ? parseFloat(parseFloat(speed).toFixed(2))    : null,
    heading:    heading   !== undefined && heading   !== null ? parseFloat(parseFloat(heading).toFixed(1))  : null,
    accuracy:   accuracy  !== undefined && accuracy  !== null ? parseFloat(parseFloat(accuracy).toFixed(1)) : null,
    altitude:   altitude  !== undefined && altitude  !== null ? parseFloat(parseFloat(altitude).toFixed(1)) : null,
    satellites: satellites !== undefined && satellites !== null ? parseInt(satellites) : null,
    timestamp:  deviceTimestamp || now,   // device-reported time
    receivedAt: now,                       // server ingestion time — always UTC
  };
};

module.exports = { SRI_LANKA_BOUNDS, isWithinSriLanka, createLocationPingEntity };
