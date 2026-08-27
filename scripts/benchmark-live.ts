async function benchmarkDashboard() {
  console.log("=== Benchmarking Live Dashboard & API Performance ===");
  
  // 1. Test Login
  const loginStart = Date.now();
  const loginRes = await fetch("https://technova-flow.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@technova.com", password: "Password@123" }),
  });
  const loginMs = Date.now() - loginStart;
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log(`Login response time: ${loginMs}ms (Status ${loginRes.status})`);

  // 2. Test Analytics Summary
  const sumStart = Date.now();
  const sumRes = await fetch("https://technova-flow.vercel.app/api/analytics/summary", {
    headers: { Cookie: cookie },
  });
  const sumMs = Date.now() - sumStart;
  const sumData = await sumRes.json();
  console.log(`Analytics summary response time: ${sumMs}ms (Status ${sumRes.status})`);
  console.log("Summary stats:", sumData.data?.stats);

  // 3. Test Employee Login & Dashboard
  const empRes = await fetch("https://technova-flow.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rahul.kumar@technova.com", password: "Password@123" }),
  });
  const empCookie = empRes.headers.get("set-cookie") || "";
  const empSumRes = await fetch("https://technova-flow.vercel.app/api/analytics/summary", {
    headers: { Cookie: empCookie },
  });
  console.log(`Employee dashboard summary status: ${empSumRes.status} (OK: ${empSumRes.ok})`);
}

benchmarkDashboard().catch(console.error);
