import fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '../infra/db/prisma.js';
import { mcRoutes } from './routes/mc.routes.js';
import { editionRoutes } from './routes/edition.routes.js';
import { z } from 'zod';

const app = fastify({
  logger: true,
});

// Registrar CORS
await app.register(cors, {
  origin: '*',
});

// ============================================================================
// REGISTRO DE ROTAS MODULARES
// ============================================================================
await app.register(mcRoutes);

await app.register(editionRoutes);

// Healthcheck
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Listar Ligas
app.get('/leagues', async (request, reply) => {
  const leagues = await prisma.league.findMany({
    where: { isActive: true },
    include: {
      rankingRule: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return reply.status(200).send(leagues);
});

// Tabela de Classificação / Ranking da Liga (Público)
app.get('/leagues/:slug/leaderboard', async (request, reply) => {
  const paramsSchema = z.object({
    slug: z.string(),
  });

  const { slug } = paramsSchema.parse(request.params);

  const league = await prisma.league.findUnique({
    where: { slug },
  });

  if (!league) {
    return reply.status(404).send({ message: 'Liga não encontrada' });
  }

  const leaderboard = await prisma.leagueMcStats.findMany({
    where: { leagueId: league.id },
    include: {
      mc: true,
    },
    orderBy: [
      { totalPoints: 'desc' },
      { titlesCount: 'desc' },
      { matchesWon: 'desc' },
    ],
  });

  return reply.status(200).send({
    league: {
      name: league.name,
      city: league.city,
    },
    leaderboard,
  });
});

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================
const start = async () => {
  try {
    const port = 3333;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`\n🔥 Servidor BattleOrg rodando em http://localhost:${port}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();