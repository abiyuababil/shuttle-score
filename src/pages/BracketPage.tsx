import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Crown,
  Trash2,
} from "lucide-react";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { getRoundLabel, isBye, deleteTournament } from "../lib/bracketUtils";
import type { Match, Tournament } from "../lib/types";

// ── Layout types ────────────────────────────────────────────────
interface NodeLayout {
  id: string;
  top: number;
  height: number;
  centerY: number;
  teamACenterY: number;
  teamBCenterY: number;
  isReal: boolean;
}

const CARD_HEIGHT = 74;
const CARD_GAP = 28;
const COL_WIDTH = 180;
const ROUND_GAP = 40;

// ── Match Card ──────────────────────────────────────────────────
function TeamSlot({
  name,
  score,
  isWinner,
  isLoser,
  showScore,
  accentColor,
}: {
  name: string;
  score?: string;
  isWinner: boolean;
  isLoser: boolean;
  showScore: boolean;
  accentColor: string;
}) {
  return (
    <div
      className={`flex items-center border transition-colors h-[36px] ${
        isWinner
          ? "bg-emerald-50 border-emerald-200"
          : isLoser
          ? "bg-slate-50 border-slate-200"
          : "bg-primary-50/60 border-primary-200/60"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <span
        className={`flex-1 px-3 text-[13px] font-semibold truncate ${
          isLoser ? "text-slate-400 line-through" : "text-slate-700"
        }`}
      >
        {name}
      </span>
      {showScore && score && (
        <span
          className={`px-2.5 py-1 text-xs font-bold border-l ${
            isWinner
              ? "text-emerald-600 bg-emerald-100/60 border-emerald-200"
              : "text-slate-500 bg-slate-50 border-slate-200"
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({
  match,
  onTap,
}: {
  match: Match;
  onTap: () => void;
}) {
  const hasBye = isBye(match.teamA) || isBye(match.teamB);
  const canTap = match.teamA && match.teamB && !hasBye && match.status !== "completed";
  const showScore = match.status !== "pending" && !hasBye;
  const isLive = match.status === "live" && !match.winnerId;

  const getScoreDetail = (team: "A" | "B") => {
    const games = [match.scores.game1, match.scores.game2, match.scores.game3];
    const played = games.filter((g) => g.teamA > 0 || g.teamB > 0);
    if (played.length === 0) return undefined;
    return played.map((g) => (team === "A" ? g.teamA : g.teamB)).join(" ");
  };

  const getTeamName = (team: typeof match.teamA) => {
    if (!team) return "TBD";
    if (isBye(team)) return "BYE";
    return team.name;
  };

  return (
    <button
      onClick={() => canTap && onTap()}
      disabled={!canTap}
      className={`w-full text-left rounded-lg overflow-hidden shadow-sm transition-all h-[74px] border border-slate-200 flex flex-col justify-between ${
        hasBye
          ? "opacity-50 cursor-default"
          : isLive
          ? "ring-2 ring-red-400 shadow-red-100 animate-pulse-subtle"
          : canTap
          ? "hover:shadow-md hover:ring-2 hover:ring-primary-300 active:scale-[0.98]"
          : "opacity-70 cursor-default"
      }`}
    >
      {/* Team A */}
      <TeamSlot
        name={getTeamName(match.teamA)}
        score={getScoreDetail("A")}
        isWinner={match.winnerId === match.teamA?.id && !isBye(match.teamA)}
        isLoser={!!match.winnerId && match.winnerId !== match.teamA?.id}
        showScore={showScore}
        accentColor={
          isBye(match.teamA)
            ? "#cbd5e1"
            : match.winnerId === match.teamA?.id
            ? "#22c55e"
            : isLive
            ? "#ef4444"
            : "#0369a1"
        }
      />

      {/* Team B */}
      <TeamSlot
        name={getTeamName(match.teamB)}
        score={getScoreDetail("B")}
        isWinner={match.winnerId === match.teamB?.id && !isBye(match.teamB)}
        isLoser={!!match.winnerId && match.winnerId !== match.teamB?.id}
        showScore={showScore}
        accentColor={
          isBye(match.teamB)
            ? "#cbd5e1"
            : match.winnerId === match.teamB?.id
            ? "#22c55e"
            : isLive
            ? "#ef4444"
            : "#0369a1"
        }
      />
    </button>
  );
}

// ── Main Bracket Page ───────────────────────────────────────────
export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen to tournament
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "tournaments", id), (snap) => {
      if (snap.exists()) {
        setTournament(snap.data() as Tournament);
      }
    });
    return unsub;
  }, [id]);

  // Listen to matches
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "matches"),
      where("tournamentId", "==", id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data() as Match);
      data.sort((a, b) => a.round - b.round || a.position - b.position);
      setMatches(data);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  // Group matches by round
  const totalRounds = tournament ? Math.log2(tournament.size) : 0;
  const rounds: Match[][] = useMemo(() => {
    const r: Match[][] = [];
    for (let i = 0; i < totalRounds; i++) {
      r.push(matches.filter((m) => m.round === i));
    }
    return r;
  }, [matches, totalRounds]);

  // Check if Round 0 is a play-in round (only when bracket size is 16 and team count is between 9 and 15)
  const hasPlayIn = useMemo(() => {
    return (
      totalRounds === 4 &&
      (tournament?.teams?.length || 0) > 8 &&
      (tournament?.teams?.length || 0) < 16
    );
  }, [totalRounds, tournament]);

  const anchorRoundIdx = hasPlayIn ? 1 : 0;

  const visibleRounds = useMemo(() => {
    return rounds;
  }, [rounds]);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteTournament(id);
      navigate("/");
    } catch (err: any) {
      alert("Gagal menghapus turnamen: " + err.message);
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  // Find champion
  const finalMatch = rounds[rounds.length - 1]?.[0];
  const champion =
    finalMatch?.status === "completed" && finalMatch.winnerId
      ? finalMatch.winnerId === finalMatch.teamA?.id
        ? finalMatch.teamA
        : finalMatch.teamB
      : null;

  // ── Calculate Pixel-Perfect Node Layouts ──────────────────────
  const { nodeMap, maxCanvasHeight } = useMemo(() => {
    const map = new Map<string, NodeLayout>();
    if (rounds.length === 0) return { nodeMap: map, maxCanvasHeight: 500 };

    // 1. Calculate Anchor Round matches
    const anchorMatches = rounds[anchorRoundIdx] || [];
    anchorMatches.forEach((m, idx) => {
      const top = idx * (CARD_HEIGHT + CARD_GAP);
      const centerY = top + CARD_HEIGHT / 2;
      map.set(m.id, {
        id: m.id,
        top,
        height: CARD_HEIGHT,
        centerY,
        teamACenterY: top + 18,
        teamBCenterY: top + 55,
        isReal: true,
      });
    });

    // 2. Calculate Subsequent Rounds matches (r > anchorRoundIdx)
    for (let r = anchorRoundIdx + 1; r < rounds.length; r++) {
      const roundMatches = rounds[r];
      roundMatches.forEach((m, idx) => {
        const prevMatches = rounds[r - 1];
        const topFeed = map.get(prevMatches[idx * 2]?.id);
        const botFeed = map.get(prevMatches[idx * 2 + 1]?.id);

        const centerY =
          topFeed && botFeed
            ? (topFeed.centerY + botFeed.centerY) / 2
            : topFeed
            ? topFeed.centerY
            : botFeed?.centerY || 0;

        const top = centerY - CARD_HEIGHT / 2;
        map.set(m.id, {
          id: m.id,
          top,
          height: CARD_HEIGHT,
          centerY,
          teamACenterY: top + 18,
          teamBCenterY: top + 55,
          isReal: true,
        });
      });
    }

    // 3. Calculate Play-in Round matches (r < anchorRoundIdx)
    if (hasPlayIn && rounds[0]) {
      const playInMatches = rounds[0];
      const anchorMatches = rounds[1] || [];

      playInMatches.forEach((m, idx) => {
        const isRealMatch = !isBye(m.teamA) && !isBye(m.teamB);
        const destMatch = anchorMatches[Math.floor(idx / 2)];
        const destNode = map.get(destMatch?.id);

        // Even index feeds Team A slot, Odd index feeds Team B slot
        const targetY =
          idx % 2 === 0
            ? destNode?.teamACenterY || 0
            : destNode?.teamBCenterY || 0;

        const top = targetY - CARD_HEIGHT / 2;
        map.set(m.id, {
          id: m.id,
          top,
          height: CARD_HEIGHT,
          centerY: targetY,
          teamACenterY: top + 18,
          teamBCenterY: top + 55,
          isReal: isRealMatch,
        });
      });
    }

    // Find max height among all nodes
    let maxHeight = 400;
    map.forEach((n) => {
      if (n.isReal && n.top + n.height > maxHeight) {
        maxHeight = n.top + n.height;
      }
    });

    return { nodeMap: map, maxCanvasHeight: maxHeight + 40 };
  }, [rounds, anchorRoundIdx, hasPlayIn]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white pb-8">
      {/* ── Header ───────────────────────────────────── */}
      <div className="sticky top-0 z-30 glass border-b border-slate-200/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-800 truncate">
              {tournament?.name || "Turnamen"}
            </h1>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Users className="w-3 h-3" />
              {tournament?.size} tim • Single Elimination
            </p>
          </div>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 active:scale-95 transition"
            title="Hapus turnamen ini"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Champion Banner ──────────────────────────── */}
      {champion && (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-400/30 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                🏆 Juara Turnamen
              </p>
              <p className="text-lg font-extrabold">{champion.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Bracket Tree ─────────────────────────────── */}
      <div className="mt-5 px-4">
        <div className="bracket-scroll overflow-x-auto pb-4">
          <div
            className="flex items-start"
            style={{
              minWidth: `${
                visibleRounds.length * (COL_WIDTH + ROUND_GAP) - ROUND_GAP
              }px`,
            }}
          >
            {visibleRounds.map((roundMatches, displayRoundIdx) => {
              const roundIndex = rounds.indexOf(roundMatches);
              const nextRoundMatches = visibleRounds[displayRoundIdx + 1];

              return (
                <div key={displayRoundIdx} className="flex items-start shrink-0">
                  {/* Round Column */}
                  <div style={{ width: COL_WIDTH }}>
                    {/* Round Header Label */}
                    <div className="text-center mb-4">
                      <span className="inline-block text-[11px] font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-wider">
                        {getRoundLabel(roundIndex, totalRounds)}
                      </span>
                    </div>

                    {/* Round Match Nodes Container */}
                    <div
                      className="relative"
                      style={{ height: maxCanvasHeight }}
                    >
                      {roundMatches.map((match) => {
                        const layout = nodeMap.get(match.id);
                        if (!layout || !layout.isReal) return null;

                        return (
                          <div
                            key={match.id}
                            className="absolute left-0 right-0"
                            style={{
                              top: layout.top,
                              height: layout.height,
                            }}
                          >
                            <MatchCard
                              match={match}
                              onTap={() => navigate(`/match/${match.id}`)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SVG Connectors Column (between this round & next round) */}
                  {displayRoundIdx < visibleRounds.length - 1 && (
                    <div style={{ width: ROUND_GAP, height: maxCanvasHeight }} className="relative shrink-0">
                      {/* Header spacer matching the round header label height */}
                      <div className="h-[25px] mb-4" />
                      <svg
                        width={ROUND_GAP}
                        height={maxCanvasHeight}
                        className="absolute top-[41px] left-0"
                        style={{ display: "block" }}
                      >
                        {nextRoundMatches.map((destMatch, destIdx) => {
                          const destNode = nodeMap.get(destMatch.id);
                          if (!destNode || !destNode.isReal) return null;

                          // Find feeder matches in current round
                          const topMatch = roundMatches[destIdx * 2];
                          const botMatch = roundMatches[destIdx * 2 + 1];
                          const topNode = topMatch ? nodeMap.get(topMatch.id) : null;
                          const botNode = botMatch ? nodeMap.get(botMatch.id) : null;

                          const isTopReal = topNode?.isReal || false;
                          const isBotReal = botNode?.isReal || false;

                          // Case 1: Both top & bot are real matches -> 2-to-1 bracket fork
                          if (isTopReal && isBotReal && topNode && botNode) {
                            const midY = destNode.centerY;
                            return (
                              <g key={destMatch.id}>
                                <line
                                  x1={0}
                                  y1={topNode.centerY}
                                  x2={ROUND_GAP * 0.4}
                                  y2={topNode.centerY}
                                  stroke="#cbd5e1"
                                  strokeWidth={2}
                                />
                                <line
                                  x1={0}
                                  y1={botNode.centerY}
                                  x2={ROUND_GAP * 0.4}
                                  y2={botNode.centerY}
                                  stroke="#cbd5e1"
                                  strokeWidth={2}
                                />
                                <line
                                  x1={ROUND_GAP * 0.4}
                                  y1={topNode.centerY}
                                  x2={ROUND_GAP * 0.4}
                                  y2={botNode.centerY}
                                  stroke="#cbd5e1"
                                  strokeWidth={2}
                                />
                                <line
                                  x1={ROUND_GAP * 0.4}
                                  y1={midY}
                                  x2={ROUND_GAP}
                                  y2={midY}
                                  stroke="#cbd5e1"
                                  strokeWidth={2}
                                />
                              </g>
                            );
                          }

                          // Case 2: Only top is real (e.g. Play-in match feeding Team A slot)
                          if (isTopReal && topNode) {
                            return (
                              <line
                                key={destMatch.id}
                                x1={0}
                                y1={topNode.centerY}
                                x2={ROUND_GAP}
                                y2={destNode.teamACenterY}
                                stroke="#cbd5e1"
                                strokeWidth={2}
                              />
                            );
                          }

                          // Case 3: Only bot is real (e.g. Play-in match feeding Team B slot)
                          if (isBotReal && botNode) {
                            return (
                              <line
                                key={destMatch.id}
                                x1={0}
                                y1={botNode.centerY}
                                x2={ROUND_GAP}
                                y2={destNode.teamBCenterY}
                                stroke="#cbd5e1"
                                strokeWidth={2}
                              />
                            );
                          }

                          return null;
                        })}
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Status Legend Bar (Bottom) ────────────────── */}
      <div className="mx-4 mt-5 grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-2 py-2.5 px-3 bg-white/90 backdrop-blur rounded-xl border border-slate-200/80 shadow-xs text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-600 shrink-0" />
          <span>Belum Tanding</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-red-600 font-bold">Sedang Tanding</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-emerald-700 font-bold">Selesai</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
          <span className="text-slate-400">BYE</span>
        </div>
      </div>

      {/* ── Tournament Footer / Branding ─────────────── */}
      <div className="mx-4 mt-6 text-right">
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest">
          {tournament?.name}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Single Elimination • {tournament?.size} Tim
        </p>
      </div>

      {/* ── Delete Confirmation Modal ────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in px-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Hapus Turnamen?
              </h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Semua data pertandingan dan skor untuk turnamen ini akan dihapus permanen. Aksi ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200 active:scale-[0.98] transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-bold text-white shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
