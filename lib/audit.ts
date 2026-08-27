import { prisma } from "@/lib/db";

type AuditInput = {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function audit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        userName: input.userName ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: (input.details ?? undefined) as never,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}