import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "notifications.view");
  if (error || !user) return error;

  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") || 20));
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return jsonOk({ notifications, unread, page, limit });
}