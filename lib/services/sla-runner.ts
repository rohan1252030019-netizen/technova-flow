import { prisma } from "@/lib/db";
import { notify, notifyMany } from "@/lib/notifications";
import { Role } from "@/app/generated/prisma/client";

export type SlaCheckResults = {
  breached: number;
  escalated: number;
  tasksOverdue: number;
  timestamp: string;
};

/**
 * Runs a complete SLA breach check, escalations, and overdue task notifications sweep.
 */
export async function runSlaCheck(): Promise<SlaCheckResults> {
  const now = new Date();
  const results: SlaCheckResults = {
    breached: 0,
    escalated: 0,
    tasksOverdue: 0,
    timestamp: now.toISOString(),
  };

  const pendingRequests = await prisma.request.findMany({
    where: {
      status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED", "IN_PROGRESS"] },
      dueDate: { lt: now },
      currentStepId: { not: null },
    },
    include: {
      currentStep: true,
      workflow: { include: { steps: { orderBy: { order: "asc" } } } },
      requester: { select: { id: true, managerId: true } },
    },
  });

  for (const request of pendingRequests) {
    const step = request.currentStep;
    if (!step) continue;

    const dueAt = request.dueDate!;
    const overdueHours = Math.floor((now.getTime() - dueAt.getTime()) / 3600000);

    await prisma.slaSnapshot.updateMany({
      where: { requestId: request.id, stepId: step.id, breached: false },
      data: { breached: true, breachedAt: now },
    });
    results.breached++;

    let escalatedToId: string | null = null;

    if (step.escalationHours && overdueHours >= step.escalationHours) {
      if (step.escalationAssigneeType === "USER" && step.escalationUserId) {
        escalatedToId = step.escalationUserId;
      } else if (step.escalationRole) {
        const user = await prisma.user.findFirst({
          where: { role: step.escalationRole as Role, status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
        });
        escalatedToId = user?.id ?? null;
      } else {
        escalatedToId = request.requester.managerId;
      }

      if (escalatedToId) {
        const existing = await prisma.escalation.findFirst({
          where: { requestId: request.id, resolved: false },
        });
        if (!existing) {
          await prisma.escalation.create({
            data: {
              requestId: request.id,
              stepId: step.id,
              escalatedToId,
              reason: `SLA breached — step "${step.name}" overdue by ${overdueHours} hours`,
            },
          });
        }
        await prisma.request.update({
          where: { id: request.id },
          data: { status: "ESCALATED" },
        });
        await notify({
          userId: escalatedToId,
          type: "ESCALATION",
          title: `SLA escalation — ${request.requestNumber}`,
          body: `"${step.name}" is ${overdueHours}h overdue.`,
          link: `/requests/${request.id}`,
        });
        results.escalated++;
      } else {
        await notifyMany({
          userIds: [request.requester.id, request.requester.managerId ?? request.requester.id],
          type: "SLA_BREACHED",
          title: `SLA breached — ${request.requestNumber}`,
          body: `Step "${step.name}" is ${overdueHours}h overdue.`,
          link: `/requests/${request.id}`,
        });
      }
    } else {
      const stepAssignee = request.assignedUserId;
      const targets = [...new Set([stepAssignee, request.requester.managerId].filter(Boolean))] as string[];
      if (targets.length) {
        await notifyMany({
          userIds: targets,
          type: "SLA_BREACHED",
          title: `SLA breached — ${request.requestNumber}`,
          body: `Step "${step.name}" is ${overdueHours}h overdue.`,
          link: `/requests/${request.id}`,
        });
      }
    }
  }

  // Overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueDate: { lt: now } },
    select: { id: true, title: true, assigneeId: true, dueDate: true },
  });
  results.tasksOverdue = overdueTasks.length;
  for (const t of overdueTasks) {
    const h = Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / 3600000);
    await notify({
      userId: t.assigneeId,
      type: "TASK_OVERDUE",
      title: `Task overdue — ${t.title}`,
      body: `This task is ${h}h past its due date.`,
      link: `/tasks/${t.id}`,
    });
  }

  return results;
}
