import {
  collection,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Team, Match, Tournament } from "./types";

// ─── Helpers ────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** Round up to the nearest power of 2 */
export function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function shuffleTeams(teams: Team[]): Team[] {
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Get round label ────────────────────────────────────────────

export function getRoundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - 1 - round;
  if (fromFinal === 0) return "Final";
  if (fromFinal === 1) return "Semi Final";
  if (fromFinal === 2) return "Quarter Final";
  return `Round ${round + 1}`;
}

// ─── BYE team sentinel ──────────────────────────────────────────

const BYE_TEAM: Team = { id: "__BYE__", name: "BYE" };

export function isBye(team: Team | null): boolean {
  return team?.id === "__BYE__";
}

/** Distribute teams and BYEs evenly across Round 1 match slots */
export function buildPaddedTeams(teams: Team[], bracketSize: number): (Team | null)[] {
  const numMatches = bracketSize / 2;
  const numByes = bracketSize - teams.length;
  const numTwoTeamMatches = numMatches - numByes;

  // Decide which match positions get 2 real teams vs 1 real team + BYE
  const isTwoTeamMatch = new Array(numMatches).fill(false);
  for (let i = 0; i < numTwoTeamMatches; i++) {
    const idx = numTwoTeamMatches === 1 ? 2 : Math.floor((i * numMatches) / numTwoTeamMatches);
    isTwoTeamMatch[idx] = true;
  }

  const padded: (Team | null)[] = new Array(bracketSize).fill(null);
  let teamIdx = 0;

  for (let matchPos = 0; matchPos < numMatches; matchPos++) {
    if (isTwoTeamMatch[matchPos]) {
      padded[matchPos * 2] = teams[teamIdx++] || null;
      padded[matchPos * 2 + 1] = teams[teamIdx++] || null;
    } else {
      padded[matchPos * 2] = teams[teamIdx++] || null;
      padded[matchPos * 2 + 1] = { ...BYE_TEAM };
    }
  }

  return padded;
}

// ─── Generate bracket (supports any team count 3–16) ────────────

export async function generateBracket(
  tournamentName: string,
  teams: Team[]
): Promise<string> {
  const actualCount = teams.length;
  if (actualCount < 3 || actualCount > 16) {
    throw new Error("Jumlah tim harus antara 3 dan 16");
  }

  const bracketSize = nextPowerOf2(actualCount);
  const totalRounds = Math.log2(bracketSize);
  const tournamentId = generateId();

  // Build properly distributed padded teams
  const paddedTeams = buildPaddedTeams(teams, bracketSize);

  // Create tournament document
  const tournament: Tournament = {
    id: tournamentId,
    name: tournamentName,
    size: bracketSize,
    status: "in_progress",
    createdAt: Date.now(),
    teams,
  };

  const batch = writeBatch(db);

  // Set tournament
  batch.set(doc(db, "tournaments", tournamentId), tournament);

  // Build all matches for all rounds
  const allMatches: Match[][] = [];

  for (let round = 0; round < totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round + 1);
    const roundMatches: Match[] = [];

    for (let pos = 0; pos < matchesInRound; pos++) {
      const matchId = generateId();
      const match: Match = {
        id: matchId,
        tournamentId,
        round,
        position: pos,
        teamA: null,
        teamB: null,
        scores: {
          game1: { teamA: 0, teamB: 0 },
          game2: { teamA: 0, teamB: 0 },
          game3: { teamA: 0, teamB: 0 },
        },
        currentGame: 1,
        servingTeam: "A",
        winnerId: null,
        status: "pending",
        nextMatchId: null,
        scheduledAt: null,
        court: null,
      };

      // First round → assign teams (including BYEs)
      if (round === 0) {
        match.teamA = paddedTeams[pos * 2] || null;
        match.teamB = paddedTeams[pos * 2 + 1] || null;
      }

      roundMatches.push(match);
    }

    allMatches.push(roundMatches);
  }

  // Link matches to their next match
  for (let round = 0; round < totalRounds - 1; round++) {
    const currentRound = allMatches[round];
    const nextRound = allMatches[round + 1];

    for (let pos = 0; pos < currentRound.length; pos++) {
      const nextPos = Math.floor(pos / 2);
      currentRound[pos].nextMatchId = nextRound[nextPos].id;
    }
  }

  // Auto-resolve BYE matches:
  // If one team is BYE, the real team wins automatically
  for (const match of allMatches[0]) {
    const aIsBye = isBye(match.teamA);
    const bIsBye = isBye(match.teamB);

    if (aIsBye && bIsBye) {
      // Both BYE — mark completed with no winner
      match.status = "completed";
    } else if (aIsBye && match.teamB) {
      // Team A is BYE → Team B auto-wins
      match.winnerId = match.teamB.id;
      match.status = "completed";
    } else if (bIsBye && match.teamA) {
      // Team B is BYE → Team A auto-wins
      match.winnerId = match.teamA.id;
      match.status = "completed";
    }
  }

  // Write all matches to batch
  for (const roundMatches of allMatches) {
    for (const match of roundMatches) {
      batch.set(doc(db, "matches", match.id), match);
    }
  }

  await batch.commit();

  // After commit: advance BYE winners to next round
  for (const match of allMatches[0]) {
    if (match.winnerId && match.nextMatchId) {
      await advanceWinner(match);
    }
  }

  return tournamentId;
}

// ─── Advance winner to next match ───────────────────────────────

export async function advanceWinner(match: Match): Promise<void> {
  if (!match.winnerId || !match.nextMatchId) return;

  const winnerTeam =
    match.winnerId === match.teamA?.id ? match.teamA : match.teamB;
  if (!winnerTeam) return;

  const nextMatchRef = doc(db, "matches", match.nextMatchId);
  const nextMatchSnap = await getDoc(nextMatchRef);

  if (!nextMatchSnap.exists()) return;

  // Determine if winner goes to teamA or teamB slot
  // Even positions → teamA, Odd positions → teamB
  if (match.position % 2 === 0) {
    await updateDoc(nextMatchRef, { teamA: winnerTeam });
  } else {
    await updateDoc(nextMatchRef, { teamB: winnerTeam });
  }
}

// ─── Determine match winner (best of 3) ────────────────────────

export function determineWinner(match: Match): string | null {
  const { scores, teamA, teamB } = match;
  if (!teamA || !teamB) return null;

  let winsA = 0;
  let winsB = 0;

  const games = [scores.game1, scores.game2, scores.game3];

  for (const game of games) {
    if (game.teamA > game.teamB && game.teamA > 0) winsA++;
    else if (game.teamB > game.teamA && game.teamB > 0) winsB++;
  }

  if (winsA >= 2) return teamA.id;
  if (winsB >= 2) return teamB.id;

  return null;
}

// ─── Update match schedule in Firebase ───────────────────────────

export async function updateMatchSchedule(
  matchId: string,
  scheduledAt: string | null,
  court?: string | null
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  await updateDoc(matchRef, {
    scheduledAt: scheduledAt || null,
    court: court || null,
  });
}

// ─── Update match score in Firebase ─────────────────────────────

export async function updateMatchScore(
  matchId: string,
  updates: Partial<Match>
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  await updateDoc(matchRef, updates as Record<string, unknown>);
}

// ─── Finish match ───────────────────────────────────────────────

export async function finishMatch(match: Match): Promise<void> {
  const winnerId = determineWinner(match);
  if (!winnerId) throw new Error("Belum bisa menentukan pemenang");

  const matchRef = doc(db, "matches", match.id);
  await updateDoc(matchRef, {
    status: "completed",
    winnerId,
  });

  // Advance winner to next match
  const completedMatch: Match = { ...match, winnerId, status: "completed" };
  await advanceWinner(completedMatch);

  // Check if tournament is complete (final match finished)
  if (!match.nextMatchId) {
    const tournamentRef = doc(db, "tournaments", match.tournamentId);
    await updateDoc(tournamentRef, { status: "completed" });
  }
}

// ─── Delete tournament + all its matches ────────────────────────

export async function deleteTournament(tournamentId: string): Promise<void> {
  // Delete all matches for this tournament
  const matchesQuery = query(
    collection(db, "matches"),
    where("tournamentId", "==", tournamentId)
  );
  const matchSnap = await getDocs(matchesQuery);

  const batch = writeBatch(db);
  matchSnap.docs.forEach((d) => {
    batch.delete(d.ref);
  });

  // Delete the tournament document itself
  batch.delete(doc(db, "tournaments", tournamentId));

  await batch.commit();
}
