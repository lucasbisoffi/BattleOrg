import { prisma } from '../../infra/db/prisma.js';

interface CreateEditionInput {
  leagueId: string;
  editionNumber: number;
  bracketSize: 8 | 16;
  mcIds: string[]; // Lista com os IDs dos MCs que entrarão na chave
}

export class CreateEditionUseCase {
  async execute(input: CreateEditionInput) {
    const { leagueId, editionNumber, bracketSize, mcIds } = input;

    // Validação de Domínio
    if (mcIds.length !== bracketSize) {
      throw new Error(`Para uma chave de ${bracketSize}, você precisa fornecer exatamente ${bracketSize} MCs.`);
    }

    // Transação Atômica: Se der qualquer erro no meio, o Postgres desfaz tudo!
    return await prisma.$transaction(async (tx) => {
      // Cria a Edição
      const edition = await tx.edition.create({
        data: {
          leagueId,
          editionNumber,
          bracketSize,
          format: 'SOLO',
          status: 'REGISTRATION', // Começa em cadastro/sorteio
        },
      });

      // Cria os Competitors (Vagas de 1 a 8) e vincula cada MC ao seu número de sorteio
      const createdCompetitors = [];
      for (let i = 0; i < mcIds.length; i++) {
        const seedNumber = i + 1;
        const competitor = await tx.competitor.create({
          data: {
            editionId: edition.id,
            seedNumber,
            members: {
              create: {
                mcId: mcIds[i]!,
              },
            },
          },
          include: {
            members: {
              include: { mc: true },
            },
          },
        });
        createdCompetitors.push(competitor);
      }

      // Gerar a Árvore de Confrontos (7 partidas para chave de 8)
      // Criar Final, depois Semis, depois Quartas, para então amarrar os IDs!
      
      // FINAL
      const finalMatch = await tx.match.create({
        data: {
          editionId: edition.id,
          phase: 'FINAL',
          orderInPhase: 1,
        },
      });

      // SEMIFINAIS (Apontam para a Final)
      const semi1 = await tx.match.create({
        data: {
          editionId: edition.id,
          phase: 'SEMIS',
          orderInPhase: 1,
          nextMatchId: finalMatch.id,
          nextMatchSlot: 'A',
        },
      });

      const semi2 = await tx.match.create({
        data: {
          editionId: edition.id,
          phase: 'SEMIS',
          orderInPhase: 2,
          nextMatchId: finalMatch.id,
          nextMatchSlot: 'B',
        },
      });

      // QUARTAS DE FINAL (Apontam para as Semis)
      const q1 = await tx.match.create({
        data: {
          editionId: edition.id,
          phase: 'QUARTERS',
          orderInPhase: 1,
          nextMatchId: semi1.id,
          nextMatchSlot: 'A',
        },
      });

      const q2 = await tx.match.create({
        data: {
          editionId: edition.id,
          phase: 'QUARTERS',
          orderInPhase: 2,
          nextMatchId: semi1.id,
          nextMatchSlot: 'B',
        },
      });

      const q3 = await tx.match.create({
        data: {
          editionId: edition.id,
          phase: 'QUARTERS',
          orderInPhase: 3,
          nextMatchId: semi2.id,
          nextMatchSlot: 'A',
        },
      });

      const q4 = await tx.match.create({
        data: {
          editionId: edition.id,
          phase: 'QUARTERS',
          orderInPhase: 4,
          nextMatchId: semi2.id,
          nextMatchSlot: 'B',
        },
      });

      return {
        edition,
        competitors: createdCompetitors,
        bracket: {
          quarters: [q1, q2, q3, q4],
          semis: [semi1, semi2],
          final: finalMatch,
        },
      };
    });
  }
}