import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { sanitizeText } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { prefix: "comments", maxRequests: 20, windowMs: 60000 });
  if (rateLimitError) return rateLimitError;

  const { user, error } = await requireApiPermission(req, "requests.view");
  if (error || !user) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const rawText = typeof body?.body === "string" ? body.body.trim() : "";
  const text = sanitizeText(rawText, 2000);

  if (!text || text.length < 2) return jsonError("Comment must be at least 2 characters", 422);

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return jsonError("Request not found", 404);

  const isRelated =
    request.requesterId === user.id ||
    request.assignedUserId === user.id ||
    ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);

  if (!isRelated) return jsonError("You are not authorized to comment on this request.", 403);

  const comment = await prisma.comment.create({
    data: { body: text, userId: user.id, requestId: id },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "COMMENT_ADDED",
    entityType: "Request",
    entityId: id,
    details: { requestNumber: request.requestNumber },
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  if (request.requesterId !== user.id) {
    await notify({
      userId: request.requesterId,
      type: "COMMENT_ADDED",
      title: `New comment on ${request.requestNumber}`,
      body: `${user.name}: ${text.slice(0, 120)}`,
      link: `/requests/${id}`,
    });
  }

  return jsonOk({ comment }, "Comment added", 201);
}