import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { RequestStatus } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "requests.view");
  if (error) return error;

  const { id } = await params;
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true, departmentId: true, managerId: true } },
      department: { select: { id: true, name: true } },
      workflow: { select: { id: true, name: true, steps: { orderBy: { order: "asc" } } } },
      currentStep: true,
      assignedUser: { select: { id: true, name: true, email: true } },
      approvals: {
        include: { approver: { select: { id: true, name: true, email: true } }, step: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      comments: { include: { user: { select: { id: true, name: true, avatarColor: true } } }, orderBy: { createdAt: "asc" } },
      attachments: { include: { uploader: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      escalations: { include: { escalatedTo: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      tasks: { select: { id: true, title: true, status: true } },
      slaSnapshots: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) return jsonError("Request not found", 404);

  const isOwnRequest = request.requesterId === user.id;
  const isAssignee = request.assignedUserId === user.id;
  const isManagerOfRequester = request.requester.managerId === user.id;
  const canViewAll = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);

  if (!isOwnRequest && !isAssignee && !isManagerOfRequester && !canViewAll) {
    return jsonError("You are not authorized to view this request.", 403);
  }

  return jsonOk({ request });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "requests.assign");
  if (error || !user) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return jsonError("Request not found", 404);

  const isOwnRequest = request.requesterId === user.id;
  const isManager = ["MANAGER", "DEPARTMENT_HEAD", "SUPER_ADMIN", "HR_ADMIN", "FINANCE"].includes(user.role);

  const data: Record<string, unknown> = {};

  if (body.action === "cancel") {
    if (!isOwnRequest && !isManager) return jsonError("Only the requester or a manager can cancel this request.", 403);
    if (["COMPLETED", "REJECTED", "CANCELLED", "APPROVED"].includes(request.status)) {
      return jsonError("This request can no longer be cancelled.", 400);
    }
    data.status = "CANCELLED";
  } else {
    if (body.assignedUserId !== undefined) {
      if (!isManager) return jsonError("Only managers can reassign this request.", 403);
      data.assignedUserId = body.assignedUserId || null;
    }
    if (body.priority !== undefined && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(body.priority)) {
      data.priority = body.priority;
    }
    if (body.title !== undefined && typeof body.title === "string" && body.title.trim().length >= 3) {
      if (!isOwnRequest && !isManager) return jsonError("Only the requester or a manager can edit this request.", 403);
      data.title = body.title.trim();
    }
    if (body.description !== undefined && typeof body.description === "string") {
      data.description = body.description.trim() || null;
    }
  }

  if (Object.keys(data).length === 0) return jsonError("Nothing to update", 400);

  const updated = await prisma.request.update({ where: { id }, data });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: data.status === "CANCELLED" ? "REQUEST_CANCELLED" : "REQUEST_UPDATED",
    entityType: "Request",
    entityId: id,
    details: { requestNumber: request.requestNumber, changes: Object.keys(data) },
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ request: updated }, data.status === "CANCELLED" ? "Request cancelled" : "Request updated");
}