// Role-based authorization middleware test
import http from "http";

const BASE = "http://localhost:5000/api/v1/auth";

function req(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(BASE + path);
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": payload ? Buffer.byteLength(payload) : 0,
        ...headers,
      },
    };
    const request = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    request.on("error", (e) => resolve({ status: 0, error: e.message }));
    if (payload) request.write(payload);
    request.end();
  });
}

function pass(label) { console.log(`  ✅ PASS: ${label}`); }
function fail(label, detail) { console.log(`  ❌ FAIL: ${label} — ${detail}`); process.exitCode = 1; }
function section(name) { console.log(`\n=== ${name} ===`); }

async function run() {
  // Login as citizen
  section("Role Test Setup — Login as citizen");
  const citizenLogin = await req("POST", "/login", { email: "tester@trashtrack.com", password: "pass1234" });
  if (!citizenLogin.body?.token) { fail("citizen login", JSON.stringify(citizenLogin)); return; }
  const citizenToken = citizenLogin.body.token;
  pass("citizen logged in, token obtained");

  // Login as admin — password is 'password' (bcrypt hash in DB)
  section("Role Test Setup — Login as admin");
  const adminLogin = await req("POST", "/login", { email: "admin@trashtrack.com", password: "adminpass123" });
  if (!adminLogin.body?.token) { fail("admin login", JSON.stringify(adminLogin)); return; }
  const adminToken = adminLogin.body.token;
  pass("admin logged in, token obtained");

  // Test 1: CITIZEN hitting admin-only route → 403
  section("Role Middleware Test 1: CITIZEN → admin route → 403");
  const citizenToAdmin = await req("GET", "/test-admin", null, { Authorization: `Bearer ${citizenToken}` });
  if (citizenToAdmin.status === 403 && citizenToAdmin.body.message === "Forbidden.") {
    pass("citizen → admin route → 403 Forbidden");
  } else {
    fail("citizen → admin route", JSON.stringify(citizenToAdmin));
  }

  // Test 2: ADMIN hitting admin-only route → 200
  section("Role Middleware Test 2: ADMIN → admin route → 200");
  const adminToAdmin = await req("GET", "/test-admin", null, { Authorization: `Bearer ${adminToken}` });
  if (adminToAdmin.status === 200 && adminToAdmin.body.success) {
    pass("admin → admin route → 200 Admin access granted");
  } else {
    fail("admin → admin route", JSON.stringify(adminToAdmin));
  }

  // Test 3: No token → admin route → 401
  section("Role Middleware Test 3: No token → admin route → 401");
  const noToken = await req("GET", "/test-admin");
  if (noToken.status === 401) {
    pass("no token → admin route → 401");
  } else {
    fail("no token → admin route", JSON.stringify(noToken));
  }

  console.log("\n=== ROLE TESTS COMPLETE ===\n");
}

run().catch(console.error);
