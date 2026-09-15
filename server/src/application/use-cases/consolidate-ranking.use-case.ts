import { prisma } from '../../infra/db/prisma.js';

export class ConsolidateRankingUseCase {
  async execute(editionId: string) {
    // 1. Buscar a edição, as regras da liga e todas as partidas com seus participantes
    const edition = await prisma.edition.findUniqueOrThrow({
      where: { id: editionId },
      include: {
        league: { include: { rankingRule: true } },
        competitors: {
          include: {
            members: true,
            matchesWon: true,
          },
        },
        matches: true,
      },
    });

    const rules = edition.league.rankingRule;
    if (!rules) throw new Error('A liga não possui regras de ranking configuradas.');

    const finalMatch = edition.matches.find((m) => m.phase === 'FINAL');
    if (!finalMatch || !finalMatch.winnerCompetitorId) {
      throw new Error('A edição ainda não possui um campeão definido na final.');
    }

    const championId = finalMatch.winnerCompetitorId;
    const runnerUpId =
      finalMatch.competitorAId === championId
        ? finalMatch.competitorBId
        : finalMatch.competitorAId;

    // Achar os semifinalistas que perderam
    const semiMatches = edition.matches.filter((m) => m.phase === 'SEMIS');
    const semiLoserIds: string[] = [];
    for (const semi of semiMatches) {
      if (semi.winnerCompetitorId) {
        const loser =
          semi.competitorAId === semi.winnerCompetitorId
            ? semi.competitorBId
            : semi.competitorAId;
        if (loser) semiLoserIds.push(loser);
      }
    }

    // Transação Atômica -> Atualiza as estatísticas acumuladas de cada MC
    await prisma.$transaction(async (tx) => {
      for (const comp of edition.competitors) {
        const mcId = comp.members[0]!.mcId; // No formato SOLO é 1 MC por time

        const isChampion = comp.id === championId;
        const isRunnerUp = comp.id === runnerUpId;
        const isSemiLoser = semiLoserIds.includes(comp.id);

        // Contagem de vitórias e twolalas da noite
        const winsInEdition = comp.matchesWon.length;
        const twolalasInEdition = comp.matchesWon.filter((m) => m.resultType === 'TWOLALA').length;
        const matchesPlayed = edition.matches.filter(
          (m) => m.competitorAId === comp.id || m.competitorBId === comp.id
        ).length;
        const lossesInEdition = matchesPlayed - winsInEdition;

        // Cálculo de pontuação conforme a regra da casa
        let pointsEarned = rules.pointsParticipation;
        pointsEarned += winsInEdition * rules.pointsWinPerMatch;
        pointsEarned += twolalasInEdition * rules.pointsTwolalaBonus;

        if (isChampion) pointsEarned += rules.pointsChampion;
        else if (isRunnerUp) pointsEarned += rules.pointsRunnerUp;
        else if (isSemiLoser) pointsEarned += rules.pointsSemifinalist;
        else pointsEarned += rules.pointsQuarterfinalist;

        // Upsert na tabela materializada de estatísticas
        await tx.leagueMcStats.upsert({
          where: {
            leagueId_mcId: {
              leagueId: edition.leagueId,
              mcId,
            },
          },
          update: {
            totalPoints: { increment: pointsEarned },
            matchesWon: { increment: winsInEdition },
            matchesLost: { increment: lossesInEdition },
            twolalasGiven: { increment: twolalasInEdition },
            titlesCount: { increment: isChampion ? 1 : 0 },
            runnersUpCount: { increment: isRunnerUp ? 1 : 0 },
            editionsCount: { increment: 1 },
          },
          create: {
            leagueId: edition.leagueId,
            mcId,
            totalPoints: pointsEarned,
            matchesWon: winsInEdition,
            matchesLost: lossesInEdition,
            twolalasGiven: twolalasInEdition,
            titlesCount: isChampion ? 1 : 0,
            runnersUpCount: isRunnerUp ? 1 : 0,
            editionsCount: 1,
          },
        });
      }
    });

    return { message: 'Ranking atualizado e consolidado com sucesso!' };
  }
}