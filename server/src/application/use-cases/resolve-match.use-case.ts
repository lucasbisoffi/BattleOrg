// src/application/use-cases/resolve-match.use-case.ts
import { prisma } from '../../infra/db/prisma.js';
import { ConsolidateRankingUseCase } from './consolidate-ranking.use-case.js';

interface ResolveMatchInput {
  matchId: string;
  winnerCompetitorId: string;
  resultType: 'TWOLALA' | 'REPLICA' | 'WO';
}

export class ResolveMatchUseCase {
  async execute(input: ResolveMatchInput) {
    const { matchId, winnerCompetitorId, resultType } = input;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) throw new Error('Confronto não encontrado.');

    if (match.competitorAId !== winnerCompetitorId && match.competitorBId !== winnerCompetitorId) {
      throw new Error('O vencedor informado não pertence a este confronto.');
    }

    // 1. Transação atômica: atualiza a partida, avança a chave e finaliza a edição se for o caso
    const updatedMatch = await prisma.$transaction(async (tx) => {
      const matchResult = await tx.match.update({
        where: { id: matchId },
        data: {
          winnerCompetitorId,
          resultType,
        },
      });

      // Avança o vencedor para a próxima fase no slot correto
      if (match.nextMatchId && match.nextMatchSlot) {
        if (match.nextMatchSlot === 'A') {
          await tx.match.update({
            where: { id: match.nextMatchId },
            data: { competitorAId: winnerCompetitorId },
          });
        } else {
          await tx.match.update({
            where: { id: match.nextMatchId },
            data: { competitorBId: winnerCompetitorId },
          });
        }
      }

      // Se for a final, marca status como FINISHED
      if (match.phase === 'FINAL') {
        await tx.edition.update({
          where: { id: match.editionId },
          data: { status: 'FINISHED' },
        });
      }

      return matchResult;
    });

    // 2. APÓS O COMMIT DA TRANSAÇÃO: Agora o banco já gravou com segurança no disco!
    // Se era a final, agora podemos consolidar o ranking sem conflito de isolamento
    if (match.phase === 'FINAL') {
      const consolidateRanking = new ConsolidateRankingUseCase();
      await consolidateRanking.execute(match.editionId);
    }

    return updatedMatch;
  }
}