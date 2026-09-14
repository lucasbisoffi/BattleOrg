// src/domain/tournament/tournament-engine.ts

export type BracketSize = 8 | 16;
export type MatchSlot = 'A' | 'B';
export type Phase = 'PRE_PHASE' | 'ROUND_OF_16' | 'QUARTERS' | 'SEMIS' | 'FINAL';

export interface MatchDraft {
    tempId: string;           
    phase: Phase;
    orderInPhase: number;
    nextMatchTempId: string | null;
    nextMatchSlot: MatchSlot | null;
}

export class TournamentEngine {
    public static generateBracketStructure(size: BracketSize): MatchDraft[] {
    if (size === 8) {
      return this.generate8Bracket();
    }
    return this.generate16Bracket();
}

  private static generate8Bracket(): MatchDraft[] {
    const matches: MatchDraft[] = [];

    matches.push({
      tempId: 'FINAL',
      phase: 'FINAL',
      orderInPhase: 1,
      nextMatchTempId: null,
      nextMatchSlot: null,
    });

    // 2. SEMIFINAIS (Apontam para a FINAL)
    matches.push(
      {
        tempId: 'SEMI_1',
        phase: 'SEMIS',
        orderInPhase: 1,
        nextMatchTempId: 'FINAL',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'SEMI_2',
        phase: 'SEMIS',
        orderInPhase: 2,
        nextMatchTempId: 'FINAL',
        nextMatchSlot: 'B',
      }
    );

    // 3. QUARTAS DE FINAL (Apontam para as Semis)
    matches.push(
      {
        tempId: 'QUARTER_1',
        phase: 'QUARTERS',
        orderInPhase: 1,
        nextMatchTempId: 'SEMI_1',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'QUARTER_2',
        phase: 'QUARTERS',
        orderInPhase: 2,
        nextMatchTempId: 'SEMI_1',
        nextMatchSlot: 'B',
      },
      {
        tempId: 'QUARTER_3',
        phase: 'QUARTERS',
        orderInPhase: 3,
        nextMatchTempId: 'SEMI_2',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'QUARTER_4',
        phase: 'QUARTERS',
        orderInPhase: 4,
        nextMatchTempId: 'SEMI_2',
        nextMatchSlot: 'B',
      }
    );

    return matches;
  }

  private static generate16Bracket(): MatchDraft[] {
    // Mesma lógica recursiva, mas adicionando ROUND_OF_16 apontando para QUARTERS
    // (Fica de exercício para você replicar a árvore de 16)
    const matches: MatchDraft[] = [];

    matches.push({
      tempId: 'FINAL',
      phase: 'FINAL',
      orderInPhase: 1,
      nextMatchTempId: null,
      nextMatchSlot: null,
    });

    // 2. SEMIFINAIS (Apontam para a FINAL)
    matches.push(
      {
        tempId: 'SEMI_1',
        phase: 'SEMIS',
        orderInPhase: 1,
        nextMatchTempId: 'FINAL',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'SEMI_2',
        phase: 'SEMIS',
        orderInPhase: 2,
        nextMatchTempId: 'FINAL',
        nextMatchSlot: 'B',
      }
    );

    // 3. QUARTAS DE FINAL (Apontam para as Semis)
    matches.push(
      {
        tempId: 'QUARTER_1',
        phase: 'QUARTERS',
        orderInPhase: 1,
        nextMatchTempId: 'SEMI_1',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'QUARTER_2',
        phase: 'QUARTERS',
        orderInPhase: 2,
        nextMatchTempId: 'SEMI_1',
        nextMatchSlot: 'B',
      },
      {
        tempId: 'QUARTER_3',
        phase: 'QUARTERS',
        orderInPhase: 3,
        nextMatchTempId: 'SEMI_2',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'QUARTER_4',
        phase: 'QUARTERS',
        orderInPhase: 4,
        nextMatchTempId: 'SEMI_2',
        nextMatchSlot: 'B',
      }
    );
    // 4. primeira fase, round de 16 (Apontam para as quartas)
    matches.push(
      {
        tempId: 'ROUND_OF_16_1',
        phase: 'ROUND_OF_16',
        orderInPhase: 1,
        nextMatchTempId: 'QUARTER_1',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'ROUND_OF_16_2',
        phase: 'ROUND_OF_16',
        orderInPhase: 2,
        nextMatchTempId: 'QUARTER_1',
        nextMatchSlot: 'B',
      },
      {
        tempId: 'ROUND_OF_16_3',
        phase: 'ROUND_OF_16',
        orderInPhase: 3,
        nextMatchTempId: 'QUARTER_2',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'ROUND_OF_16_4',
        phase: 'ROUND_OF_16',
        orderInPhase: 4,
        nextMatchTempId: 'QUARTER_2',
        nextMatchSlot: 'B',
      },
      {
        tempId: 'ROUND_OF_16_5',
        phase: 'ROUND_OF_16',
        orderInPhase: 5,
        nextMatchTempId: 'QUARTER_3',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'ROUND_OF_16_6',
        phase: 'ROUND_OF_16',
        orderInPhase: 6,
        nextMatchTempId: 'QUARTER_3',
        nextMatchSlot: 'B',
      },
      {
        tempId: 'ROUND_OF_16_7',
        phase: 'ROUND_OF_16',
        orderInPhase: 7,
        nextMatchTempId: 'QUARTER_4',
        nextMatchSlot: 'A',
      },
      {
        tempId: 'ROUND_OF_16_8',
        phase: 'ROUND_OF_16',
        orderInPhase: 8,
        nextMatchTempId: 'QUARTER_4',
        nextMatchSlot: 'B',
      }
    );
    throw new Error('Not implemented yet');
  }
}