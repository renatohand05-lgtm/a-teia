import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.AUTH_EMAIL ?? "renato@a-teia.local").toLowerCase();
  const password = process.env.AUTH_PASSWORD ?? "altere-esta-senha-agora";
  const name = process.env.AUTH_NAME ?? "Renato";

  if (password.length < 8) {
    throw new Error("AUTH_PASSWORD deve ter ao menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash, role: "owner" },
  });

  console.log(`Usuário principal pronto: ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
