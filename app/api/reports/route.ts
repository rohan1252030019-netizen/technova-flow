import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission } from "@/lib/api";

type Row = Record<string, string | number | null>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  const { error } = await requireApiPermission(req, "reports.export");
  if (error) return error;

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "requests";

  let filename = "";
  let rows: Row[] = [];

  if (type === "requests") {
    const status = url.searchParams.get("status");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const requests = await prisma.request.findMany({
      where,
      include: {
        requester: { select: { name: true, email: true, employeeId: true } },
        department: { select: { name: true } },
        workflow: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    rows = requests.map((r) => ({
      RequestID: r.requestNumber,
      Title: r.title,
      Type: r.type,
      Status: r.status,
      Priority: r.priority,
      Requester: r.requester?.name ?? "",
      EmployeeID: r.requester?.employeeId ?? "",
      Department: r.department?.name ?? "",
      Workflow: r.workflow?.name ?? "",
      Amount: r.amount != null ? Number(r.amount) : "",
      Created: r.createdAt.toISOString(),
      Completed: r.completedAt?.toISOString() ?? "",
    }));
    filename = "requests-report.csv";
  } else if (type === "employees") {
    const users = await prisma.user.findMany({
      include: {
        department: { select: { name: true } },
        manager: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });
    const withCounts = await Promise.all(
      users.map(async (u) => ({
        u,
        tasks: await prisma.task.count({ where: { assigneeId: u.id } }),
        completed: await prisma.task.count({ where: { assigneeId: u.id, status: "COMPLETED" } }),
        requests: await prisma.request.count({ where: { requesterId: u.id } }),
      }))
    );
    rows = withCounts.map(({ u, tasks, completed, requests }) => ({
      EmployeeID: u.employeeId,
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Designation: u.designation ?? "",
      Department: u.department?.name ?? "",
      Manager: u.manager?.name ?? "",
      Status: u.status,
      JoiningDate: u.joiningDate?.toISOString() ?? "",
      Tasks: tasks,
      CompletedTasks: completed,
      Requests: requests,
    }));
    filename = "employees-report.csv";
  } else if (type === "workflows") {
    const workflows = await prisma.workflow.findMany({
      include: {
        department: { select: { name: true } },
        steps: { orderBy: { order: "asc" } },
      },
      orderBy: { name: "asc" },
    });
    rows = workflows.flatMap((w) =>
      w.steps.map((s) => ({
        Workflow: w.name,
        Trigger: w.trigger,
        Status: w.status,
        StepOrder: s.order + 1,
        StepName: s.name,
        StepType: s.stepType,
        AssignedRole: s.assignedRole ?? "",
        SLAHours: s.slaHours ?? "",
        EscalationHours: s.escalationHours ?? "",
        RequiresApproval: s.requiresApproval ? "Yes" : "No",
      }))
    );
    filename = "workflows-report.csv";
  } else if (type === "audit") {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    rows = logs.map((l) => ({
      Timestamp: l.createdAt.toISOString(),
      User: l.userName ?? l.userEmail ?? "",
      Email: l.userEmail ?? "",
      Action: l.action,
      EntityType: l.entityType ?? "",
      EntityId: l.entityId ?? "",
      IP: l.ip ?? "",
      Details: l.details ? JSON.stringify(l.details) : "",
    }));
    filename = "audit-report.csv";
  } else {
    return jsonOk({ message: "Invalid report type" });
  }

  const csv = toCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}