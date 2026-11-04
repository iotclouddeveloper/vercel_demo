import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("Missing ADMIN_PASSWORD in environment variables.");
  }

  const passwordHash = await hash(adminPassword, 12);
  await prisma.adminAuth.upsert({
    where: { id: 1 },
    update: { passwordHash },
    create: {
      id: 1,
      passwordHash,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
