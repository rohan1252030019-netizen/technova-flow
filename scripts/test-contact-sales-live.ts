export {};

async function testContactSalesLive() {
  console.log("=== Testing Live Contact Sales Endpoint ===");

  // 1. Admin Login
  const loginRes = await fetch("https://technova-flow.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@technova.com", password: "Password@123" }),
  });
  const cookie = loginRes.headers.get("set-cookie") || "";
  console.log("Admin login status:", loginRes.status);

  // 2. Submit Contact Sales Lead
  const salesRes = await fetch("https://technova-flow.vercel.app/api/billing/contact-sales", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      company: "Acme Enterprises Inc.",
      email: "procurement@acme.com",
      teamSize: "500 - 2,000 members",
      requirements: [
        "On-Premise Docker Deployment",
        "Custom SAML / SSO Integration",
        "Dedicated 99.99% Uptime SLA",
      ],
      message: "We need custom workflow templates and self-hosted installation on AWS.",
    }),
  });
  const salesData = await salesRes.json();
  console.log("Contact Sales submission response:", salesRes.status, salesData);
}

testContactSalesLive().catch(console.error);
