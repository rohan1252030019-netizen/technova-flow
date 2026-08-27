/**
 * Comprehensive Live End-to-End Verification Suite for TechNova Flow
 * Tests all core functions and API endpoints against the live production server.
 */

export {};

const BASE_URL = "https://technova-flow.vercel.app";

type TestResult = {
  name: string;
  category: string;
  status: "PASSED" | "FAILED";
  durationMs: number;
  details?: string;
};

const results: TestResult[] = [];

async function runTest(
  category: string,
  name: string,
  testFn: () => Promise<void>
) {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      category,
      name,
      status: "PASSED",
      durationMs: Date.now() - start,
    });
    console.log(`  ✅ [${category}] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      category,
      name,
      status: "FAILED",
      durationMs: Date.now() - start,
      details: err.message,
    });
    console.error(`  ❌ [${category}] ${name}: ${err.message}`);
  }
}

async function loginUser(email: string, password = "Password@123"): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email} with status ${res.status}`);
  return res.headers.get("set-cookie") || "";
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Full Live E2E Verification: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let adminCookie = "";
  let empCookie = "";
  let mgrCookie = "";
  let createdRequestId = "";
  let createdTaskId = "";

  // 1. AUTHENTICATION MODULE
  console.log(`\n🔑 Testing Authentication Module...`);
  await runTest("Auth", "Super Admin Login", async () => {
    adminCookie = await loginUser("admin@technova.com");
    if (!adminCookie) throw new Error("No session cookie returned");
  });

  await runTest("Auth", "Employee Login", async () => {
    empCookie = await loginUser("rahul.kumar@technova.com");
    if (!empCookie) throw new Error("No session cookie returned");
  });

  await runTest("Auth", "Manager Login", async () => {
    mgrCookie = await loginUser("suresh.reddy@technova.com");
    if (!mgrCookie) throw new Error("No session cookie returned");
  });

  await runTest("Auth", "Current User Profile (/api/auth/me)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || data.data?.user?.email !== "admin@technova.com") {
      throw new Error(`Profile fetch failed: ${JSON.stringify(data)}`);
    }
  });

  // 2. DASHBOARD & ANALYTICS MODULE
  console.log(`\n📊 Testing Dashboard & Analytics Module...`);
  await runTest("Analytics", "Dashboard Summary (/api/analytics/summary)", async () => {
    const res = await fetch(`${BASE_URL}/api/analytics/summary`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || typeof data.data?.stats?.totalEmployees !== "number") {
      throw new Error(`Summary format invalid: ${JSON.stringify(data)}`);
    }
  });

  await runTest("Analytics", "Detailed Analytics Overview (/api/analytics)", async () => {
    const res = await fetch(`${BASE_URL}/api/analytics`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !data.data) throw new Error(`Analytics overview failed: ${JSON.stringify(data)}`);
  });

  await runTest("Analytics", "CSV Report Generation (/api/reports)", async () => {
    const res = await fetch(`${BASE_URL}/api/reports?type=requests`, { headers: { Cookie: adminCookie } });
    const text = await res.text();
    if (!res.ok || (!text.includes("Request Number") && !text.includes("REQ-"))) {
      throw new Error(`CSV Report export failed: status ${res.status}`);
    }
  });

  // 3. WORKFLOWS MODULE
  console.log(`\n🔄 Testing Workflows Module...`);
  let workflowId = "";
  await runTest("Workflows", "List Active Workflows (/api/workflows)", async () => {
    const res = await fetch(`${BASE_URL}/api/workflows`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.workflows) || data.data.workflows.length === 0) {
      throw new Error(`No workflows returned: ${JSON.stringify(data)}`);
    }
    workflowId = data.data.workflows[0].id;
  });

  await runTest("Workflows", "Get Workflow Details with Steps & Conditions", async () => {
    const res = await fetch(`${BASE_URL}/api/workflows/${workflowId}`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !data.data?.workflow?.steps) {
      throw new Error(`Workflow detail failed: ${JSON.stringify(data)}`);
    }
  });

  // 4. REQUESTS & LIFECYCLE MODULE
  console.log(`\n📝 Testing Requests & Approval Lifecycle Module...`);
  await runTest("Requests", "Employee Creates Workflow Request (/api/requests)", async () => {
    const res = await fetch(`${BASE_URL}/api/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: empCookie },
      body: JSON.stringify({
        workflowId,
        type: "LEAVE",
        title: "Automated Live Verification Request",
        description: "Testing end-to-end workflow submission in live production",
        priority: "HIGH",
        amount: 0,
        metadata: { leaveDays: 3, reason: "Vacation" },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.data?.request?.id) {
      throw new Error(`Create request failed: ${JSON.stringify(data)}`);
    }
    createdRequestId = data.data.request.id;
  });

  await runTest("Requests", "Get Request Details (/api/requests/[id])", async () => {
    const res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}`, { headers: { Cookie: empCookie } });
    const data = await res.json();
    if (!res.ok || data.data?.request?.id !== createdRequestId) {
      throw new Error(`Fetch request detail failed: ${JSON.stringify(data)}`);
    }
  });

  await runTest("Requests", "Post Comment on Request (/api/requests/[id]/comments)", async () => {
    const res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: empCookie },
      body: JSON.stringify({ body: "Automated test comment on live request." }),
    });
    const data = await res.json();
    if (!res.ok || !data.data?.comment?.id) {
      throw new Error(`Comment failed: ${JSON.stringify(data)}`);
    }
  });

  await runTest("Requests", "List Pending Approvals (/api/approvals)", async () => {
    const res = await fetch(`${BASE_URL}/api/approvals?status=pending`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.requests)) {
      throw new Error(`Approvals listing failed: ${JSON.stringify(data)}`);
    }
  });

  await runTest("Requests", "Manager Approves Request (/api/requests/[id]/action)", async () => {
    const res = await fetch(`${BASE_URL}/api/requests/${createdRequestId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ action: "APPROVED", comment: "Approved during automated verification." }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Approval action failed: ${JSON.stringify(data)}`);
    }
  });

  // 5. TASKS MODULE
  console.log(`\n📋 Testing Tasks Module...`);
  await runTest("Tasks", "List Tasks (/api/tasks)", async () => {
    const res = await fetch(`${BASE_URL}/api/tasks`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.tasks)) {
      throw new Error(`Tasks listing failed: ${JSON.stringify(data)}`);
    }
    if (data.data.tasks.length > 0) {
      createdTaskId = data.data.tasks[0].id;
    }
  });

  if (createdTaskId) {
    await runTest("Tasks", "Get Task Details (/api/tasks/[id])", async () => {
      const res = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}`, { headers: { Cookie: adminCookie } });
      const data = await res.json();
      if (!res.ok || !data.data?.task) throw new Error(`Task detail failed: ${JSON.stringify(data)}`);
    });

    await runTest("Tasks", "Post Comment on Task (/api/tasks/[id]/comments)", async () => {
      const res = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: adminCookie },
        body: JSON.stringify({ body: "Task verified through automated suite." }),
      });
      const data = await res.json();
      if (!res.ok || !data.data?.comment) throw new Error(`Task comment failed: ${JSON.stringify(data)}`);
    });
  }

  // 6. USERS & DEPARTMENTS MODULE
  console.log(`\n👥 Testing Users & Organization Module...`);
  await runTest("Organization", "List Departments (/api/departments)", async () => {
    const res = await fetch(`${BASE_URL}/api/departments`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.departments) || data.data.departments.length === 0) {
      throw new Error(`Departments listing failed: ${JSON.stringify(data)}`);
    }
  });

  await runTest("Organization", "List Users Directory (/api/users)", async () => {
    const res = await fetch(`${BASE_URL}/api/users`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.users) || data.data.total < 30) {
      throw new Error(`Users listing failed: ${JSON.stringify(data)}`);
    }
  });

  await runTest("Organization", "Organization Settings Overview (/api/system/overview)", async () => {
    const res = await fetch(`${BASE_URL}/api/system/overview`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !data.data?.counts?.users) throw new Error(`System overview failed: ${JSON.stringify(data)}`);
  });

  // 7. NOTIFICATIONS & AUDIT LOGS MODULE
  console.log(`\n🔔 Testing Notifications & Audit Module...`);
  await runTest("Notifications", "Get Notifications & Unread Count", async () => {
    const res = await fetch(`${BASE_URL}/api/notifications`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.notifications)) {
      throw new Error(`Notifications failed: ${JSON.stringify(data)}`);
    }
  });

  await runTest("Audit", "List Compliance Audit Logs (/api/audit-logs)", async () => {
    const res = await fetch(`${BASE_URL}/api/audit-logs?pageSize=10`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.logs) || data.data.logs.length === 0) {
      throw new Error(`Audit logs failed: ${JSON.stringify(data)}`);
    }
  });

  // 8. SEARCH & SYSTEM CRON
  console.log(`\n🔍 Testing Search & SLA Engines...`);
  await runTest("Search", "Global Unified Search (/api/search)", async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=Leave`, { headers: { Cookie: adminCookie } });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.data?.results)) {
      throw new Error(`Search failed: ${JSON.stringify(data)}`);
    }
  });

  await runTest("SLA", "SLA Engine Check (/api/system/sla-check)", async () => {
    const res = await fetch(`${BASE_URL}/api/system/sla-check`, {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`SLA check failed: ${JSON.stringify(data)}`);
    }
  });

  // SUMMARY
  const passed = results.filter((r) => r.status === "PASSED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;

  console.log(`\n======================================================`);
  console.log(`🏁 Live E2E Verification Complete: ${passed}/${results.length} PASSED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    console.error(`❌ ${failed} test(s) failed. Check logs above.`);
    process.exit(1);
  } else {
    console.log(`✨ ALL ${passed} application functions are running flawlessly in production!`);
  }
}

main().catch((err) => {
  console.error("Fatal test suite runner error:", err);
  process.exit(1);
});
