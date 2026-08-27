const ROLES_TO_TEST = [
  { role: "SUPER_ADMIN", email: "admin@technova.com" },
  { role: "HR_ADMIN", email: "hr@technova.com" },
  { role: "DEPARTMENT_HEAD", email: "eng.head@technova.com" },
  { role: "MANAGER", email: "suresh.reddy@technova.com" },
  { role: "FINANCE", email: "finance@technova.com" },
  { role: "EMPLOYEE", email: "rahul.kumar@technova.com" },
];

async function main() {
  console.log("=== Testing Live Authentication on https://technova-flow.vercel.app ===\n");
  let passed = 0;

  for (const { role, email } of ROLES_TO_TEST) {
    try {
      const res = await fetch("https://technova-flow.vercel.app/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Password@123" }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data?.user?.email === email) {
        console.log(`✅ [${role}] Login SUCCESS: ${data.data.user.name} (${data.data.user.email})`);
        passed++;
      } else {
        console.error(`❌ [${role}] Login FAILED (Status ${res.status}):`, data);
      }
    } catch (err) {
      console.error(`❌ [${role}] Request Exception:`, err);
    }
  }

  console.log(`\nResults: ${passed}/${ROLES_TO_TEST.length} roles logged in successfully!`);
}

main();
