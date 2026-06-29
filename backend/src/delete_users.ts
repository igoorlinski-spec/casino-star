import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const nicknames = ['sonik21', '12312123'];
  for (const nickname of nicknames) {
    // Znajdź użytkownika
    const user = await prisma.user.findUnique({
      where: { nickname }
    });

    if (user) {
      // Usuń mecze powiązane z tym użytkownikiem
      await prisma.matchHistory.deleteMany({
        where: {
          OR: [
            { player1Id: user.id },
            { player2Id: user.id },
            { winnerId: user.id }
          ]
        }
      });

      // Usuń samego użytkownika
      const res = await prisma.user.delete({
        where: { id: user.id }
      });
      console.log(`Usunięto gracza ${nickname}:`, res);
    } else {
      console.log(`Gracz ${nickname} nie istnieje.`);
    }
  }
}

main()
  .catch((e) => console.error('Błąd usuwania:', e))
  .finally(() => prisma.$disconnect());
