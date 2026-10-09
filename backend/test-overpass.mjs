const osm_id = 16431354;
const osm_type = "relation";

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

const run = async () => {
  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
      headers: {
        "User-Agent": "TrashTrack-AI/1.0",
        "Content-Type": "application/x-www-form-urlencoded"
      },
    });
    const data = await response.json();
    
    const wards = data.elements.map(el => {
      let coordinates = [];
      if (el.type === "way" && el.geometry) {
        coordinates = [el.geometry.map(g => [g.lon, g.lat])];
      } else if (el.type === "relation" && el.members) {
        const ways = el.members.filter(m => m.type === "way" && m.geometry);
        coordinates = ways.map(w => w.geometry.map(g => [g.lon, g.lat]));
      }

      return {
        id: el.id,
        name: el.tags?.name || el.tags?.['name:en'] || `Ward ${el.id}`,
        ward_number: el.tags?.ref || "",
        geojson: {
          type: "MultiPolygon",
          coordinates: [coordinates]
        }
      };
    });
    
    console.log("Filtered Wards:", wards.filter(w => w.geojson.coordinates[0].length > 0));
  } catch (error) {
    console.error("Caught error:", error);
  }
};

run();
