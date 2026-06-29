import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      nickname: {
        contains: 'sonik',
        mode: 'insensitive'
      }
    },
    include: {
      playerNeeds: true
    }
  });

  console.log('Znalezieni użytkownicy:', JSON.stringify(users, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
