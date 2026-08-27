import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { advanceRequest, getWorkflowWithSteps, firstActionableStep } from "@/lib/services/workflow-engine";
import { TaskStatus } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "tasks.view");
  if (error) return error;

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarColor: true } },
      department: { select: { id: true, name: true } },
      request: { select: { id: true, requestNumber: true, title: true, status: true } },
      createdBy: { select: { id: true, name: true } },
      comments: { include: { user: { select: { id: true, name: true, avatarColor: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) return jsonError("Task not found", 404);

  const isAssignee = task.assigneeId === user.id;
  const canViewAll = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);
  if (!isAssignee && !canViewAll) {
    return jsonError("You are not authorized to view this task.", 403);
  }

  return jsonOk({ task });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "tasks.update");
  if (error || !user) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return jsonError("Task not found", 404);

  const isAssignee = task.assigneeId === user.id;
  const canManage = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD"].includes(user.role);

  const data: Record<string, unknown> = {};
  if (body.status && Object.values(TaskStatus).includes(body.status as TaskStatus)) {
    if (!isAssignee && !canManage) return jsonError("Only the assignee or a manager can change status.", 403);
    data.status = body.status;
    if (body.status === "COMPLETED") data.completedAt = new Date();
    if (body.status !== "COMPLETED") data.completedAt = null;
  }
  if (body.title !== undefined && typeof body.title === "string" && body.title.trim().length >= 3) {
    if (!canManage) return jsonError("Only managers can edit task details.", 403);
    data.title = body.title.trim();
  }
  if (body.description !== undefined && typeof body.description === "string") {
    if (!canManage) return jsonError("Only managers can edit task details.", 403);
    data.description = body.description.trim() || null;
  }
  if (body.dueDate !== undefined) {
    if (!canManage) return jsonError("Only managers can edit task details.", 403);
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.assigneeId !== undefined) {
    if (!canManage) return jsonError("Only managers can reassign tasks.", 403);
    data.assigneeId = body.assigneeId;
  }

  if (Object.keys(data).length === 0) return jsonError("Nothing to update", 400);

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: { assignee: { select: { id: true, name: true } } },
  });

  if (body.status === "COMPLETED" && task.requestId && task.stepId && !task.completedAt) {
    const request = await prisma.request.findUnique({ where: { id: task.requestId } });
    if (request && request.currentStepId === task.stepId) {
      const stepId: string = task.stepId;
      const workflow = await getWorkflowWithSteps(request.workflowId || "");
      const hasMore = firstActionableStep(workflow?.steps ?? [], request.currentStepOrder ?? 0);
      const ip = await getClientIp(req);
      const ua = req.headers.get("user-agent");

      await prisma.$transaction(async (tx) => {
        await tx.approval.create({
          data: {
            requestId: request.id,
            stepId,
            approverId: user.id,
            action: "APPROVED",
            comment: `Task completed — ${task.title}`,
          },
        });
        await advanceRequest(tx as never, request, workflow);
      });

      await audit({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        action: "REQUEST_APPROVED",
        entityType: "Request",
        entityId: request.id,
        details: { requestNumber: request.requestNumber, stepId, via: "task-completion", task: task.id },
        ip,
        userAgent: ua,
      });

      if (!hasMore) {
        await notify({
          userId: request.requesterId,
          type: "WORKFLOW_COMPLETED",
          title: "Request completed",
          body: `${request.requestNumber} — ${request.title} has been fully processed.`,
          link: `/requests/${request.id}`,
        });
      }
    }
  }

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "TASK_UPDATED",
    entityType: "Task",
    entityId: id,
    details: { title: task.title, changes: Object.keys(data) },
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  if (body.status === "COMPLETED") {
    await notify({
      userId: task.createdById,
      type: "TASK_ASSIGNED",
      title: "Task completed",
      body: `${task.title} was completed by ${user.name}`,
      link: `/tasks/${id}`,
    });
  }
  if (body.assigneeId && body.assigneeId !== task.assigneeId) {
    await notify({
      userId: body.assigneeId,
      type: "TASK_ASSIGNED",
      title: "Task reassigned to you",
      body: task.title,
      link: `/tasks/${id}`,
    });
  }

  return jsonOk({ task: updated }, "Task updated");
}