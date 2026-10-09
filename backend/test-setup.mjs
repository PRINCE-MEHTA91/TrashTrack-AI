

async function testCity(query) {
  console.log(`\n--- Testing Search for: ${query} ---`);
  const searchUrl = `http://127.0.0.1:5000/api/v1/municipalities/search?q=${encodeURIComponent(query)}`;
  // Note: normally this requires auth, but for testing we can either bypass it or simulate it.
  // Wait, I put requireRole("admin") on it. I need to get a token first.
}

async function run() {
  const loginRes = await fetch("http://127.0.0.1:5000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin4@trashtrack.local", password: "password123" }) // Assuming this exists or I'll create one
  });
  
  if (!loginRes.ok) {
     console.log("Could not login as admin. Attempting to signup...");
     const signupRes = await fetch("http://127.0.0.1:5000/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fullName: "Test Admin", 
          email: "admin4@trashtrack.local", 
          password: "password123", 
          role: "admin", 
          adminSecret: "trashtrack-admin-2024" 
        })
     });
     const signupData = await signupRes.json();
     if(!signupRes.ok) {
       console.log("Signup failed:", signupData);
       return;
     }
     await testWithToken(signupData.token);
  } else {
     const data = await loginRes.json();
     await testWithToken(data.token);
  }
}

async function testWithToken(token) {
  const cities = ["Raghogarh, Guna, Madhya Pradesh", "Pune, Maharashtra"];
  
  for (const city of cities) {
    console.log(`\n[+] Testing: ${city}`);
    const sRes = await fetch(`http://127.0.0.1:5000/api/v1/municipalities/search?q=${encodeURIComponent(city)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sData = await sRes.json();
    if (!sData.success || sData.results.length === 0) {
      console.log(`  -> No results found.`);
      continue;
    }
    const place = sData.results[0];
    console.log(`  -> Found: ${place.display_name} (osm_id: ${place.osm_id}, type: ${place.osm_type})`);
    
    // Discover wards
    const wRes = await fetch(`http://127.0.0.1:5000/api/v1/municipalities/discover-wards?osm_id=${place.osm_id}&osm_type=${place.osm_type}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const wData = await wRes.json();
    if (wData.success) {
      console.log(`  -> Discovered ${wData.wards.length} wards.`);
      if(wData.wards.length > 0) {
        console.log(`  -> Sample ward: ${wData.wards[0].name} (ID: ${wData.wards[0].id})`);
      } else {
        console.log(`  -> Ward boundary data unavailable.`);
      }
    } else {
      console.log(`  -> Failed to discover wards:`, wData);
    }
  }
}

run();
