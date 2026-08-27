import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { error } = await requireApiPermission(req, "settings.manage");
  if (error) return error;

  const [org, users, departments, workflows, requests, tasks, auditLogs] = await Promise.all([
    prisma.organization.findFirst(),
    prisma.user.count(),
    prisma.department.count(),
    prisma.workflow.count(),
    prisma.request.count(),
    prisma.task.count(),
    prisma.auditLog.count(),
  ]);

  return jsonOk({ org, counts: { users, departments, workflows, requests, tasks, auditLogs } });
}