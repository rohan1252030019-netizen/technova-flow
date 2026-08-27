import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { jsonError, requireApiUser } from "@/lib/api";

const UPLOAD_ROOT = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return error;

  const { id } = await params;
  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { request: { select: { id: true, requesterId: true, assignedUserId: true, title: true } } },
  });
  if (!attachment) return jsonError("Attachment not found", 404);

  const canDownload =
    attachment.uploaderId === user.id ||
    attachment.request?.requesterId === user.id ||
    attachment.request?.assignedUserId === user.id ||
    ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);
  if (!canDownload) return jsonError("You are not authorized to download this file.", 403);

  const filePath = path.isAbsolute(attachment.path)
    ? attachment.path
    : path.join(process.cwd(), attachment.path);

  try {
    const info = await stat(filePath);
    const stream = createReadStream(filePath);
    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return jsonError("File not found on disk", 404);
  }
}