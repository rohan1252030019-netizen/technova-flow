import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getPagination, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { startWorkflowInstance, getWorkflowWithSteps, assignStepAssignee, firstActionableStep } from "@/lib/services/workflow-engine";
import { RequestType, RequestPriority } from "@/app/generated/prisma/client";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "requests.view");
  if (error) return error;

  const { page, pageSize, skip } = getPagination(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  const departmentId = url.searchParams.get("departmentId");
  const q = url.searchParams.get("q");
  const mine = url.searchParams.get("mine") === "true";

  const canViewAll = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (departmentId) where.departmentId = departmentId;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { requestNumber: { contains: q, mode: "insensitive" } },
    ];
  }
  if (mine || !canViewAll) {
    where.requesterId = user.id;
  }

  const [total, requests] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        workflow: { select: { id: true, name: true } },
        currentStep: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return jsonOk({ requests, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const rateLimitError = await enforceRateLimit(req, { prefix: "request_create", maxRequests: 30, windowMs: 60000 });
  if (rateLimitError) return rateLimitError;

  const { user, error } = await requireApiPermission(req, "requests.create");
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
  const title = sanitizeText(rawTitle, 200);
  const type = body.type as RequestType;
  const description = body.description ? sanitizeText(String(body.description), 5000) : null;

  if (!title || title.length < 3) return jsonError("Title must be at least 3 characters", 422);
  if (!Object.values(RequestType).includes(type)) return jsonError("Invalid request type", 422);

  let priority = body.priority as RequestPriority;
  if (!Object.values(RequestPriority).includes(priority)) priority = "MEDIUM";

  const activeWorkflow = await prisma.workflow.findFirst({
    where: { trigger: type as never, status: "ACTIVE" },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!activeWorkflow) {
    return jsonError(`No active workflow found for ${type.replace(/_/g, " ").toLowerCase()} requests. Contact an administrator.`, 422);
  }

  const request = await startWorkflowInstance({
    type,
    title,
    description,
    requesterId: user.id,
    departmentId: body.departmentId || user.departmentId || null,
    priority,
    amount: body.amount ?? null,
    currency: body.currency || "INR",
    metadata: body.metadata ?? undefined,
    workflowId: activeWorkflow.id,
  });

  const activeStep = firstActionableStep(activeWorkflow.steps);
  if (activeStep) {
    await assignStepAssignee(prisma, activeStep, request.id);
  }

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "REQUEST_CREATED",
    entityType: "Request",
    entityId: request.id,
    details: { requestNumber: request.requestNumber, type, title },
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  const manager = user.managerId
    ? await prisma.user.findUnique({ where: { id: user.managerId } })
    : null;
  if (manager) {
    await notify({
      userId: manager.id,
      type: "NEW_REQUEST",
      title: `New request from ${user.name}`,
      body: `${request.requestNumber} — ${title}`,
      link: `/requests/${request.id}`,
    });
  }
  await notify({
    userId: user.id,
    type: "NEW_REQUEST",
    title: "Request submitted",
    body: `${request.requestNumber} is now ${request.status.replace(/_/g, " ").toLowerCase()}.`,
    link: `/requests/${request.id}`,
  });

  return jsonOk({ request }, "Request submitted", 201);
}