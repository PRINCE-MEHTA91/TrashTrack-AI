// Zone-scoped SSE broadcaster (no private citizen data)
import jwt from "jsonwebtoken";
import { query } from "../config/database.js";

// Map: municipalityId (UUID string or '__UNASSIGNED__') -> Set of response streams
const zoneClients = new Map();
// Map: userId (UUID string) -> Set of response streams
const userClients = new Map();

// Register client response stream for a municipality
export function registerSSEClient(municipalityKey, res) {
  const key = municipalityKey || "__ALL__";
  if (!zoneClients.has(key)) {
    zoneClients.set(key, new Set());
  }
  zoneClients.get(key).add(res);

  res.on("close", () => {
    const clients = zoneClients.get(key);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        zoneClients.delete(key);
      }
    }
  });
}

// Register client response stream for a specific authenticated user
export function registerUserSSEClient(userId, res) {
  if (!userId) return;
  const key = String(userId);
  if (!userClients.has(key)) {
    userClients.set(key, new Set());
  }
  userClients.get(key).add(res);

  res.on("close", () => {
    const clients = userClients.get(key);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        userClients.delete(key);
      }
    }
  });
}

// Send real-time notification to a specific user
export function sendUserNotification(userId, notification, unreadCount = null) {
  if (!userId) return;
  const clients = userClients.get(String(userId));
  if (!clients || clients.size === 0) return;

  const payload = {
    type: "notification_received",
    notification,
    unreadCount,
    timestamp: new Date().toISOString(),
  };
  const message = `data: ${JSON.stringify(payload)}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (err) {
      console.error("Error writing user notification SSE:", err);
    }
  });
}

// Send unread badge count update to a specific user
export function sendUserBadgeUpdate(userId, unreadCount) {
  if (!userId) return;
  const clients = userClients.get(String(userId));
  if (!clients || clients.size === 0) return;

  const payload = {
    type: "unread_count_updated",
    unreadCount,
    timestamp: new Date().toISOString(),
  };
  const message = `data: ${JSON.stringify(payload)}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (err) {
      console.error("Error writing user badge SSE:", err);
    }
  });
}

// Broadcast event payload to clients connected in the zone
export function broadcastZoneUpdate(municipalityId, eventData) {
  const payload = {
    ...eventData,
    timestamp: new Date().toISOString(),
  };
  const message = `data: ${JSON.stringify(payload)}\n\n`;

  const targetKeys = [municipalityId || "__UNASSIGNED__", "__ALL__"];

  targetKeys.forEach((key) => {
    const clients = zoneClients.get(key);
    if (clients && clients.size > 0) {
      clients.forEach((client) => {
        try {
          client.write(message);
        } catch (err) {
          console.error("Error writing SSE to client:", err);
        }
      });
    }
  });
}

// GET /api/v1/complaints/events - SSE connection handler
export async function handleSSEConnection(req, res) {
  try {
    const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
    if (!token) {
      return res.status(401).json({ success: false, message: "Token required for real-time stream." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token." });
    }

    const userId = decoded.userId;

    // Resolve user's municipality
    const userRes = await query(
      `SELECT u.id, u.role, u.municipality_id, ul.latitude, ul.longitude
       FROM users u
       LEFT JOIN user_locations ul ON ul.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = userRes.rows[0];
    let resolvedMuniId = user.municipality_id;

    // If citizen and no explicit municipality, check GPS coordinates
    if (!resolvedMuniId && user.role === "citizen" && user.latitude && user.longitude) {
      const spatialRes = await query(
        `SELECT m.id
         FROM municipalities m
         WHERE m.boundary IS NOT NULL AND (
           ST_Contains(m.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
           OR ST_DWithin(m.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 25000)
         )
         ORDER BY ST_Distance(m.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) ASC
         LIMIT 1`,
        [user.longitude, user.latitude]
      );
      if (spatialRes.rows.length > 0) {
        resolvedMuniId = spatialRes.rows[0].id;
      }
    }

    // If client supplied a valid municipalityId parameter for browsing
    if (!resolvedMuniId && req.query.municipality_id) {
      resolvedMuniId = req.query.municipality_id;
    }

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send initial connection packet
    res.write(
      `data: ${JSON.stringify({
        type: "connected",
        municipalityId: resolvedMuniId,
        role: user.role,
        message: "Connected to Zone Community Feed real-time updates.",
      })}\n\n`
    );

    registerSSEClient(resolvedMuniId, res);
    registerUserSSEClient(userId, res);

    // Keep-alive heartbeat every 25 seconds
    const interval = setInterval(() => {
      try {
        res.write(": keep-alive\n\n");
      } catch {
        clearInterval(interval);
      }
    }, 25000);

    res.on("close", () => {
      clearInterval(interval);
    });
  } catch (err) {
    console.error("SSE Connection Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "SSE failed to initialize." });
    }
  }
}
