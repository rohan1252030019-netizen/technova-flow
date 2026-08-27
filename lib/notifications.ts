import { prisma } from "@/lib/db";
import { NotificationType } from "@/app/generated/prisma/client";
import { sendEmail, buildNotificationEmailHtml } from "@/lib/email";

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
      },
    });

    // Asynchronously dispatch external email notification
    prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true, name: true },
    }).then((user) => {
      if (user?.email) {
        const html = buildNotificationEmailHtml({
          recipientName: user.name,
          type: params.type,
          title: params.title,
          body: params.body,
          link: params.link,
        });
        sendEmail({
          to: user.email,
          subject: params.title,
          html,
          text: params.body || params.title,
        }).catch((err) => console.error("Email send failed:", err));
      }
    }).catch(() => {});

    return notif;
  } catch (e) {
    console.error("notification failed", e);
  }
}

export async function notifyMany(params: {
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    if (!params.userIds.length) return;

    await prisma.notification.createMany({
      data: params.userIds.map((userId) => ({
        userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link,
      })),
    });

    // Asynchronously dispatch external emails to all recipients
    prisma.user.findMany({
      where: { id: { in: params.userIds } },
      select: { email: true, name: true },
    }).then((users) => {
      for (const u of users) {
        if (u.email) {
          const html = buildNotificationEmailHtml({
            recipientName: u.name,
            type: params.type,
            title: params.title,
            body: params.body,
            link: params.link,
          });
          sendEmail({
            to: u.email,
            subject: params.title,
            html,
            text: params.body || params.title,
          }).catch((err) => console.error("Email dispatch failed:", err));
        }
      }
    }).catch(() => {});
  } catch (e) {
    console.error("notifications failed", e);
  }
}