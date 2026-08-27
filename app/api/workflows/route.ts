import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, parseError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { RequestType, WorkflowStatus } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "workflows.view");
  if (error) return error;

  const workflows = await prisma.workflow.findMany({
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { steps: true, requests: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonOk({ workflows });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "workflows.create");
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return jsonError("Workflow name is required", 422);

  const created = await prisma.workflow.create({
    data: {
      name,
      description: body.description || null,
      trigger: (body.trigger as RequestType) || "CUSTOM",
      status: (body.status as WorkflowStatus) || "DRAFT",
      departmentId: body.departmentId || null,
      createdById: user.id,
    },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "WORKFLOW_CREATED",
    entityType: "Workflow",
    entityId: created.id,
    details: { name },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ workflow: created }, "Workflow created", 201);
}