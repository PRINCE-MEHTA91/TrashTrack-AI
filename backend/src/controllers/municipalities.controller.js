import { query } from "../config/database.js";

// Search Nominatim for a place
export const searchOSM = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Query 'q' is required" });

    // Using Nominatim API with polygon_geojson to get boundaries
    const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
    nominatimUrl.searchParams.set("q", q);
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("polygon_geojson", "1");
    nominatimUrl.searchParams.set("countrycodes", "in"); // Restrict to India
    nominatimUrl.searchParams.set("limit", "5");

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        "User-Agent": "TrashTrack-AI/1.0 (Contact: admin@trashtrack.local)",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim responded with status: ${response.status}`);
    }

    const data = await response.json();
    return res.json({ success: true, results: data });
  } catch (error) {
    console.error("OSM Search Error:", error);
    return res.status(500).json({ success: false, message: "Failed to search OSM" });
  }
};

// Discover wards using Overpass API
export const discoverWards = async (req, res) => {
  try {
    const { osm_id, osm_type } = req.query;
    if (!osm_id || !osm_type) {
      return res.status(400).json({ success: false, message: "osm_id and osm_type are required" });
    }

    // Convert node/way/relation string to first letter for Overpass (n/w/r)
    let typeCode = "r";
    if (osm_type === "relation") typeCode = "rel";
    else if (osm_type === "way") typeCode = "way";
    else if (osm_type === "node") typeCode = "node";

    // Query for admin_level 9, 10 or 11 within the area
    // To get the area id for relations, add 3600000000 to relation id.
    let areaId = parseInt(osm_id);
    if (osm_type === "relation") {
      areaId += 3600000000;
    }

    const overpassQuery = `
      [out:json][timeout:25];
      area(${areaId})->.searchArea;
      (
        relation["admin_level"~"9|10|11"](area.searchArea);
        way["admin_level"~"9|10|11"](area.searchArea);
      );
      out geom;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: "data=" + encodeURIComponent(overpassQuery),
      headers: {
        "User-Agent": "TrashTrack-AI/1.0",
        "Content-Type": "application/x-www-form-urlencoded"
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform overpass data to GeoJSON-like features for frontend
    const wards = data.elements.map(el => {
      let coordinates = [];
      if (el.type === "way" && el.geometry) {
        coordinates = [el.geometry.map(g => [g.lon, g.lat])];
      } else if (el.type === "relation" && el.members) {
        // Very simplified relation parsing for prototype purposes
        const ways = el.members.filter(m => m.type === "way" && m.geometry);
        coordinates = ways.map(w => w.geometry.map(g => [g.lon, g.lat]));
      }

      return {
        id: el.id,
        name: el.tags?.name || el.tags?.['name:en'] || `Ward ${el.id}`,
        ward_number: el.tags?.ref || "",
        geojson: {
          type: "MultiPolygon",
          coordinates: [coordinates] // Wrapper for MultiPolygon
        }
      };
    });

    return res.json({ success: true, wards: wards.filter(w => w.geojson.coordinates[0].length > 0) });
  } catch (error) {
    return res.json({ success: true, wards: [] });
  }
};

// Setup Municipality & Save to DB
export const setupMunicipality = async (req, res) => {
  try {
    // Only admins can do this
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can configure municipalities" });
    }

    const { state, district, name, geojson, bbox, source, wards, isVerified } = req.body;
    if (!state || !district || !name) {
      return res.status(400).json({ success: false, message: "State, district, and name are required" });
    }

    await query('BEGIN');

    // 1. Upsert Municipality (use ST_GeomFromGeoJSON if geometry is provided)
    let muniResult;
    if (geojson && geojson.type) {
      const geojsonStr = JSON.stringify(geojson);
      const bboxStr = JSON.stringify(bbox || []);
      const qStr = `
        INSERT INTO municipalities (state, district, name, boundary, bbox, data_source, is_verified)
        VALUES ($1, $2, $3, ST_Multi(ST_GeomFromGeoJSON($4)), $5, $6, $7)
        ON CONFLICT (state, district, name) 
        DO UPDATE SET boundary = ST_Multi(ST_GeomFromGeoJSON($4)), bbox = $5, data_source = $6, is_verified = $7, updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;
      muniResult = await query(qStr, [state, district, name, geojsonStr, bboxStr, source, isVerified]);
    } else {
      const bboxStr = JSON.stringify(bbox || []);
      const qStr = `
        INSERT INTO municipalities (state, district, name, bbox, data_source, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (state, district, name) 
        DO UPDATE SET bbox = $4, data_source = $5, is_verified = $6, updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;
      muniResult = await query(qStr, [state, district, name, bboxStr, source, isVerified]);
    }

    const municipalityId = muniResult.rows[0].id;

    // 2. Clear old wards and insert new ones
    await query(`DELETE FROM wards WHERE municipality_id = $1`, [municipalityId]);
    
    if (wards && wards.length > 0) {
      for (const ward of wards) {
        if (ward.geojson && ward.geojson.type) {
          const wGeojsonStr = JSON.stringify(ward.geojson);
          await query(`
            INSERT INTO wards (municipality_id, name, ward_number, boundary, data_source)
            VALUES ($1, $2, $3, ST_Multi(ST_GeomFromGeoJSON($4)), $5)
          `, [municipalityId, ward.name, ward.ward_number || null, wGeojsonStr, source]);
        } else {
           await query(`
            INSERT INTO wards (municipality_id, name, ward_number, data_source)
            VALUES ($1, $2, $3, $4)
          `, [municipalityId, ward.name, ward.ward_number || null, source]);
        }
      }
    }

    // 3. Assign this municipality to the current Admin
    await query(`UPDATE users SET municipality_id = $1 WHERE id = $2`, [municipalityId, req.user.userId]);

    await query('COMMIT');

    return res.json({ success: true, message: "Municipal area setup successfully", municipalityId });
  } catch (error) {
    await query('ROLLBACK');
    console.error("Setup Municipality Error:", error);
    return res.status(500).json({ success: false, message: "Failed to setup municipality" });
  }
};

export const getMyMunicipality = async (req, res) => {
  try {
    const q = `
      SELECT m.*, 
        (SELECT json_agg(w.*) FROM wards w WHERE w.municipality_id = m.id) as wards,
        ST_AsGeoJSON(m.boundary)::json as geojson
      FROM municipalities m
      JOIN users u ON u.municipality_id = m.id
      WHERE u.id = $1
    `;
    const result = await query(q, [req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.json({ success: true, municipality: null });
    }

    return res.json({ success: true, municipality: result.rows[0] });
  } catch (error) {
    console.error("Get My Municipality Error:", error);
    return res.status(500).json({ success: false, message: "Failed to get municipality info" });
  }
};

// List all registered municipalities for registration and area filtering
export const listMunicipalities = async (req, res) => {
  try {
    const q = `
      SELECT 
        m.id, 
        m.name, 
        m.district, 
        m.state, 
        m.is_verified,
        (SELECT COUNT(*)::int FROM wards w WHERE w.municipality_id = m.id) as ward_count,
        (SELECT COUNT(*)::int FROM users u WHERE u.role = 'worker' AND u.municipality_id = m.id) as worker_count,
        EXISTS(SELECT 1 FROM users adm WHERE adm.role = 'admin' AND adm.municipality_id = m.id) as has_admin
      FROM municipalities m
      ORDER BY m.name ASC
    `;
    const result = await query(q);
    return res.json({ success: true, municipalities: result.rows });
  } catch (error) {
    console.error("List Municipalities Error:", error);
    return res.status(500).json({ success: false, message: "Failed to list municipalities" });
  }
};
