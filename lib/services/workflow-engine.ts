import { prisma, PrismaTx } from "@/lib/db";
import {
  Request,
  RequestStatus,
  RequestPriority,
  TaskPriority,
  Workflow,
  WorkflowStep,
  ApprovalAction,
  Role,
  AssigneeType,
} from "@/app/generated/prisma/client";

export type WorkflowWithSteps = Workflow & { steps: WorkflowStep[] };

const STEP_STATUS_MAP: Record<StepKind, RequestStatus> = {
  APPROVAL: "PENDING_APPROVAL",
  PROCESSING: "IN_PROGRESS",
  TASK: "IN_PROGRESS",
};

type StepKind = "APPROVAL" | "PROCESSING" | "TASK";

export function stepRequestStatus(step: WorkflowStep): RequestStatus {
  const kind = step.stepType;
  return kind === "APPROVAL" ? "PENDING_APPROVAL" : "IN_PROGRESS";
}

export function isActionableStep(step: WorkflowStep): boolean {
  if (step.stepType === "APPROVAL" || step.stepType === "TASK") return true;
  if (step.stepType === "PROCESSING") {
    return !!(step.assignedUserId || step.assignedRole || step.assignedDepartmentId);
  }
  return false;
}

export function firstActionableStep(steps: WorkflowStep[], afterOrder = -1): WorkflowStep | null {
  return steps.find((s) => s.order > afterOrder && isActionableStep(s)) ?? null;
}

export async function getActiveWorkflowForType(type: string): Promise<WorkflowWithSteps | null> {
  return prisma.workflow.findFirst({
    where: { trigger: type as never, status: "ACTIVE" },
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWorkflowWithSteps(id: string): Promise<WorkflowWithSteps | null> {
  return prisma.workflow.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: "asc" } } },
  });
}

async function nextRequestNumber(db: PrismaTx): Promise<string> {
  const count = await db.request.count();
  return `REQ-${String(count + 1001)}`;
}

export async function startWorkflowInstance(input: {
  db?: PrismaTx;
  type: string;
  title: string;
  description?: string | null;
  requesterId: string;
  departmentId?: string | null;
  priority?: RequestPriority;
  amount?: string | number | null;
  currency?: string;
  metadata?: Record<string, unknown>;
  workflowId?: string;
}): Promise<Request> {
  const db = input.db ?? prisma;
  const workflow = input.workflowId
    ? await getWorkflowWithSteps(input.workflowId)
    : await getActiveWorkflowForType(input.type);

  const steps = workflow?.steps ?? [];
  const firstStep = firstActionableStep(steps) ?? null;

  const status: RequestStatus = firstStep ? stepRequestStatus(firstStep) : "COMPLETED";
  const dueDate = firstStep?.slaHours
    ? new Date(Date.now() + firstStep.slaHours * 60 * 60 * 1000)
    : null;

  const request = await db.request.create({
    data: {
      requestNumber: await nextRequestNumber(db),
      type: input.type as never,
      title: input.title,
      description: input.description,
      requesterId: input.requesterId,
      departmentId: input.departmentId,
      workflowId: workflow?.id,
      status,
      priority: input.priority ?? "MEDIUM",
      currentStepId: firstStep?.id,
      currentStepOrder: firstStep?.order ?? 0,
      assignedUserId: resolveStepAssignee(firstStep),
      amount: input.amount != null ? Number(input.amount) : undefined,
      currency: input.currency,
      metadata: (input.metadata ?? undefined) as never,
      startedAt: firstStep ? new Date() : null,
      dueDate,
      createdById: input.requesterId,
    },
  });

  if (firstStep?.slaHours) {
    await db.slaSnapshot.create({
      data: {
        requestId: request.id,
        stepId: firstStep.id,
        stepName: firstStep.name,
        slaHours: firstStep.slaHours,
        startedAt: new Date(),
        dueAt: dueDate!,
      },
    });
  }

  return request;
}

export function resolveStepAssignee(step: WorkflowStep | null): string | null {
  if (!step) return null;
  if (step.assigneeType === "USER" && step.assignedUserId) return step.assignedUserId;
  return null;
}

export async function assignStepAssignee(
  db: PrismaTx,
  step: WorkflowStep,
  requestId: string
): Promise<string | null> {
  const request = await db.request.findUnique({
    where: { id: requestId },
    select: { requesterId: true, assignedUserId: true },
  });
  let userId: string | null = null;

  if (step.assigneeType === "USER") {
    userId = step.assignedUserId ?? request?.requesterId ?? null;
  } else if (step.assigneeType === "ROLE" && step.assignedRole) {
    const user = await db.user.findFirst({
      where: { role: step.assignedRole as Role, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    userId = user?.id ?? null;
  } else if (step.assigneeType === "DEPARTMENT") {
    const user = await db.user.findFirst({
      where: {
        departmentId: step.assignedDepartmentId ?? undefined,
        status: "ACTIVE",
        OR: [
          { role: "MANAGER" as Role },
          { role: "DEPARTMENT_HEAD" as Role },
          { role: "FINANCE" as Role },
          { role: "HR_ADMIN" as Role },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    userId = user?.id ?? null;
  }

  if (userId) {
    await db.request.update({ where: { id: requestId }, data: { assignedUserId: userId } });
  }
  return userId;
}

export async function advanceRequest(
  db: PrismaTx,
  request: Request,
  workflow: WorkflowWithSteps | null,
  action: ApprovalAction = "APPROVED"
): Promise<Request> {
  if (!workflow || workflow.steps.length === 0) {
    return db.request.update({
      where: { id: request.id },
      data: { status: "COMPLETED", currentStepId: null, completedAt: new Date() },
    });
  }

  const currentOrder = request.currentStepOrder ?? 0;
  const nextStep = firstActionableStep(workflow.steps, currentOrder) ?? null;

  if (!nextStep) {
    const finalStep = workflow.steps[workflow.steps.length - 1];
    if (finalStep && isActionableStep(finalStep)) {
      await db.request.update({
        where: { id: request.id },
        data: { currentStepId: finalStep.id, currentStepOrder: finalStep.order },
      });
    }
    return db.request.update({
      where: { id: request.id },
      data: { status: "COMPLETED", currentStepId: null, completedAt: new Date(), dueDate: null },
    });
  }

  const dueDate = nextStep.slaHours
    ? new Date(Date.now() + nextStep.slaHours * 60 * 60 * 1000)
    : null;

  const updated = await db.request.update({
    where: { id: request.id },
    data: {
      currentStepId: nextStep.id,
      currentStepOrder: nextStep.order,
      status: stepRequestStatus(nextStep),
      dueDate,
      assignedUserId: resolveStepAssignee(nextStep),
    },
  });

  const assignedUserId = await assignStepAssignee(db, nextStep, request.id);

  if (nextStep.stepType === "TASK" && assignedUserId) {
    const task = await db.task.create({
      data: {
        title: nextStep.name,
        description: nextStep.description || `Task generated by workflow step "${nextStep.name}" for ${request.requestNumber}.`,
        requestId: request.id,
        stepId: nextStep.id,
        assigneeId: assignedUserId,
        departmentId: request.departmentId,
        createdById: request.requesterId,
        priority: request.priority as TaskPriority,
        dueDate,
        status: "TODO",
      },
    });
    await db.notification.create({
      data: {
        userId: assignedUserId,
        type: "TASK_ASSIGNED",
        title: "New task assigned to you",
        body: `${request.requestNumber} — ${nextStep.name}`,
        link: `/tasks/${task.id}`,
      },
    });
  }

  if (nextStep.slaHours && dueDate) {
    await db.slaSnapshot.create({
      data: {
        requestId: request.id,
        stepId: nextStep.id,
        stepName: nextStep.name,
        slaHours: nextStep.slaHours,
        startedAt: new Date(),
        dueAt: dueDate,
      },
    });
  }

  return updated;
}

export async function markEscalated(db: PrismaTx, request: Request): Promise<Request> {
  return db.request.update({
    where: { id: request.id },
    data: { status: "ESCALATED" },
  });
}

export async function resolveEscalation(db: PrismaTx, requestId: string): Promise<void> {
  await db.escalation.updateMany({
    where: { requestId, resolved: false },
    data: { resolved: true, resolvedAt: new Date() },
  });
  await db.request.update({
    where: { id: requestId },
    data: { status: "PENDING_APPROVAL" },
  });
}