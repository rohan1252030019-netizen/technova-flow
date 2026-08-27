import "dotenv/config";
import { prisma } from "../lib/db";

async function main() {
  const updated = await prisma.user.update({
    where: { id: "u-admin" },
    data: { name: "Rohan Kokatare" },
  });
  console.log("UPDATED:", updated.name, updated.email);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});