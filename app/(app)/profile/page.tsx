import { requireUser } from "@/lib/auth";
import { ProfileClient } from "@/components/profile-client";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireUser();
  return <ProfileClient />;
}