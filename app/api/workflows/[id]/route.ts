import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission } from "@/lib/api";
import { audit } from "@/lib/audit";
import { RequestType, WorkflowStatus, StepType, AssigneeType, Role } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "workflows.view");
  if (error) return error;

  const { id } = await params;
  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" }, include: { conditions: true } },
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { requests: true } },
    },
  });
  if (!workflow) return jsonError("Workflow not found", 404);

  return jsonOk({ workflow });
}

const VALID_STEP_FIELDS = ["name", "description", "stepType", "assigneeType", "assignedRole", "assignedDepartmentId", "assignedUserId", "requiresApproval", "allowRejection", "requiresComment", "slaHours", "escalationHours", "escalationAssigneeType", "escalationRole", "escalationUserId", "isFinal"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "workflows.update");
  if (error || !user) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const existing = await prisma.workflow.findUnique({ where: { id } });
  if (!existing) return jsonError("Workflow not found", 404);

  const hasActiveRequests = await prisma.request.count({ where: { workflowId: id } });
  if (hasActiveRequests > 0 && body.steps && existing.status === "ACTIVE") {
    return jsonError("Cannot modify steps of an active workflow with running requests. Create a new version instead.", 409);
  }

  const wfData: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) wfData.name = body.name.trim();
  if (typeof body.description === "string") wfData.description = body.description.trim() || null;
  if (body.trigger && Object.values(RequestType).includes(body.trigger)) wfData.trigger = body.trigger;
  if (body.status && Object.values(WorkflowStatus).includes(body.status)) wfData.status = body.status;
  if ("departmentId" in body) wfData.departmentId = body.departmentId || null;

  if (Array.isArray(body.steps)) {
    await prisma.workflowStep.deleteMany({ where: { workflowId: id } });
    for (let i = 0; i < body.steps.length; i++) {
      const s = body.steps[i];
      const stepData: Record<string, unknown> = {};
      for (const field of VALID_STEP_FIELDS) {
        if (field in s) stepData[field] = s[field] ?? null;
      }
      stepData.order = i;
      stepData.workflowId = id;
      stepData.stepType = s.stepType && Object.values(StepType).includes(s.stepType) ? s.stepType : "APPROVAL";
      stepData.assigneeType = s.assigneeType && Object.values(AssigneeType).includes(s.assigneeType) ? s.assigneeType : "ROLE";
      if (s.assignedRole && Object.values(Role).includes(s.assignedRole)) stepData.assignedRole = s.assignedRole;
      else stepData.assignedRole = null;
      if (s.escalationRole && Object.values(Role).includes(s.escalationRole)) stepData.escalationRole = s.escalationRole;
      else stepData.escalationRole = null;

      await prisma.workflowStep.create({ data: stepData as never });
    }
  }

  const updated = await prisma.workflow.update({
    where: { id },
    data: wfData,
    include: { steps: { orderBy: { order: "asc" } } },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: body.status === "ACTIVE" ? "WORKFLOW_PUBLISHED" : "WORKFLOW_UPDATED",
    entityType: "Workflow",
    entityId: id,
    details: { name: updated.name, status: updated.status, stepCount: updated.steps.length },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ workflow: updated }, body.status === "ACTIVE" ? "Workflow published" : "Workflow updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "workflows.update");
  if (error || !user) return error;

  const { id } = await params;
  const activeRequests = await prisma.request.count({ where: { workflowId: id } });
  if (activeRequests > 0) {
    return jsonError("This workflow has requests linked to it. Deactivate it instead.", 409);
  }

  await prisma.workflow.delete({ where: { id } });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "WORKFLOW_DELETED",
    entityType: "Workflow",
    entityId: id,
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk(null, "Workflow deleted");
}