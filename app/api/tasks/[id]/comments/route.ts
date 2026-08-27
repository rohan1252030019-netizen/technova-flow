import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "tasks.view");
  if (error || !user) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text || text.length < 2) return jsonError("Comment must be at least 2 characters", 422);

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return jsonError("Task not found", 404);

  const isAssignee = task.assigneeId === user.id;
  const canComment = isAssignee || ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD"].includes(user.role);
  if (!canComment) return jsonError("You are not authorized to comment on this task.", 403);

  const comment = await prisma.comment.create({
    data: { body: text, userId: user.id, taskId: id },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "COMMENT_ADDED",
    entityType: "Task",
    entityId: id,
    details: { title: task.title },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ comment }, "Comment added", 201);
}