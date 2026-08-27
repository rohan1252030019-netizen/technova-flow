import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "notifications.view");
  if (error || !user) return error;

  const count = await prisma.notification.count({ where: { userId: user.id, read: false } });
  return jsonOk({ count });
}