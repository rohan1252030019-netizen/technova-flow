import { requireUser } from "@/lib/auth";
import { RequestDetailClient } from "@/components/request-detail-client";

export const metadata = { title: "Request Detail" };

export default async function RequestDetailPage() {
  const user = await requireUser();
  return <RequestDetailClient userId={user.id} />;
}