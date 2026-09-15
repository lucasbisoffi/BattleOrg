// src/http/routes/edition.routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateEditionUseCase } from '../../application/use-cases/create-edition.use-case.js';
import { DrawBracketUseCase } from '../../application/use-cases/draw-bracket.use-case.js';
import { ResolveMatchUseCase } from '../../application/use-cases/resolve-match.use-case.js';
import { prisma } from '../../infra/db/prisma.js';

export async function editionRoutes(app: FastifyInstance) {
  // 1. Criar Edição e gerar chave vazia com os 8 MCs
  app.post('/editions', async (request, reply) => {
    const createEditionSchema = z.object({
      leagueId: z.string().uuid(),
      editionNumber: z.number().int().positive(),
      bracketSize: z.literal(8).or(z.literal(16)),
      mcIds: z.array(z.string().uuid()),
    });

    const body = createEditionSchema.parse(request.body);
    const useCase = new CreateEditionUseCase();
    const result = await useCase.execute(body);

    return reply.status(201).send(result);
  });

  // 2. Sorteio da Plateia: Casar as quartas de final
  app.post('/editions/:id/draw', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      pairings: z.array(
        z.object({
          quarterOrder: z.number().int().min(1).max(4),
          competitorSeedA: z.number().int().min(1).max(8),
          competitorSeedB: z.number().int().min(1).max(8),
        })
      ).length(4),
    });

    const { id } = paramsSchema.parse(request.params);
    const { pairings } = bodySchema.parse(request.body);

    const useCase = new DrawBracketUseCase();
    const result = await useCase.execute({ editionId: id, pairings });

    return reply.status(200).send(result);
  });

  // 3. Dar o Veredito de uma Partida (Avança de fase sozinho!)
  app.post('/matches/:id/result', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      winnerCompetitorId: z.string().uuid(),
      resultType: z.enum(['TWOLALA', 'REPLICA', 'WO']),
    });

    const { id } = paramsSchema.parse(request.params);
    const { winnerCompetitorId, resultType } = bodySchema.parse(request.body);

    const useCase = new ResolveMatchUseCase();
    const result = await useCase.execute({
      matchId: id,
      winnerCompetitorId,
      resultType,
    });

    return reply.status(200).send(result);
  });

  // 4. Ver o Chaveamento Completo em Tempo Real
  app.get('/editions/:id/bracket', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    const matches = await prisma.match.findMany({
      where: { editionId: id },
      include: {
        competitorA: {
          include: { members: { include: { mc: true } } },
        },
        competitorB: {
          include: { members: { include: { mc: true } } },
        },
        winnerCompetitor: {
          include: { members: { include: { mc: true } } },
        },
      },
      orderBy: [
        { phase: 'desc' },
        { orderInPhase: 'asc' },
      ],
    });

    return reply.status(200).send(matches);
  });
}