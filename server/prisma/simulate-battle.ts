import { prisma } from '../src/infra/db/prisma.js';
import { CreateEditionUseCase } from '../src/application/use-cases/create-edition.use-case.js';
import { DrawBracketUseCase } from '../src/application/use-cases/draw-bracket.use-case.js';
import { ResolveMatchUseCase } from '../src/application/use-cases/resolve-match.use-case.js';

async function simulate() {
  console.log('🎤 INICIANDO SIMULAÇÃO COMPLETA: EDIÇÃO #1 DO BANCO\n');

  const bancoLeague = await prisma.league.findUniqueOrThrow({ where: { slug: 'banco' } });
  const mcs = await prisma.mC.findMany({ take: 8, orderBy: { vulgo: 'asc' } });

  // criar edição 
  const createEdition = new CreateEditionUseCase();
  const { edition, competitors, bracket } = await createEdition.execute({
    leagueId: bancoLeague.id,
    editionNumber: 3,
    bracketSize: 8,
    mcIds: mcs.map((m) => m.id),
  });

  // Sorteio (Quartas)
  const drawUseCase = new DrawBracketUseCase();
  await drawUseCase.execute({
    editionId: edition.id,
    pairings: [
      { quarterOrder: 1, competitorSeedA: 1, competitorSeedB: 5 }, // Artórias vs Jacó
      { quarterOrder: 2, competitorSeedA: 2, competitorSeedB: 6 }, // Daiki vs Teraji
      { quarterOrder: 3, competitorSeedA: 3, competitorSeedB: 7 }, // Flip vs Vostok
      { quarterOrder: 4, competitorSeedA: 4, competitorSeedB: 8 }, // Hend vs Zux
    ],
  });
  console.log('✅ Confrontos casados com a plateia!');

  const resolveUseCase = new ResolveMatchUseCase();

  // QUARTAS
  console.log('\n--- QUARTAS DE FINAL ---');
  // Q1: Artórias vence Jacó (Twolala)
  await resolveUseCase.execute({ matchId: bracket.quarters[0]!.id, winnerCompetitorId: competitors[0]!.id, resultType: 'TWOLALA' });
  console.log('🏆 Q1: Artórias venceu Jacó (Twolala)');

  // Q2: Teraji vence Daiki (Réplica)
  await resolveUseCase.execute({ matchId: bracket.quarters[1]!.id, winnerCompetitorId: competitors[5]!.id, resultType: 'REPLICA' });
  console.log('🏆 Q2: Teraji venceu Daiki');

  // Q3: Flip vence Vostok (Twolala)
  await resolveUseCase.execute({ matchId: bracket.quarters[2]!.id, winnerCompetitorId: competitors[2]!.id, resultType: 'TWOLALA' });
  console.log('🏆 Q3: Flip venceu Vostok (Twolala)');

  // Q4: Hend vence Zux (Réplica)
  await resolveUseCase.execute({ matchId: bracket.quarters[3]!.id, winnerCompetitorId: competitors[3]!.id, resultType: 'REPLICA' });
  console.log('🏆 Q4: Hend venceu Zux');

  // SEMIFINAIS
  console.log('\n--- SEMIFINAIS ---');
  // Semi 1: Artórias vs Teraji -> Artórias vence (Réplica)
  await resolveUseCase.execute({ matchId: bracket.semis[0]!.id, winnerCompetitorId: competitors[0]!.id, resultType: 'REPLICA' });
  console.log('🏆 Semi 1: Artórias venceu Teraji! (Artórias na Final)');

  // Semi 2: Flip vs Hend -> Flip vence (Twolala)
  await resolveUseCase.execute({ matchId: bracket.semis[1]!.id, winnerCompetitorId: competitors[2]!.id, resultType: 'TWOLALA' });
  console.log('🏆 Semi 2: Flip venceu Hend! (Flip na Final)');

  // FINAL: Artórias vs Flip
  console.log('\n--- GRANDE FINAL DO BANCO ---');
  await resolveUseCase.execute({ matchId: bracket.final.id, winnerCompetitorId: competitors[0]!.id, resultType: 'TWOLALA' });
  console.log('👑 GRANDE CAMPEÃO: Artórias venceu Flip no Twolala!');

  console.log('\n🚀 Torneio finalizado! O ranking foi recalculado automaticamente.');
}

simulate()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());