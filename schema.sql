-- Habilitar extensão para UUID v4 (boa prática para IDs distribuídos e seguros)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TENANCY & LIGAS
-- ============================================================================

CREATE TABLE leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,            -- Ex: "Batalha da Rezende"
    slug VARCHAR(100) NOT NULL UNIQUE,     -- Ex: "batalha-da-rezende" (URL amigável)
    city VARCHAR(100) NOT NULL,            -- Ex: "Jacareí"
    state VARCHAR(2) NOT NULL,             -- Ex: "SP"
    instagram_handle VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Regras de pontuação personalizáveis por Liga (Multi-Tenant)
CREATE TABLE ranking_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL UNIQUE REFERENCES leagues(id) ON DELETE CASCADE,
    points_champion INT NOT NULL DEFAULT 10,
    points_runner_up INT NOT NULL DEFAULT 6,
    points_semifinalist INT NOT NULL DEFAULT 3,
    points_quarterfinalist INT NOT NULL DEFAULT 1,
    points_participation INT NOT NULL DEFAULT 1,
    points_twolala_bonus INT NOT NULL DEFAULT 0, -- Se a liga quiser dar moral pro 2x0 direto
    points_win_per_match INT NOT NULL DEFAULT 1,  -- Ponto por vitória individual
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. CADASTRO DE ATORES (MCs)
-- ============================================================================

CREATE TABLE mcs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vulgo VARCHAR(50) NOT NULL,            -- Ex: "Jotapê", "Neo"
    real_name VARCHAR(100),
    instagram VARCHAR(50),
    home_league_id UUID REFERENCES leagues(id) ON DELETE SET NULL, -- De onde é cria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida de MC por nome no meio da muvuca da batalha
CREATE INDEX idx_mcs_vulgo ON mcs(vulgo);

-- ============================================================================
-- 3. EDITIONS (O Evento da Noite)
-- ============================================================================

CREATE TYPE edition_format AS ENUM ('SOLO', 'DUPLA', 'TRIO', 'QUARTETO');
CREATE TYPE edition_status AS ENUM ('DRAFT', 'REGISTRATION', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

CREATE TABLE editions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
    edition_number INT NOT NULL,           -- Ex: 142
    edition_date DATE NOT NULL DEFAULT CURRENT_DATE,
    format edition_format NOT NULL DEFAULT 'SOLO',
    bracket_size INT NOT NULL CHECK (bracket_size IN (8, 16)),
    status edition_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (league_id, edition_number)     -- Não pode haver edição 142 repetida na mesma liga
);

-- ============================================================================
-- 4. COMPETITORS (Os Participantes da Edição)
-- ============================================================================

-- Representa uma vaga/time na chave daquela edição específica
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    seed_number INT,                       -- O número que a plateia gritou! (1 a 8 ou 1 a 16)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela associativa: Liga os MCs àquele Competidor da noite
-- Se for SOLO: 1 registro. Se for TRIO: 3 registros para o mesmo competitor_id.
CREATE TABLE competitor_members (
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    mc_id UUID NOT NULL REFERENCES mcs(id) ON DELETE RESTRICT,
    PRIMARY KEY (competitor_id, mc_id)
);

-- ============================================================================
-- 5. MATCHES (A Árvore de Confrontos / Bracket Engine)
-- ============================================================================

CREATE TYPE match_phase AS ENUM ('PRE_PHASE', 'ROUND_OF_16', 'QUARTERS', 'SEMIS', 'FINAL');
CREATE TYPE match_result_type AS ENUM ('TWOLALA', 'REPLICA', 'WO');

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
    phase match_phase NOT NULL,
    order_in_phase INT NOT NULL,           -- Confronto 1, Confronto 2...
    
    -- Participantes do confronto
    competitor_a_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
    competitor_b_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
    
    -- Resultado
    winner_competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
    result_type match_result_type,         -- Foi Twolala (2x0) ou Réplica (2x1)?
    
    -- Para onde o vencedor vai na árvore? (Grafos em SQL)
    next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    next_match_slot VARCHAR(1) CHECK (next_match_slot IN ('A', 'B')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Restrição: Não pode lutar contra si mesmo
    CONSTRAINT chk_different_competitors CHECK (
        competitor_a_id IS NULL OR competitor_b_id IS NULL OR (competitor_a_id <> competitor_b_id)
    )
);

-- ============================================================================
-- 6. STATS & RANKINGS (Read-Model Otimizado para Fans)
-- ============================================================================

-- Tabela materializada/consolidada. Evita calcular agregação pesada em toda requisição.
CREATE TABLE league_mc_stats (
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    mc_id UUID NOT NULL REFERENCES mcs(id) ON DELETE CASCADE,
    total_points INT NOT NULL DEFAULT 0,
    matches_won INT NOT NULL DEFAULT 0,
    matches_lost INT NOT NULL DEFAULT 0,
    twolalas_given INT NOT NULL DEFAULT 0,  -- Vitórias por 2x0
    titles_count INT NOT NULL DEFAULT 0,    -- Campeão da noite
    runners_up_count INT NOT NULL DEFAULT 0,-- Vice-campeão
    editions_count INT NOT NULL DEFAULT 0,  -- Frequência/Participações
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (league_id, mc_id)
);

CREATE INDEX idx_leaderboard ON league_mc_stats(league_id, total_points DESC);