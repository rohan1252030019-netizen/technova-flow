import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notifications";
import { advanceRequest, getWorkflowWithSteps, resolveEscalation, firstActionableStep } from "@/lib/services/workflow-engine";
import { ApprovalAction, Role, RequestStatus } from "@/app/generated/prisma/client";

const ACTIONS = ["APPROVED", "REJECTED", "SEND_BACK", "REQUEST_CHANGES", "DELEGATED", "ESCALATED"] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const action = body.action as ApprovalAction;
  if (!ACTIONS.includes(action as never)) return jsonError("Invalid action", 422);

  const requiredPerm =
    action === "ESCALATED"
      ? "requests.escalate"
      : action === "DELEGATED"
      ? "approvals.delegate"
      : "approvals.approve";

  const { user, error } = await requireApiPermission(req, requiredPerm);
  if (error || !user) return error;

  const request = await prisma.request.findUnique({
    where: { id },
    include: { requester: { select: { id: true, name: true, managerId: true } } },
  });
  if (!request) return jsonError("Request not found", 404);

  const step = request.currentStepId
    ? await prisma.workflowStep.findUnique({ where: { id: request.currentStepId } })
    : null;
  if (!step) return jsonError("Request has no active step", 400);

  const workflow = await getWorkflowWithSteps(request.workflowId || "");

  // ── Authorization: can this user act on this step? ──
  const matchesRole = step.assigneeType === "ROLE" && step.assignedRole === user.role;
  const matchesUser = step.assigneeType === "USER" && (step.assignedUserId === user.id || request.assignedUserId === user.id);
  const matchesDept = step.assigneeType === "DEPARTMENT" && step.assignedDepartmentId === user.departmentId;
  const isAdmin = ["SUPER_ADMIN", "HR_ADMIN"].includes(user.role);

  if (action === "ESCALATED") {
    if (!matchesRole && !matchesUser && !matchesDept && !isAdmin) {
      return jsonError("You are not authorized to escalate this request.", 403);
    }
  } else if (!matchesRole && !matchesUser && !matchesDept && !isAdmin) {
    return jsonError("You are not authorized to perform this action on this step.", 403);
  }

  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (action === "REJECTED" && !comment) {
    return jsonError("A rejection reason is required.", 422);
  }
  if (action === "REQUEST_CHANGES" && !comment) {
    return jsonError("A change request comment is required.", 422);
  }
  if (action === "SEND_BACK" && !comment) {
    return jsonError("A comment is required when sending back.", 422);
  }
  if (step.requiresComment && !comment) {
    return jsonError("A comment is required for this step.", 422);
  }
  if (action === "REJECTED" && !step.allowRejection) {
    return jsonError("Rejection is not allowed for this step.", 403);
  }

  const alreadyActed = await prisma.approval.findUnique({
    where: { requestId_stepId: { requestId: id, stepId: step.id } },
  });
  if (alreadyActed) {
    return jsonError("This step has already been actioned. Refresh to see the latest state.", 409);
  }

  const ip = await getClientIp(req);
  const ua = req.headers.get("user-agent");

  await prisma.$transaction(async (tx) => {
    await tx.approval.create({
      data: {
        requestId: id,
        stepId: step.id,
        approverId: user.id,
        action,
        comment: comment || null,
      },
    });

    if (action === "APPROVED") {
      await advanceRequest(tx as never, request, workflow);
    } else if (action === "REJECTED") {
      await tx.request.update({
        where: { id },
        data: { status: "REJECTED", completedAt: new Date(), dueDate: null, assignedUserId: null },
      });
    } else if (action === "SEND_BACK" || action === "REQUEST_CHANGES") {
      const firstStep = workflow?.steps[0];
      if (firstStep) {
        await tx.request.update({
          where: { id },
          data: {
            status: "SUBMITTED",
            currentStepId: firstStep.id,
            currentStepOrder: firstStep.order,
            assignedUserId: firstStep.assigneeType === "USER" ? firstStep.assignedUserId : null,
            dueDate: null,
          },
        });
      }
    } else if (action === "ESCALATED") {
      await tx.request.update({ where: { id }, data: { status: "ESCALATED" } });
      await tx.escalation.create({
        data: {
          requestId: id,
          stepId: step.id,
          initiatedById: user.id,
          escalatedToId: request.requester.managerId || user.id,
          reason: comment || "Escalated by approver",
        },
      });
    } else if (action === "DELEGATED") {
      const delegatee = body.delegateToId || null;
      if (delegatee) {
        await tx.request.update({ where: { id }, data: { assignedUserId: delegatee } });
      }
    }

    if (action === "APPROVED") {
      const nextStep = firstActionableStep(workflow?.steps ?? [], request.currentStepOrder ?? 0);
      if (nextStep && nextStep.assigneeType === "ROLE" && nextStep.assignedRole) {
        const assignees = await tx.user.findMany({
          where: { role: nextStep.assignedRole as Role, status: "ACTIVE" },
          select: { id: true },
        });
        if (assignees.length) {
          await notifyMany({
            userIds: assignees.map((a) => a.id),
            type: "APPROVAL_REQUIRED",
            title: `Approval required — ${request.requestNumber}`,
            body: request.title,
            link: `/requests/${id}`,
          });
        }
      }
    }
  });

  const requesterId = request.requesterId;
  if (action === "APPROVED" && !firstActionableStep(workflow?.steps ?? [], request.currentStepOrder ?? 0)) {
    await notify({
      userId: requesterId,
      type: "WORKFLOW_COMPLETED",
      title: "Request completed",
      body: `${request.requestNumber} — ${request.title} has been fully processed.`,
      link: `/requests/${id}`,
    });
  } else if (action === "REJECTED") {
    await notify({
      userId: requesterId,
      type: "REQUEST_REJECTED",
      title: "Request rejected",
      body: `${request.requestNumber} was rejected: ${comment || "No reason provided"}`,
      link: `/requests/${id}`,
    });
  } else if (action === "SEND_BACK" || action === "REQUEST_CHANGES") {
    await notify({
      userId: requesterId,
      type: "REQUEST_RETURNED",
      title: action === "SEND_BACK" ? "Request sent back" : "Changes requested",
      body: `${request.requestNumber} — ${comment}`,
      link: `/requests/${id}`,
    });
  } else if (action === "ESCALATED") {
    await notify({
      userId: request.requester.managerId || requesterId,
      type: "ESCALATION",
      title: `Request escalated — ${request.requestNumber}`,
      body: request.title,
      link: `/requests/${id}`,
    });
  }

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: `REQUEST_${action}`,
    entityType: "Request",
    entityId: id,
    details: { requestNumber: request.requestNumber, step: step.name, action, comment: comment || undefined },
    ip,
    userAgent: ua,
  });

  return jsonOk(null, `Request ${action.toLowerCase().replace(/_/g, " ")}`);
}