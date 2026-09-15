import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../infra/db/prisma.js';

export async function mcRoutes(app: FastifyInstance) {
  // 1. Cadastrar novo MC
  app.post('/mcs', async (request, reply) => {
    // Definimos o contrato da requisição com Zod
    const createMcBodySchema = z.object({
      vulgo: z.string().min(2, 'O vulgo deve ter pelo menos 2 caracteres'),
      realName: z.string().optional(),
      instagram: z.string().optional(),
      homeLeagueId: z.string().uuid().optional(),
    });

    // Valida os dados de entrada
    const body = createMcBodySchema.parse(request.body);

    // Salva no PostgreSQL
    const mc = await prisma.mC.create({
      data: {
        vulgo: body.vulgo,
        realName: body.realName,
        instagram: body.instagram,
        homeLeagueId: body.homeLeagueId,
      },
    });

    return reply.status(201).send(mc);
  });

  // 2. Buscar MCs (com filtro por query param, ex: /mcs?search=Jota)
  app.get('/mcs', async (request, reply) => {
    const searchParamsSchema = z.object({
      search: z.string().optional(),
      leagueId: z.string().uuid().optional(),
    });

    const { search, leagueId } = searchParamsSchema.parse(request.query);

    const mcs = await prisma.mC.findMany({
      where: {
        AND: [
          search
            ? { vulgo: { contains: search, mode: 'insensitive' } } // Busca case-insensitive
            : {},
          leagueId ? { homeLeagueId: leagueId } : {},
        ],
      },
      orderBy: {
        vulgo: 'asc',
      },
      take: 20, // Limita a 20 resultados para performance máxima
    });

    return reply.status(200).send(mcs);
  });
}