import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { sanitizeFileName } from "@/lib/sanitize";
import { enforceRateLimit } from "@/lib/rate-limit";

const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "text/plain": [".txt"],
};

const MAX_SIZE = Number(process.env.MAX_UPLOAD_SIZE_MB || 10) * 1024 * 1024;
const UPLOAD_ROOT = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");

/**
 * Validates file signature (magic bytes) to prevent disguised executable uploads
 */
function isValidFileSignature(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 4) return false;

  if (mime === "application/pdf") {
    return buffer.subarray(0, 4).toString() === "%PDF";
  }
  if (mime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    // ZIP / OpenXML header (PK\x03\x04)
    return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  }
  // Plain text / standard office doc
  return true;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitError = await enforceRateLimit(req, { prefix: "upload", maxRequests: 15, windowMs: 60000 });
  if (rateLimitError) return rateLimitError;

  const { user, error } = await requireApiPermission(req, "requests.view");
  if (error || !user) return error;

  const { id } = await params;
  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return jsonError("Request not found", 404);

  const isRelated =
    request.requesterId === user.id ||
    request.assignedUserId === user.id ||
    ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);
  if (!isRelated) return jsonError("You are not authorized to upload to this request.", 403);

  const formData = await req.formData().catch(() => null);
  if (!formData) return jsonError("Invalid upload", 400);

  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError("No file provided", 422);

  const mime = file.type.toLowerCase();
  const allowedExt = ALLOWED_TYPES[mime];
  if (!allowedExt) {
    return jsonError("File type not allowed. Allowed: PDF, DOC/DOCX, XLS/XLSX, PNG/JPG.", 422);
  }

  if (file.size > MAX_SIZE) {
    return jsonError(`File exceeds ${process.env.MAX_UPLOAD_SIZE_MB || 10}MB limit`, 422);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Deep inspection: verify file signature against declared MIME type
  if (!isValidFileSignature(buffer, mime)) {
    return jsonError("File content does not match the declared file extension.", 422);
  }

  const originalName = sanitizeFileName(file.name);
  const ext = allowedExt[0];
  const storedName = `${crypto.randomUUID()}${ext}`;

  const dir = path.join(UPLOAD_ROOT, id.slice(0, 8));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), buffer);

  const attachment = await prisma.attachment.create({
    data: {
      requestId: id,
      uploaderId: user.id,
      originalName,
      storedName,
      mimeType: mime,
      size: file.size,
      path: path.relative(process.cwd(), path.join(dir, storedName)),
    },
    include: { uploader: { select: { id: true, name: true } } },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "DOCUMENT_UPLOADED",
    entityType: "Request",
    entityId: id,
    details: { requestNumber: request.requestNumber, fileName: originalName, size: file.size, mime },
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ attachment }, "File uploaded securely", 201);
}