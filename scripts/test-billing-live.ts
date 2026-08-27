export {};

async function testLiveBilling() {
  console.log("=== Testing Live Subscription & Billing System ===");

  // 1. Admin Login
  const loginRes = await fetch("https://technova-flow.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@technova.com", password: "Password@123" }),
  });
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log("Admin login status:", loginRes.status);

  // 2. Fetch Subscription Status
  const subRes = await fetch("https://technova-flow.vercel.app/api/billing/subscription", {
    headers: { Cookie: cookie },
  });
  const subData = await subRes.json();
  console.log("Subscription status:", subData.data?.organization);
  console.log("Available plans count:", subData.data?.allPlans?.length);

  // 3. Test Upgrade Checkout (Simulation mode)
  const checkoutRes = await fetch("https://technova-flow.vercel.app/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ planId: "PRO", interval: "year" }),
  });
  const checkoutData = await checkoutRes.json();
  console.log("Upgrade to PRO status:", checkoutRes.status, checkoutData);

  // 4. Verify upgraded plan
  const verifyRes = await fetch("https://technova-flow.vercel.app/api/billing/subscription", {
    headers: { Cookie: cookie },
  });
  const verifyData = await verifyRes.json();
  console.log("Verified Active Plan:", verifyData.data?.organization?.plan);
}

testLiveBilling().catch(console.error);
