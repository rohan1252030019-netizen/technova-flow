import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = "postgresql://postgres.cklzlmbvdixgznkylyvm:Roh%40nshally9967@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";

async function verifyDepartments() {
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("=== Checking All 8 Department Connections & Hierarchies ===");

  // Set any missing headIds
  await prisma.department.update({ where: { id: "dept-mkt" }, data: { headId: "u-mkt-head" } });
  await prisma.department.update({ where: { id: "dept-sales" }, data: { headId: "u-sales-head" } });
  await prisma.department.update({ where: { id: "dept-leg" }, data: { headId: "u-leg-head" } });

  const depts = await prisma.department.findMany({
    include: {
      head: { select: { id: true, name: true, email: true, designation: true } },
      users: { select: { id: true, name: true, role: true, designation: true, manager: { select: { name: true } } } },
      requests: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  for (const d of depts) {
    console.log(`\n🏢 [${d.code}] ${d.name} Department:`);
    console.log(`   - Head of Dept: ${d.head?.name || "Unassigned"} (${d.head?.designation})`);
    console.log(`   - Total Members: ${d.users.length}`);
    console.log(`   - Connected Requests: ${d.requests.length}`);
    console.log(`   - Roles: ${Array.from(new Set(d.users.map(u => u.role))).join(", ")}`);
  }

  // Check cross-department workflows
  const workflows = await prisma.workflow.findMany({
    include: {
      steps: {
        orderBy: { order: "asc" },
      },
    },
  });

  console.log("\n🔄 Cross-Department Automated Workflow Connections:");
  for (const wf of workflows) {
    const chain = wf.steps.map(s => `${s.name} (${s.assignedRole || s.assignedDepartmentId || "Requester"})`).join(" ➔ ");
    console.log(`\n  📌 [${wf.trigger}] ${wf.name}:`);
    console.log(`     Routing Chain: ${chain}`);
  }

  await pool.end();
}

verifyDepartments().catch(console.error);
