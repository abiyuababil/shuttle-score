import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  X,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  updateMatchScore,
  finishMatch,
} from "../lib/bracketUtils";
import type { Match, GameScore } from "../lib/types";

// ── Shuttlecock SVG Component ───────────────────────────────────
function ShuttlecockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="16" r="4" fill="currentColor" opacity="0.9" />
      <path
        d="M12 12C12 12 8 4 6 2M12 12C12 12 10 4 9 2M12 12C12 12 12 4 12 2M12 12C12 12 14 4 15 2M12 12C12 12 16 4 18 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ScorekeeperPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Listen to match data
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "matches", id), (snap) => {
      if (snap.exists()) {
        setMatch(snap.data() as Match);
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  // ── Score Helpers ─────────────────────────────────────────────

  const getCurrentGame = useCallback((): GameScore | null => {
    if (!match) return null;
    const key = `game${match.currentGame}` as keyof typeof match.scores;
    return match.scores[key];
  }, [match]);

  const updateScore = async (team: "A" | "B", delta: number) => {
    if (!match || !id || match.status === "completed") return;

    const gameKey = `game${match.currentGame}` as keyof typeof match.scores;
    const currentScore = { ...match.scores[gameKey] };

    if (team === "A") {
      currentScore.teamA = Math.max(0, currentScore.teamA + delta);
    } else {
      currentScore.teamB = Math.max(0, currentScore.teamB + delta);
    }

    // Update serving team on score change (when adding)
    const updates: Partial<Match> = {
      scores: {
        ...match.scores,
        [gameKey]: currentScore,
      },
      status: "live" as const,
    };

    // Auto-switch serve when scoring +1
    if (delta > 0) {
      updates.servingTeam = team;
    }

    await updateMatchScore(id, updates);
  };

  const switchGame = async (game: 1 | 2 | 3) => {
    if (!match || !id) return;
    await updateMatchScore(id, { currentGame: game });
  };

  const toggleServe = async () => {
    if (!match || !id) return;
    await updateMatchScore(id, {
      servingTeam: match.servingTeam === "A" ? "B" : "A",
    });
  };

  const handleFinish = async () => {
    if (!match) return;
    setFinishing(true);
    try {
      await finishMatch(match);
      navigate(-1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFinishing(false);
      setShowConfirm(false);
    }
  };

  // ── Determine game wins ──────────────────────────────────────

  const getGameWins = () => {
    if (!match) return { A: 0, B: 0 };
    const games = [match.scores.game1, match.scores.game2, match.scores.game3];
    let winsA = 0;
    let winsB = 0;
    games.forEach((g) => {
      if (g.teamA > g.teamB && g.teamA > 0) winsA++;
      else if (g.teamB > g.teamA && g.teamB > 0) winsB++;
    });
    return { A: winsA, B: winsB };
  };

  const canFinish = () => {
    if (!match) return false;
    const wins = getGameWins();
    return wins.A >= 2 || wins.B >= 2;
  };

  // ── Render ────────────────────────────────────────────────────

  if (loading || !match) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  const currentGame = getCurrentGame();
  const gameWins = getGameWins();
  const isCompleted = match.status === "completed";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-900 text-white">
      {/* ── Top Bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur border-b border-slate-700/50">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center hover:bg-slate-600 active:scale-95 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Live Scorekeeper
          </span>
          {match.status === "live" && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-live" />
              <span className="text-[10px] font-semibold text-red-400">
                LIVE
              </span>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400">
                SELESAI
              </span>
            </div>
          )}
        </div>

        <div className="w-9" />
      </div>

      {/* ── Game Tabs ────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50">
        {[1, 2, 3].map((g) => {
          const gKey = `game${g}` as keyof typeof match.scores;
          const score = match.scores[gKey];
          const isActive = match.currentGame === g;
          const hasScore = score.teamA > 0 || score.teamB > 0;
          const label = g === 3 ? "Rubber" : `Game ${g}`;

          return (
            <button
              key={g}
              onClick={() => switchGame(g as 1 | 2 | 3)}
              disabled={isCompleted}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                  : hasScore
                  ? "bg-slate-700 text-slate-300"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {label}
              {hasScore && !isActive && (
                <span className="ml-1 text-[10px] opacity-70">
                  {score.teamA}-{score.teamB}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Game Wins Indicator ──────────────────────── */}
      <div className="flex items-center justify-center gap-4 py-2 bg-slate-800/30">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            Set
          </span>
          <div className="flex gap-1">
            {[...Array(gameWins.A)].map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-primary-400"
              />
            ))}
            {[...Array(2 - gameWins.A)].map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-slate-700"
              />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-400 mx-2">vs</span>
          <div className="flex gap-1">
            {[...Array(gameWins.B)].map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-cyan-400"
              />
            ))}
            {[...Array(2 - gameWins.B)].map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-slate-700"
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Score Display ────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          {/* Team A */}
          <div className="text-center mb-2">
            <p className="text-sm font-bold text-primary-300 truncate px-4">
              {match.teamA?.name || "Tim A"}
            </p>
            {match.servingTeam === "A" && !isCompleted && (
              <div className="flex items-center justify-center gap-1 mt-1 animate-bounce-subtle">
                <ShuttlecockIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-400 uppercase">
                  Servis
                </span>
              </div>
            )}
          </div>

          {/* Score A */}
          <div className="text-center mb-6">
            <span className="text-8xl font-black text-white tabular-nums leading-none">
              {currentGame?.teamA ?? 0}
            </span>
          </div>

          {/* Buttons Team A */}
          {!isCompleted && (
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => updateScore("A", -1)}
                className="score-btn flex-1 h-16 rounded-2xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl font-bold text-slate-300 shadow-lg"
              >
                <Minus className="w-6 h-6" />
              </button>
              <button
                onClick={() => updateScore("A", 1)}
                className="score-btn flex-[2] h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-primary-500/30"
              >
                <Plus className="w-7 h-7" />
              </button>
            </div>
          )}

          {/* ── Divider with Serve Toggle ────────────── */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-700" />
            <button
              onClick={toggleServe}
              disabled={isCompleted}
              className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-700 active:scale-95 transition flex items-center gap-1.5"
            >
              <ShuttlecockIcon className="w-3.5 h-3.5" />
              Pindah Servis
            </button>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Buttons Team B */}
          {!isCompleted && (
            <div className="flex gap-3 mt-8 mb-6">
              <button
                onClick={() => updateScore("B", -1)}
                className="score-btn flex-1 h-16 rounded-2xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl font-bold text-slate-300 shadow-lg"
              >
                <Minus className="w-6 h-6" />
              </button>
              <button
                onClick={() => updateScore("B", 1)}
                className="score-btn flex-[2] h-16 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-cyan-500/30"
              >
                <Plus className="w-7 h-7" />
              </button>
            </div>
          )}

          {/* Score B */}
          <div className="text-center mt-6 mb-2">
            <span className="text-8xl font-black text-white tabular-nums leading-none">
              {currentGame?.teamB ?? 0}
            </span>
          </div>

          {/* Team B */}
          <div className="text-center mt-2">
            {match.servingTeam === "B" && !isCompleted && (
              <div className="flex items-center justify-center gap-1 mb-1 animate-bounce-subtle">
                <ShuttlecockIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-400 uppercase">
                  Servis
                </span>
              </div>
            )}
            <p className="text-sm font-bold text-cyan-300 truncate px-4">
              {match.teamB?.name || "Tim B"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bottom Action ────────────────────────────── */}
      {!isCompleted && (
        <div className="px-4 pb-6 pt-2">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canFinish()}
            className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              canFinish()
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Check className="w-5 h-5" />
            Selesai Pertandingan
          </button>
          {!canFinish() && (
            <p className="text-[10px] text-slate-500 text-center mt-2">
              Minimal 1 tim harus menang 2 game untuk menyelesaikan pertandingan
            </p>
          )}
        </div>
      )}

      {/* ── Confirmation Modal ───────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in">
          <div className="w-full max-w-md bg-slate-800 rounded-t-3xl p-6 animate-slide-up border-t border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">
                  Konfirmasi Selesai
                </h3>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Match Summary */}
            <div className="bg-slate-900 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-primary-300">
                  {match.teamA?.name}
                </span>
                <span className="text-sm font-semibold text-cyan-300">
                  {match.teamB?.name}
                </span>
              </div>
              <div className="space-y-1">
                {[match.scores.game1, match.scores.game2, match.scores.game3].map(
                  (g, i) => {
                    if (g.teamA === 0 && g.teamB === 0) return null;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs"
                      >
                        <span
                          className={`font-bold ${
                            g.teamA > g.teamB
                              ? "text-white"
                              : "text-slate-500"
                          }`}
                        >
                          {g.teamA}
                        </span>
                        <span className="text-slate-600 text-[10px]">
                          {i === 2 ? "Rubber" : `Game ${i + 1}`}
                        </span>
                        <span
                          className={`font-bold ${
                            g.teamB > g.teamA
                              ? "text-white"
                              : "text-slate-500"
                          }`}
                        >
                          {g.teamB}
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800 text-center">
                <span className="text-xs text-slate-400">Pemenang: </span>
                <span className="text-sm font-bold text-emerald-400">
                  {gameWins.A > gameWins.B
                    ? match.teamA?.name
                    : match.teamB?.name}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Pemenang akan otomatis maju ke babak berikutnya. Aksi ini tidak
              bisa dibatalkan.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3.5 rounded-xl bg-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-600 active:scale-[0.98] transition"
              >
                Batal
              </button>
              <button
                onClick={handleFinish}
                disabled={finishing}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finishing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Konfirmasi
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
