import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission } from "@/lib/api";

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "notifications.view");
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (body?.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id },
      data: { read: true },
    });
  }

  return jsonOk(null, "Notifications updated");
}