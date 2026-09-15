import { PrismaClient } from '@prisma/client';
import process from 'node:process';
const prisma = new PrismaClient();

const initialLeagues = [
  {
    name: 'Batalha da Rezende',
    slug: 'batalha-da-rezende',
    city: 'Jacareí',
    state: 'SP',
    instagramHandle: '@batalhadarezende',
  },
  {
    name: 'Batalha da Prainha',
    slug: 'batalha-da-prainha',
    city: 'Jacareí',
    state: 'SP',
    instagramHandle: '@batalhadaprainha',
  },
  {
    name: 'Casa do Freestyle',
    slug: 'casa-do-freestyle',
    city: 'Jacareí',
    state: 'SP',
    instagramHandle: '@casadofreestyle',
  },
  {
    name: 'Templo das Rimas',
    slug: 'templo-das-rimas',
    city: 'Jacareí',
    state: 'SP',
    instagramHandle: '@templodasrimas',
  },
  {
    name: 'Banco',
    slug: 'banco',
    city: 'Jacareí',
    state: 'SP',
    instagramHandle: '@banco',
  },
];

const initialMcs = [
  { vulgo: 'Artórias', instagram: '@artorias' },
  { vulgo: 'Hend', instagram: '@hend' },
  { vulgo: 'Teraji', instagram: '@teraji' },
  { vulgo: 'Flip', instagram: '@flip' },
  { vulgo: 'Jacó', instagram: '@jaco' },
  { vulgo: 'Vostok', instagram: '@vostok' },
  { vulgo: 'Zux', instagram: '@zux' },
  { vulgo: 'Daiki', instagram: '@daiki' },
];

async function main() {
  console.log('🌱 Iniciando o seed do banco de dados...');

  for (const leagueData of initialLeagues) {
    
    const league = await prisma.league.upsert({
      where: { slug: leagueData.slug },
      update: {},
      create: {
        ...leagueData,
        rankingRule: {
          create: {
            pointsChampion: 10,
            pointsRunnerUp: 6,
            pointsSemifinalist: 3,
            pointsQuarterfinalist: 1,
            pointsParticipation: 0,
            pointsTwolalaBonus: 1,
            pointsWinPerMatch: 0,
          },
        },
      },
    });

    console.log(`✅ Liga cadastrada: ${league.name} (${league.slug})`);
    console.log('🎤 Cadastrando MCs iniciais para teste...');
  for (const mcData of initialMcs) {
    // Busca se já existe; se não, cria!
    const existingMc = await prisma.mC.findFirst({
      where: { vulgo: mcData.vulgo },
    });

    if (!existingMc) {
      await prisma.mC.create({ data: mcData });
      console.log(`✅ MC criado: ${mcData.vulgo}`);
    }
  }
  }

  console.log('🚀 Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });