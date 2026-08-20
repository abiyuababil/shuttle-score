import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Crown,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  X,
  Check,
  UserCheck,
  Pencil,
} from "lucide-react";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  getRoundLabel,
  isBye,
  deleteTournament,
  updateMatchSchedule,
  updateTournamentDetails,
} from "../lib/bracketUtils";
import type { Match, Tournament, Team } from "../lib/types";

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

const CARD_HEIGHT = 120;
const CARD_GAP = 32;
const COL_WIDTH = 240;
const ROUND_GAP = 40;

function formatMatchSchedule(scheduledAt?: string | null): string {
  if (!scheduledAt) return "";
  try {
    const d = new Date(scheduledAt);
    if (isNaN(d.getTime())) return scheduledAt;
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} • ${hours}:${mins}`;
  } catch {
    return scheduledAt;
  }
}

// ── Match Schedule Modal ────────────────────────────────────────
function MatchScheduleModal({
  match,
  onClose,
  onSave,
}: {
  match: Match;
  onClose: () => void;
  onSave: (
    scheduledAt: string | null,
    court: string | null,
    umpire: string | null
  ) => Promise<void>;
}) {
  const [scheduledAt, setScheduledAt] = useState<string>(
    match.scheduledAt || ""
  );
  const [court, setCourt] = useState<string>(match.court || "");
  const [umpire, setUmpire] = useState<string>(match.umpire || "");
  const [saving, setSaving] = useState(false);

  const teamAName = match.teamA ? (isBye(match.teamA) ? "BYE" : match.teamA.name) : "TBD";
  const teamBName = match.teamB ? (isBye(match.teamB) ? "BYE" : match.teamB.name) : "TBD";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(scheduledAt || null, court || null, umpire || null);
      onClose();
    } catch (err: any) {
      alert("Gagal menyimpan jadwal: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await onSave(null, null, null);
      onClose();
    } catch (err: any) {
      alert("Gagal menghapus jadwal: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in px-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Jadwal Pertandingan
              </h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">
                {teamAName} vs {teamBName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary-500" />
              Tanggal & Jam
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-500" />
              Lapangan / Court (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Lapangan 1"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-primary-500" />
              Wasit / Umpire (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Johan"
              value={umpire}
              onChange={(e) => setUmpire(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {match.scheduledAt && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="py-2.5 px-3 rounded-xl bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition active:scale-[0.98] disabled:opacity-50"
              >
                Hapus
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-[0.98]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-xs font-bold text-white shadow-md shadow-primary-500/20 hover:bg-primary-700 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Simpan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Teams & Tournament Modal ─────────────────────────────
function EditTeamsModal({
  tournament,
  initialTeamId,
  onClose,
  onSave,
}: {
  tournament: Tournament;
  initialTeamId?: string | null;
  onClose: () => void;
  onSave: (tourneyName: string, teams: Team[]) => Promise<void>;
}) {
  const [tourneyName, setTourneyName] = useState(tournament.name);
  const [teams, setTeams] = useState<Team[]>(
    tournament.teams ? [...tournament.teams] : []
  );
  const [saving, setSaving] = useState(false);

  const handleTeamChange = (index: number, newName: string) => {
    setTeams((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: newName };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(tourneyName.trim(), teams);
      onClose();
    } catch (err: any) {
      alert("Gagal menyimpan nama: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in px-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md shadow-2xl animate-scale-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Ubah Nama Turnamen & Tim
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Perubahan nama akan langsung diperbarui di bagan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
          <div className="shrink-0">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Turnamen
            </label>
            <input
              type="text"
              value={tourneyName}
              onChange={(e) => setTourneyName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
              required
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 shrink-0">
              Daftar Peserta / Tim ({teams.length})
            </label>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {teams.map((t, idx) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 p-1.5 rounded-xl border transition ${
                    t.id === initialTeamId
                      ? "bg-primary-50/70 border-primary-300 ring-2 ring-primary-200"
                      : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  <span className="text-xs font-extrabold text-slate-400 w-6 text-center shrink-0">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={t.name}
                    onChange={(e) => handleTeamChange(idx, e.target.value)}
                    placeholder={`Nama Tim ${idx + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 transition"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-[0.98]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-xs font-bold text-white shadow-md shadow-primary-500/20 hover:bg-primary-700 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
      className={`flex items-center border transition-colors h-[36px] ${isWinner
          ? "bg-emerald-50 border-emerald-200"
          : isLoser
            ? "bg-slate-50 border-slate-200"
            : "bg-primary-50/60 border-primary-200/60"
        }`}
      style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
    >
      <span
        className={`flex-1 px-3 text-[13px] font-semibold truncate ${isLoser ? "text-slate-400 line-through" : "text-slate-700"
          }`}
      >
        {name}
      </span>
      {showScore && score && (
        <span
          className={`px-2.5 py-1 text-xs font-bold border-l ${isWinner
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
  onOpenSchedule,
}: {
  match: Match;
  onTap: () => void;
  onOpenSchedule: (match: Match) => void;
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

  const formattedDate = formatMatchSchedule(match.scheduledAt);

  return (
    <div
      className={`w-full text-left rounded-lg overflow-hidden shadow-sm transition-all h-[120px] border border-slate-200 flex flex-col justify-between ${hasBye
          ? "opacity-50 cursor-default"
          : isLive
            ? "ring-2 ring-red-400 shadow-red-100 animate-pulse-subtle"
            : "hover:shadow-md"
        }`}
    >
      {/* Date & Time + Umpire Top Header Strip (26px) */}
      <div
        onClick={(e) => {
          if (!hasBye) {
            e.stopPropagation();
            onOpenSchedule(match);
          }
        }}
        className={`h-[26px] px-2 text-[10.5px] font-semibold flex items-center justify-between border-b transition-colors ${match.scheduledAt
            ? "bg-primary-50/90 text-primary-700 border-primary-100 hover:bg-primary-100/80 cursor-pointer"
            : "bg-slate-50/90 text-slate-400 border-slate-100 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          }`}
        title={
          hasBye
            ? undefined
            : match.scheduledAt
              ? `Jadwal: ${formattedDate} ${match.court ? "• " + match.court : ""} ${match.umpire ? "• Wasit: " + match.umpire : ""}`
              : "Klik untuk atur jadwal"
        }
      >
        <div className="flex items-center gap-1.5 truncate min-w-0 flex-1 mr-1">
          <Calendar className={`w-3.5 h-3.5 shrink-0 ${match.scheduledAt ? "text-primary-600" : "text-slate-400"}`} />
          <span className="truncate font-extrabold text-slate-800 tracking-tight">
            {formattedDate || "+ Jadwal"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {match.umpire && (
            <span
              className="text-[9.5px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-300 shadow-2xs"
              title={`Wasit: ${match.umpire}`}
            >
              <UserCheck className="w-3 h-3 text-amber-700 shrink-0" />
              <span>Wasit: {match.umpire}</span>
            </span>
          )}
          {!hasBye && (
            <Clock className="w-3.5 h-3.5 text-slate-400 hover:text-primary-600 shrink-0 ml-0.5" />
          )}
        </div>
      </div>

      {/* Team Slots Area (36px + 36px = 72px) */}
      <div
        onClick={() => canTap && onTap()}
        className={`flex-1 flex flex-col justify-between ${canTap ? "cursor-pointer active:opacity-90" : "cursor-default"
          }`}
      >
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
      </div>

      {/* Court Bottom Footer Strip (22px) */}
      <div
        onClick={(e) => {
          if (!hasBye) {
            e.stopPropagation();
            onOpenSchedule(match);
          }
        }}
        className={`h-[22px] px-2 text-[10px] font-bold flex items-center justify-between border-t transition-colors cursor-pointer ${match.court
            ? "bg-primary-50/80 text-primary-800 border-primary-100 hover:bg-primary-100/80"
            : "bg-slate-50/60 text-slate-400 border-slate-100 hover:bg-slate-100/80"
          }`}
        title={hasBye ? undefined : "Click to set court"}
      >
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className={`w-3 h-3 shrink-0 ${match.court ? "text-primary-600" : "text-slate-400"}`} />
          <span className="truncate">
            {match.court ? match.court : "+ Lapangan / Court"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Bracket Page ───────────────────────────────────────────
export default function BracketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScheduleMatch, setEditingScheduleMatch] = useState<Match | null>(null);

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
  const [editTeamsOpen, setEditTeamsOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

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

  const handleSaveSchedule = async (
    scheduledAt: string | null,
    court: string | null,
    umpire: string | null
  ) => {
    if (!editingScheduleMatch) return;
    await updateMatchSchedule(editingScheduleMatch.id, scheduledAt, court, umpire);
  };

  const handleSaveTeams = async (
    tourneyName: string,
    updatedTeams: Team[]
  ) => {
    if (!id) return;
    await updateTournamentDetails(id, tourneyName, updatedTeams);
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
        teamACenterY: top + 44,
        teamBCenterY: top + 80,
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
          teamACenterY: top + 44,
          teamBCenterY: top + 80,
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
          teamACenterY: top + 44,
          teamBCenterY: top + 80,
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
          {tournament && (
            <button
              onClick={() => {
                setSelectedTeamId(null);
                setEditTeamsOpen(true);
              }}
              className="py-1.5 px-3 rounded-xl bg-primary-50 text-primary-600 hover:bg-primary-100 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 border border-primary-200/50 shadow-2xs shrink-0"
              title="Ubah nama turnamen & tim"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ubah Tim</span>
            </button>
          )}
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
              minWidth: `${visibleRounds.length * (COL_WIDTH + ROUND_GAP) - ROUND_GAP
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
                              onOpenSchedule={(m) => setEditingScheduleMatch(m)}
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
      <div className="mx-4 mt-5 p-3.5 bg-white/90 backdrop-blur rounded-xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 max-w-xs mx-auto text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-2 justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-600 shrink-0" />
            <span>Belum Tanding</span>
          </div>
          <div className="flex items-center gap-2 justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-red-600 font-bold">Sedang Tanding</span>
          </div>
          <div className="flex items-center gap-2 justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-emerald-700 font-bold">Selesai</span>
          </div>
          <div className="flex items-center gap-2 justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
            <span className="text-slate-400">BYE</span>
          </div>
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

      {/* ── Edit Teams Modal ──────────────────────────── */}
      {editTeamsOpen && tournament && (
        <EditTeamsModal
          tournament={tournament}
          initialTeamId={selectedTeamId}
          onClose={() => setEditTeamsOpen(false)}
          onSave={handleSaveTeams}
        />
      )}

      {/* ── Match Schedule Modal ─────────────────────── */}
      {editingScheduleMatch && (
        <MatchScheduleModal
          match={editingScheduleMatch}
          onClose={() => setEditingScheduleMatch(null)}
          onSave={handleSaveSchedule}
        />
      )}

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
