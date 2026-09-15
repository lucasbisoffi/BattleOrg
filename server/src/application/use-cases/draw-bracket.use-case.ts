import { prisma } from '../../infra/db/prisma.js';

interface QuarterPairing {
  quarterOrder: number; // 1, 2, 3 ou 4
  competitorSeedA: number; // Ex: 1 (Artórias)
  competitorSeedB: number; // Ex: 5 (Jacó)
}

interface DrawBracketInput {
  editionId: string;
  pairings: QuarterPairing[]; // Os 4 duelos decididos com a plateia
}

export class DrawBracketUseCase {
  async execute(input: DrawBracketInput) {
    const { editionId, pairings } = input;

    if (pairings.length !== 4) {
      throw new Error('Para uma chave de 8, você precisa definir os 4 confrontos de quartas de final.');
    }

    // 1. Buscar os competidores dessa edição para mapear semente (seedNumber) -> ID
    const competitors = await prisma.competitor.findMany({
      where: { editionId },
    });

    const seedToCompetitorId = new Map<number, string>();
    for (const comp of competitors) {
      if (comp.seedNumber) {
        seedToCompetitorId.set(comp.seedNumber, comp.id);
      }
    }

    // 2. Buscar as 4 partidas de Quartas de Final dessa edição
    const quarterMatches = await prisma.match.findMany({
      where: {
        editionId,
        phase: 'QUARTERS',
      },
      orderBy: { orderInPhase: 'asc' },
    });

    // 3. Atualizar cada partida de quartas com os competidores sorteados
    return await prisma.$transaction(async (tx) => {
      for (const pair of pairings) {
        const match = quarterMatches.find((m) => m.orderInPhase === pair.quarterOrder);
        if (!match) continue;

        const competitorAId = seedToCompetitorId.get(pair.competitorSeedA);
        const competitorBId = seedToCompetitorId.get(pair.competitorSeedB);

        if (!competitorAId || !competitorBId) {
          throw new Error(`Sementes ${pair.competitorSeedA} ou ${pair.competitorSeedB} inválidas.`);
        }

        await tx.match.update({
          where: { id: match.id },
          data: {
            competitorAId,
            competitorBId,
          },
        });
      }

      // Muda o status da edição para EM PROGRESSO! A batalha começou!
      await tx.edition.update({
        where: { id: editionId },
        data: { status: 'IN_PROGRESS' },
      });

      return { message: 'Sorteio da plateia realizado com sucesso! Chave iniciada.' };
    });
  }
}