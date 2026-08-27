import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Password@123";

async function main() {
  console.log("Seeding TechNova Global...");

  await prisma.organization.upsert({
    where: { id: "org-technova" },
    update: {},
    create: {
      id: "org-technova",
      name: "TechNova Global Pvt. Ltd.",
      description: "Enterprise workflow management demo organization",
      timezone: "Asia/Kolkata",
      currency: "INR",
    },
  });

  const departments = [
    { id: "dept-eng", name: "Engineering", code: "ENG" },
    { id: "dept-hr", name: "Human Resources", code: "HR" },
    { id: "dept-fin", name: "Finance", code: "FIN" },
    { id: "dept-mkt", name: "Marketing", code: "MKT" },
    { id: "dept-sales", name: "Sales", code: "SLS" },
    { id: "dept-it", name: "IT", code: "IT" },
    { id: "dept-ops", name: "Operations", code: "OPS" },
    { id: "dept-leg", name: "Legal", code: "LEG" },
  ];

  for (const d of departments) {
    await prisma.department.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    });
  }

  const hash = await bcrypt.hash(PASSWORD, 10);

  const employees = [
    { id: "u-admin", name: "Rohan Kokatare", email: "admin@technova.com", role: "SUPER_ADMIN", dept: "dept-ops", designation: "Chief Operating Officer", manager: null, employeeId: "TN-0001" },
    { id: "u-hr", name: "Priya Verma", email: "hr@technova.com", role: "HR_ADMIN", dept: "dept-hr", designation: "HR Manager", manager: "u-admin", employeeId: "TN-0002" },
    { id: "u-fin", name: "Rajesh Kumar", email: "finance@technova.com", role: "FINANCE", dept: "dept-fin", designation: "Finance Manager", manager: "u-admin", employeeId: "TN-0003" },
    { id: "u-eng-head", name: "Vikram Singh", email: "eng.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-eng", designation: "Director of Engineering", manager: "u-admin", employeeId: "TN-0004" },
    { id: "u-hr-head", name: "Neha Gupta", email: "hr.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-hr", designation: "Director of HR", manager: "u-admin", employeeId: "TN-0005" },
    { id: "u-fin-head", name: "Ankit Mehta", email: "fin.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-fin", designation: "Director of Finance", manager: "u-admin", employeeId: "TN-0006" },
    { id: "u-mkt-head", name: "Sneha Iyer", email: "mkt.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-mkt", designation: "Director of Marketing", manager: "u-admin", employeeId: "TN-0007" },
    { id: "u-sales-head", name: "Karan Patel", email: "sales.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-sales", designation: "Director of Sales", manager: "u-admin", employeeId: "TN-0008" },
    { id: "u-it-head", name: "Rohan Desai", email: "it.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-it", designation: "Director of IT", manager: "u-admin", employeeId: "TN-0009" },
    { id: "u-ops-head", name: "Divya Nair", email: "ops.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-ops", designation: "Director of Operations", manager: "u-admin", employeeId: "TN-0010" },
    { id: "u-leg-head", name: "Aditya Rao", email: "leg.head@technova.com", role: "DEPARTMENT_HEAD", dept: "dept-leg", designation: "General Counsel", manager: "u-admin", employeeId: "TN-0011" },
    // Managers
    { id: "u-mgr-1", name: "Suresh Reddy", email: "suresh.reddy@technova.com", role: "MANAGER", dept: "dept-eng", designation: "Engineering Manager", manager: "u-eng-head", employeeId: "TN-0012" },
    { id: "u-mgr-2", name: "Kavita Joshi", email: "kavita.joshi@technova.com", role: "MANAGER", dept: "dept-eng", designation: "QA Manager", manager: "u-eng-head", employeeId: "TN-0013" },
    { id: "u-mgr-3", name: "Manish Agarwal", email: "manish.agarwal@technova.com", role: "MANAGER", dept: "dept-mkt", designation: "Marketing Manager", manager: "u-mkt-head", employeeId: "TN-0014" },
    { id: "u-mgr-4", name: "Pooja Bhat", email: "pooja.bhat@technova.com", role: "MANAGER", dept: "dept-sales", designation: "Sales Manager", manager: "u-sales-head", employeeId: "TN-0015" },
    { id: "u-mgr-5", name: "Arjun Menon", email: "arjun.menon@technova.com", role: "MANAGER", dept: "dept-it", designation: "IT Operations Manager", manager: "u-it-head", employeeId: "TN-0016" },
    // Employees
    { id: "u-emp-1", name: "Rahul Kumar", email: "rahul.kumar@technova.com", role: "EMPLOYEE", dept: "dept-eng", designation: "Senior Software Engineer", manager: "u-mgr-1", employeeId: "TN-0017" },
    { id: "u-emp-2", name: "Anjali Singh", email: "anjali.singh@technova.com", role: "EMPLOYEE", dept: "dept-eng", designation: "Software Engineer", manager: "u-mgr-1", employeeId: "TN-0018" },
    { id: "u-emp-3", name: "Vivek Yadav", email: "vivek.yadav@technova.com", role: "EMPLOYEE", dept: "dept-eng", designation: "Backend Engineer", manager: "u-mgr-1", employeeId: "TN-0019" },
    { id: "u-emp-4", name: "Meera Krishnan", email: "meera.krishnan@technova.com", role: "EMPLOYEE", dept: "dept-eng", designation: "Frontend Engineer", manager: "u-mgr-1", employeeId: "TN-0020" },
    { id: "u-emp-5", name: "Rakesh Nair", email: "rakesh.nair@technova.com", role: "EMPLOYEE", dept: "dept-eng", designation: "DevOps Engineer", manager: "u-mgr-1", employeeId: "TN-0021" },
    { id: "u-emp-6", name: "Simran Kaur", email: "simran.kaur@technova.com", role: "EMPLOYEE", dept: "dept-eng", designation: "QA Engineer", manager: "u-mgr-2", employeeId: "TN-0022" },
    { id: "u-emp-7", name: "Nikhil Verma", email: "nikhil.verma@technova.com", role: "EMPLOYEE", dept: "dept-hr", designation: "HR Executive", manager: "u-hr", employeeId: "TN-0023" },
    { id: "u-emp-8", name: "Shreya Mishra", email: "shreya.mishra@technova.com", role: "EMPLOYEE", dept: "dept-hr", designation: "Recruiter", manager: "u-hr", employeeId: "TN-0024" },
    { id: "u-emp-9", name: "Deepak Chauhan", email: "deepak.chauhan@technova.com", role: "EMPLOYEE", dept: "dept-fin", designation: "Accountant", manager: "u-fin", employeeId: "TN-0025" },
    { id: "u-emp-10", name: "Ishita Bansal", email: "ishita.bansal@technova.com", role: "EMPLOYEE", dept: "dept-fin", designation: "Financial Analyst", manager: "u-fin", employeeId: "TN-0026" },
    { id: "u-emp-11", name: "Gaurav Malhotra", email: "gaurav.malhotra@technova.com", role: "EMPLOYEE", dept: "dept-mkt", designation: "Marketing Specialist", manager: "u-mgr-3", employeeId: "TN-0027" },
    { id: "u-emp-12", name: "Tanvi Kulkarni", email: "tanvi.kulkarni@technova.com", role: "EMPLOYEE", dept: "dept-mkt", designation: "Content Strategist", manager: "u-mgr-3", employeeId: "TN-0028" },
    { id: "u-emp-13", name: "Harsh Vardhan", email: "harsh.vardhan@technova.com", role: "EMPLOYEE", dept: "dept-sales", designation: "Sales Executive", manager: "u-mgr-4", employeeId: "TN-0029" },
    { id: "u-emp-14", name: "Ritu Sharma", email: "ritu.sharma@technova.com", role: "EMPLOYEE", dept: "dept-sales", designation: "Account Executive", manager: "u-mgr-4", employeeId: "TN-0030" },
    { id: "u-emp-15", name: "Farhan Khan", email: "farhan.khan@technova.com", role: "EMPLOYEE", dept: "dept-it", designation: "IT Support Engineer", manager: "u-mgr-5", employeeId: "TN-0031" },
    { id: "u-emp-16", name: "Lakshmi Prasad", email: "lakshmi.prasad@technova.com", role: "EMPLOYEE", dept: "dept-it", designation: "Network Engineer", manager: "u-mgr-5", employeeId: "TN-0032" },
    { id: "u-emp-17", name: "Omkar Joshi", email: "omkar.joshi@technova.com", role: "EMPLOYEE", dept: "dept-ops", designation: "Operations Executive", manager: "u-ops-head", employeeId: "TN-0033" },
    { id: "u-emp-18", name: "Zara Sheikh", email: "zara.sheikh@technova.com", role: "EMPLOYEE", dept: "dept-leg", designation: "Legal Associate", manager: "u-leg-head", employeeId: "TN-0034" },
    { id: "u-emp-19", name: "Yash Thakur", email: "yash.thakur@technova.com", role: "EMPLOYEE", dept: "dept-eng", designation: "Data Engineer", manager: "u-mgr-1", employeeId: "TN-0035" },
    { id: "u-emp-20", name: "Nandini Rao", email: "nandini.rao@technova.com", role: "EMPLOYEE", dept: "dept-ops", designation: "Logistics Coordinator", manager: "u-ops-head", employeeId: "TN-0036" },
  ];

  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#ef4444"];
  for (const e of employees) {
    const dept = departments.find((d) => d.id === e.dept)!;
    await prisma.user.upsert({
      where: { id: e.id },
      update: { name: e.name, role: e.role as never, departmentId: e.dept, managerId: e.manager, designation: e.designation, status: "ACTIVE" },
      create: {
        id: e.id,
        employeeId: e.employeeId,
        name: e.name,
        email: e.email,
        passwordHash: hash,
        role: e.role as never,
        departmentId: e.dept,
        designation: e.designation,
        managerId: e.manager,
        joiningDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        status: "ACTIVE",
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
      },
    });
  }

  await prisma.department.updateMany({
    where: { id: "dept-eng" },
    data: { headId: "u-eng-head" },
  });
  await prisma.department.updateMany({
    where: { id: "dept-hr" },
    data: { headId: "u-hr-head" },
  });
  await prisma.department.updateMany({
    where: { id: "dept-fin" },
    data: { headId: "u-fin-head" },
  });
  await prisma.department.updateMany({
    where: { id: "dept-it" },
    data: { headId: "u-it-head" },
  });
  await prisma.department.updateMany({
    where: { id: "dept-ops" },
    data: { headId: "u-ops-head" },
  });

  // Workflows
  const workflows = [
    {
      id: "wf-leave",
      name: "Leave Request Workflow",
      description: "Employee leave request with manager and HR approval",
      trigger: "LEAVE",
      steps: [
        { name: "Submit Leave Request", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 1, requiresApproval: false },
        { name: "Manager Approval", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "MANAGER", assignedDepartment: null, order: 2, requiresApproval: true, slaHours: 24 },
        { name: "HR Approval", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "HR_ADMIN", assignedDepartment: null, order: 3, requiresApproval: true, slaHours: 24 },
        { name: "Approved & Notified", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 4, requiresApproval: false, isFinal: true },
      ],
    },
    {
      id: "wf-expense",
      name: "Expense Reimbursement Workflow",
      description: "Expense claim with manager and finance approval",
      trigger: "EXPENSE",
      steps: [
        { name: "Submit Expense Claim", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 1, requiresApproval: false },
        { name: "Manager Approval", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "MANAGER", assignedDepartment: null, order: 2, requiresApproval: true, slaHours: 24 },
        { name: "Finance Approval", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "FINANCE", assignedDepartment: null, order: 3, requiresApproval: true, slaHours: 48 },
        { name: "Reimbursement Processing", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: "FINANCE", assignedDepartment: null, order: 4, requiresApproval: false, slaHours: 72 },
        { name: "Reimbursed", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 5, requiresApproval: false, isFinal: true },
      ],
    },
    {
      id: "wf-purchase",
      name: "Purchase Request Workflow",
      description: "Purchase request with multi-level approval",
      trigger: "PURCHASE",
      steps: [
        { name: "Submit Purchase Request", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 1, requiresApproval: false },
        { name: "Manager Approval", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "MANAGER", assignedDepartment: null, order: 2, requiresApproval: true, slaHours: 24 },
        { name: "Department Head Approval", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "DEPARTMENT_HEAD", assignedDepartment: null, order: 3, requiresApproval: true, slaHours: 48 },
        { name: "Finance Approval", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "FINANCE", assignedDepartment: null, order: 4, requiresApproval: true, slaHours: 48 },
        { name: "Procurement Processing", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: "DEPARTMENT_HEAD", assignedDepartment: null, order: 5, requiresApproval: false, slaHours: 120 },
        { name: "Order Completed", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 6, requiresApproval: false, isFinal: true },
      ],
    },
    {
      id: "wf-it",
      name: "IT Service Request Workflow",
      description: "IT support request handled by helpdesk",
      trigger: "IT_SERVICE",
      steps: [
        { name: "Submit IT Request", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 1, requiresApproval: false },
        { name: "IT Helpdesk Triage", stepType: "APPROVAL", assigneeType: "DEPARTMENT", assignedRole: null, assignedDepartment: "dept-it", order: 2, requiresApproval: true, slaHours: 8 },
        { name: "IT Engineer Resolution", stepType: "TASK", assigneeType: "DEPARTMENT", assignedRole: null, assignedDepartment: "dept-it", order: 3, requiresApproval: false, slaHours: 48 },
        { name: "Employee Confirmation", stepType: "APPROVAL", assigneeType: "USER", assignedRole: null, assignedDepartment: null, order: 4, requiresApproval: true, slaHours: 24 },
        { name: "Request Closed", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 5, requiresApproval: false, isFinal: true },
      ],
    },
    {
      id: "wf-doc",
      name: "Document Approval Workflow",
      description: "Document review with legal sign-off",
      trigger: "DOCUMENT_APPROVAL",
      steps: [
        { name: "Submit Document", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 1, requiresApproval: false },
        { name: "Manager Review", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "MANAGER", assignedDepartment: null, order: 2, requiresApproval: true, slaHours: 24 },
        { name: "Department Head Review", stepType: "APPROVAL", assigneeType: "ROLE", assignedRole: "DEPARTMENT_HEAD", assignedDepartment: null, order: 3, requiresApproval: true, slaHours: 48 },
        { name: "Legal Review", stepType: "APPROVAL", assigneeType: "DEPARTMENT", assignedRole: null, assignedDepartment: "dept-leg", order: 4, requiresApproval: true, slaHours: 72 },
        { name: "Document Approved", stepType: "PROCESSING", assigneeType: "ROLE", assignedRole: null, assignedDepartment: null, order: 5, requiresApproval: false, isFinal: true },
      ],
    },
  ];

  for (const w of workflows) {
    await prisma.workflow.upsert({
      where: { id: w.id },
      update: {},
      create: {
        id: w.id,
        name: w.name,
        description: w.description,
        trigger: w.trigger as never,
        status: "ACTIVE",
        createdById: "u-admin",
        steps: {
          create: w.steps.map((s, i) => ({
            name: s.name,
            stepType: s.stepType as never,
            assigneeType: (s.assigneeType ?? "ROLE") as never,
            assignedRole: (s.assignedRole ?? null) as never,
            assignedDepartmentId: s.assignedDepartment ?? null,
            order: i,
            requiresApproval: s.requiresApproval,
            slaHours: s.slaHours,
            isFinal: s.isFinal,
          })),
        },
      },
    });
  }

  // Sample requests
  const sampleRequests = [
    { requester: "u-emp-1", type: "LEAVE", title: "Annual Leave - Goa Trip", status: "COMPLETED", days: 5, priority: "MEDIUM", daysAgo: 20 },
    { requester: "u-emp-2", type: "LEAVE", title: "Sick Leave - Medical Consultation", status: "APPROVED", days: 2, priority: "HIGH", daysAgo: 12 },
    { requester: "u-emp-3", type: "EXPENSE", title: "Client Dinner Reimbursement", status: "COMPLETED", amount: 4500, priority: "MEDIUM", daysAgo: 15 },
    { requester: "u-emp-4", type: "EXPENSE", title: "Cab Fare - Office Visit", status: "REJECTED", amount: 850, priority: "LOW", daysAgo: 10 },
    { requester: "u-emp-5", type: "PURCHASE", title: "MacBook Pro M4 - Engineering Team", status: "IN_PROGRESS", amount: 245000, priority: "HIGH", daysAgo: 6 },
    { requester: "u-emp-6", type: "IT_SERVICE", title: "Laptop Keyboard Replacement", status: "COMPLETED", priority: "MEDIUM", daysAgo: 18 },
    { requester: "u-emp-7", type: "IT_SERVICE", title: "New Monitor for Home Office", status: "PENDING_APPROVAL", priority: "MEDIUM", daysAgo: 3 },
    { requester: "u-emp-8", type: "LEAVE", title: "Paternity Leave", status: "PENDING_APPROVAL", days: 7, priority: "HIGH", daysAgo: 1 },
    { requester: "u-emp-9", type: "DOCUMENT_APPROVAL", title: "Vendor NDA - Acme Corp", status: "PENDING_APPROVAL", priority: "URGENT", daysAgo: 2 },
    { requester: "u-emp-10", type: "PURCHASE", title: "Office Chairs - Finance Floor", status: "ESCALATED", amount: 96000, priority: "MEDIUM", daysAgo: 9 },
    { requester: "u-emp-11", type: "EXPENSE", title: "Conference Registration - TechSummit", status: "APPROVED", amount: 18500, priority: "MEDIUM", daysAgo: 8 },
    { requester: "u-emp-12", type: "DOCUMENT_APPROVAL", title: "Marketing Collateral - Q4 Campaign", status: "COMPLETED", priority: "MEDIUM", daysAgo: 14 },
    { requester: "u-emp-13", type: "IT_SERVICE", title: "VPN Access - Remote Client", status: "UNDER_REVIEW", priority: "HIGH", daysAgo: 4 },
    { requester: "u-emp-14", type: "LEAVE", title: "Casual Leave - Family Function", status: "APPROVED", days: 3, priority: "LOW", daysAgo: 11 },
    { requester: "u-emp-15", type: "PURCHASE", title: "Networking Switch - Data Center", status: "COMPLETED", amount: 68000, priority: "URGENT", daysAgo: 25 },
    { requester: "u-emp-16", type: "EXPENSE", title: "Overseas Travel - Berlin Office", status: "IN_PROGRESS", amount: 125000, priority: "HIGH", daysAgo: 7 },
    { requester: "u-emp-17", type: "LEAVE", title: "Earned Leave - 2 Weeks", status: "REJECTED", days: 10, priority: "MEDIUM", daysAgo: 16 },
    { requester: "u-emp-18", type: "DOCUMENT_APPROVAL", title: "Employment Contract Template v3", status: "SUBMITTED", priority: "MEDIUM", daysAgo: 5 },
    { requester: "u-emp-19", type: "IT_SERVICE", title: "Database Server Access", status: "ESCALATED", priority: "URGENT", daysAgo: 13 },
    { requester: "u-emp-20", type: "PURCHASE", title: "Warehouse Shelving Units", status: "CANCELLED", amount: 54000, priority: "LOW", daysAgo: 22 },
    { requester: "u-emp-1", type: "EXPENSE", title: "Team Lunch Reimbursement", status: "PENDING_APPROVAL", amount: 3200, priority: "LOW", daysAgo: 2 },
    { requester: "u-emp-2", type: "PURCHASE", title: "Standing Desk - Remote Setup", status: "UNDER_REVIEW", amount: 28500, priority: "MEDIUM", daysAgo: 4 },
    { requester: "u-emp-3", type: "LEAVE", title: "Wedding Leave", status: "DRAFT", days: 12, priority: "MEDIUM", daysAgo: 0 },
    { requester: "u-emp-4", type: "IT_SERVICE", title: "Software License - Figma Pro", status: "APPROVED", priority: "MEDIUM", daysAgo: 6 },
    { requester: "u-emp-5", type: "DOCUMENT_APPROVAL", title: "Employee Handbook Update", status: "IN_PROGRESS", priority: "MEDIUM", daysAgo: 9 },
  ];

  const statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING_APPROVAL", "IN_PROGRESS", "ESCALATED", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];
  let reqCount = 1001;

  for (const r of sampleRequests) {
    const createdAt = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
    const requester = await prisma.user.findUnique({ where: { id: r.requester } });
    if (!requester) continue;

    await prisma.request.create({
      data: {
        requestNumber: `REQ-${reqCount++}`,
        type: r.type as never,
        title: r.title,
        description: `Seeded demo ${r.type.toLowerCase()} request created by ${requester.name}.`,
        requesterId: r.requester,
        departmentId: requester.departmentId,
        status: r.status as never,
        priority: r.priority as never,
        amount: r.amount ?? undefined,
        startedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        createdById: r.requester,
        metadata: {
          seeded: true,
          leaveDays: r.days,
        },
      },
    });
  }

  console.log(`Seeded ${employees.length} users, ${departments.length} departments, ${workflows.length} workflows, ${sampleRequests.length} requests.`);
  console.log("Demo logins (password: Password@123):");
  console.log("  admin@technova.com   (Super Admin)");
  console.log("  hr@technova.com      (HR Admin)");
  console.log("  finance@technova.com (Finance)");
  console.log("  eng.head@technova.com (Dept Head)");
  console.log("  rahul.kumar@technova.com (Employee)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });