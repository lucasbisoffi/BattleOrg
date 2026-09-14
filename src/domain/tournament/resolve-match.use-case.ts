// src/domain/tournament/resolve-match.use-case.ts

interface ResolveMatchInput {
  matchId: string;
  winnerCompetitorId: string;
  resultType: 'TWOLALA' | 'REPLICA' | 'WO';
}

export class ResolveMatchUseCase {
  constructor(
    private matchRepository: IMatchRepository,
    private rankingEngine: IRankingEngine
  ) {}

  async execute(input: ResolveMatchInput): Promise<void> {
    const currentMatch = await this.matchRepository.findById(input.matchId);
    if (!currentMatch) throw new Error('Partida não encontrada');

    // 1. Validação de Domínio: O vencedor faz parte da partida?
    const isValidWinner = 
      currentMatch.competitorAId === input.winnerCompetitorId ||
      currentMatch.competitorBId === input.winnerCompetitorId;

    if (!isValidWinner) {
      throw new Error('O vencedor indicado não pertence a este confronto!');
    }

    // 2. Registrar o resultado da partida atual
    await this.matchRepository.updateResult({
      matchId: input.matchId,
      winnerCompetitorId: input.winnerCompetitorId,
      resultType: input.resultType,
    });

    // 3. O Pulo do Gato: Se houver próxima fase, avança o vencedor automaticamente!
    if (currentMatch.nextMatchId && currentMatch.nextMatchSlot) {
      await this.matchRepository.setCompetitorInSlot({
        targetMatchId: currentMatch.nextMatchId,
        slot: currentMatch.nextMatchSlot, // 'A' ou 'B'
        competitorId: input.winnerCompetitorId,
      });
    } else if (currentMatch.phase === 'FINAL') {
      // Se era a final, a edição acabou! Dispara o recálculo do ranking da Liga.
      await this.rankingEngine.consolidateEditionStats(currentMatch.editionId);
    }
  }
}