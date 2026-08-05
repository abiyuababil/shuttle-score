// ─── Types ──────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
}

export interface GameScore {
  teamA: number;
  teamB: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  teamA: Team | null;
  teamB: Team | null;
  scores: {
    game1: GameScore;
    game2: GameScore;
    game3: GameScore;
  };
  currentGame: 1 | 2 | 3;
  servingTeam: "A" | "B";
  winnerId: string | null;
  status: "pending" | "live" | "completed";
  nextMatchId: string | null;
  scheduledAt?: string | null;
  court?: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  size: number;
  status: "draft" | "in_progress" | "completed";
  createdAt: number;
  teams: Team[];
}
