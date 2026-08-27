import { requireUser } from "@/lib/auth";
import { NotificationsClient } from "@/components/notifications-client";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireUser();
  return <NotificationsClient />;
}