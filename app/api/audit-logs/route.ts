import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission, getPagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { error } = await requireApiPermission(req, "audit.view");
  if (error) return error;

  const { page, pageSize, skip } = getPagination(req);
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entityType");
  const q = url.searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (q) {
    where.OR = [
      { userEmail: { contains: q, mode: "insensitive" } },
      { userName: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return jsonOk({ logs, total, page, pageSize });
}