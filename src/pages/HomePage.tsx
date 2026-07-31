import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Plus,
  Shuffle,
  Users,
  Zap,
  Calendar,
  Swords,
  Minus,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { generateBracket, nextPowerOf2, buildPaddedTeams, isBye } from "../lib/bracketUtils";
import type { Team, Tournament } from "../lib/types";

export default function HomePage() {
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tournamentName, setTournamentName] = useState("");
  const [teamCount, setTeamCount] = useState(4);
  const [teamInputs, setTeamInputs] = useState<string[]>(Array(4).fill(""));
  const [loading, setLoading] = useState(false);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);

  // Listen to past tournaments
  useEffect(() => {
    const q = query(
      collection(db, "tournaments"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data() as Tournament);
      setPastTournaments(data);
    });
    return unsub;
  }, []);

  // Adjust team inputs when count changes
  useEffect(() => {
    setTeamInputs((prev) => {
      const next = Array(teamCount).fill("");
      for (let i = 0; i < Math.min(prev.length, teamCount); i++) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [teamCount]);

  const updateTeam = (index: number, value: string) => {
    setTeamInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const swapTeams = (i: number, j: number) => {
    if (j < 0 || j >= teamCount) return;
    setTeamInputs((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const adjustTeamCount = (delta: number) => {
    setTeamCount((prev) => Math.max(3, Math.min(16, prev + delta)));
  };

  const loadPreset = (type: "mens" | "womens" | "mixed") => {
    setIsCreateOpen(true);
    if (type === "mens") {
      setTournamentName("AMINEF Badminton Cup 2026 - Men's Doubles");
      setTeamCount(4);
      setTeamInputs([
        "Irham + Abiyu",
        "Yasa + Johan",
        "Suparji + Sean",
        "Nova + Rizqi",
      ]);
    } else if (type === "womens") {
      setTournamentName("AMINEF Badminton Cup 2026 - Women's Doubles");
      setTeamCount(7);
      setTeamInputs([
        "Maria + Prisil",
        "Frisca + Tinna",
        "Thasia + Rere",
        "Rianti + Bella",
        "Mada + Rimma",
        "Rahmi + Ratna",
        "Ibu Sandra + Nabila",
      ]);
    } else if (type === "mixed") {
      setTournamentName("AMINEF Badminton Cup 2026 - Mixed Doubles");
      setTeamCount(9);
      setTeamInputs([
        "Anthony + Bella",
        "Irham + Tinna",
        "Abiyu + Maria",
        "Nova + Frisca",
        "Rizqi + Nabila",
        "Yasa + Thasia",
        "Sean + Rimma",
        "Suparji + Rahmi",
        "Johan + Ibu Sandra",
      ]);
    }
  };

  const handleSeedAminef = async () => {
    setLoading(true);
    try {
      // 1. Men's Doubles (4 teams)
      const mensTeams: Team[] = [
        { id: `t1-${Date.now()}`, name: "Irham + Abiyu" },
        { id: `t2-${Date.now()}`, name: "Yasa + Johan" },
        { id: `t3-${Date.now()}`, name: "Suparji + Sean" },
        { id: `t4-${Date.now()}`, name: "Nova + Rizqi" },
      ];
      await generateBracket("AMINEF Badminton Cup 2026 - Men's Doubles", mensTeams);

      // 2. Women's Doubles (7 teams)
      const womensTeams: Team[] = [
        { id: `w1-${Date.now()}`, name: "Maria + Prisil" },
        { id: `w2-${Date.now()}`, name: "Frisca + Tinna" },
        { id: `w3-${Date.now()}`, name: "Thasia + Rere" },
        { id: `w4-${Date.now()}`, name: "Rianti + Bella" },
        { id: `w5-${Date.now()}`, name: "Mada + Rimma" },
        { id: `w6-${Date.now()}`, name: "Rahmi + Ratna" },
        { id: `w7-${Date.now()}`, name: "Ibu Sandra + Nabila" },
      ];
      await generateBracket("AMINEF Badminton Cup 2026 - Women's Doubles", womensTeams);

      // 3. Mixed Doubles (9 teams)
      const mixedTeams: Team[] = [
        { id: `m1-${Date.now()}`, name: "Anthony + Bella" },
        { id: `m2-${Date.now()}`, name: "Irham + Tinna" },
        { id: `m3-${Date.now()}`, name: "Abiyu + Maria" },
        { id: `m4-${Date.now()}`, name: "Nova + Frisca" },
        { id: `m5-${Date.now()}`, name: "Rizqi + Nabila" },
        { id: `m6-${Date.now()}`, name: "Yasa + Thasia" },
        { id: `m7-${Date.now()}`, name: "Sean + Rimma" },
        { id: `m8-${Date.now()}`, name: "Suparji + Rahmi" },
        { id: `m9-${Date.now()}`, name: "Johan + Ibu Sandra" },
      ];
      await generateBracket("AMINEF Badminton Cup 2026 - Mixed Doubles", mixedTeams);

      alert("🎉 Berhasil membuat 3 turnamen AMINEF Badminton Cup 2026!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!tournamentName.trim()) {
      alert("Masukkan nama turnamen!");
      return;
    }

    const filledTeams = teamInputs.filter((t) => t.trim());
    if (filledTeams.length < teamCount) {
      alert(`Isi semua ${teamCount} nama tim!`);
      return;
    }

    setLoading(true);
    try {
      const teams: Team[] = filledTeams.map((name, i) => ({
        id: `team-${i}-${Date.now()}`,
        name: name.trim(),
      }));

      const tournamentId = await generateBracket(tournamentName.trim(), teams);
      navigate(`/tournament/${tournamentId}`);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };



  const getStatusStyle = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-amber-100 text-amber-700";
      case "completed":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress":
        return "Berlangsung";
      case "completed":
        return "Selesai";
      default:
        return "Draft";
    }
  };

  const bracketSize = nextPowerOf2(teamCount);
  const byeCount = bracketSize - teamCount;
  const filledCount = teamInputs.filter((t) => t.trim()).length;

  // Build mockup team objects for preview
  const dummyTeams: Team[] = teamInputs.map((val, i) => ({
    id: `dummy-${i}`,
    name: val.trim() || `Tim ${i + 1}`,
  }));

  const paddedDummy = buildPaddedTeams(dummyTeams, bracketSize);

  // Build matchup preview pairs (including BYEs)
  const previewPairs: { a: string; b: string; aIsBye: boolean; bIsBye: boolean }[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const teamA = paddedDummy[i * 2];
    const teamB = paddedDummy[i * 2 + 1];
    const aIsBye = isBye(teamA);
    const bIsBye = isBye(teamB);
    previewPairs.push({
      a: aIsBye ? "BYE" : teamA?.name || `Tim ${i * 2 + 1}`,
      b: bIsBye ? "BYE" : teamB?.name || `Tim ${i * 2 + 2}`,
      aIsBye,
      bIsBye,
    });
  }

  const totalRounds = Math.log2(bracketSize);
  const getRoundLabel = () => {
    if (totalRounds === 2) return "Semi Final";
    if (totalRounds === 3) return "Quarter Final";
    if (totalRounds === 4) return "Round 1";
    return "Round 1";
  };

  return (
    <div className="min-h-[100dvh] pb-8">
      {/* ── Hero Header ──────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-cyan-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/20" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10" />
        </div>
        <div className="relative px-5 pt-10 pb-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
              🏸
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                ShuttleScore
              </h1>
              <p className="text-sm text-white/70 font-medium">
                Tournament & Real-time Scorekeeper
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 relative z-10 max-w-lg mx-auto">
        {/* ── Active / Ongoing Tournaments Card ────────── */}
        {pastTournaments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg shadow-primary-500/10 border border-slate-100 p-5 mb-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                Turnamen Berlangsung
              </h2>
            </div>
            <div className="space-y-2 stagger">
              {pastTournaments.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  className="w-full bg-slate-50/70 rounded-xl border border-slate-100 p-3.5 flex items-center gap-3 hover:bg-slate-50 hover:border-primary-200 transition-all shadow-sm active:scale-[0.98] text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 line-clamp-2 leading-snug">
                      {t.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Users className="w-3 h-3 text-slate-400" />
                        {t.teams?.length || t.size} tim
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${getStatusStyle(
                          t.status
                        )}`}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Create Tournament Card ─────────────────── */}
        <div className="bg-white rounded-2xl shadow-lg shadow-primary-500/10 border border-slate-100 p-5 animate-slide-up">
          <button
            type="button"
            onClick={() => setIsCreateOpen(!isCreateOpen)}
            className={`w-full flex items-center justify-between text-left ${isCreateOpen ? "mb-4" : ""
              } transition-all active:scale-[0.99]`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Buat Turnamen Baru
                </h2>
                {!isCreateOpen && (
                  <p className="text-xs text-slate-400 font-medium">
                    Klik untuk membuka form & preset
                  </p>
                )}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition shrink-0">
              {isCreateOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isCreateOpen && (
            <div className="animate-fade-in">

              {/* ── Quick Preset Banner ─────────────────────── */}
              <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Preset AMINEF Cup 2026
                  </span>
                  <button
                    onClick={handleSeedAminef}
                    disabled={loading}
                    className="text-[11px] font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition active:scale-95 flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-primary-500" />
                    Buat Semua (3)
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => loadPreset("mens")}
                    className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:border-primary-300 hover:bg-primary-50/50 active:scale-95 transition truncate"
                  >
                    Men's (4)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("womens")}
                    className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:border-primary-300 hover:bg-primary-50/50 active:scale-95 transition truncate"
                  >
                    Women's (7)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset("mixed")}
                    className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:border-primary-300 hover:bg-primary-50/50 active:scale-95 transition truncate"
                  >
                    Mixed (9)
                  </button>
                </div>
              </div>

              {/* Tournament Name */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  Nama Turnamen
                </label>
                <input
                  id="tournament-name"
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder='contoh: "Turnamen Badminton RT 05"'
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                />
              </div>

              {/* Team Count — flexible +/- selector */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  Jumlah Tim
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => adjustTeamCount(-1)}
                    disabled={teamCount <= 3}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4 text-slate-600" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-extrabold text-slate-800">
                      {teamCount}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 ml-1">
                      tim
                    </span>
                  </div>
                  <button
                    onClick={() => adjustTeamCount(1)}
                    disabled={teamCount >= 16}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                {byeCount > 0 && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mt-2 font-medium">
                    📌 Bracket {bracketSize} slot — {byeCount} tim mendapat <strong>BYE</strong> (langsung maju ke babak berikutnya)
                  </p>
                )}
              </div>

              {/* Team Inputs with move up/down */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-600">
                    Nama Tim / Pasangan
                  </label>
                  <span className="text-xs text-slate-400 font-medium">
                    {filledCount}/{teamCount}
                  </span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {teamInputs.map((val, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {/* Move Up/Down */}
                      <div className="flex flex-col shrink-0">
                        <button
                          onClick={() => swapTeams(i, i - 1)}
                          disabled={i === 0}
                          className="w-5 h-4 flex items-center justify-center text-slate-400 hover:text-primary-500 disabled:opacity-20 transition"
                          title="Pindah ke atas"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => swapTeams(i, i + 1)}
                          disabled={i === teamCount - 1}
                          className="w-5 h-4 flex items-center justify-center text-slate-400 hover:text-primary-500 disabled:opacity-20 transition"
                          title="Pindah ke bawah"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-slate-400 w-4 text-right shrink-0">
                        {i + 1}
                      </span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateTeam(i, e.target.value)}
                        placeholder={`contoh: "Abiyu + Jaka"`}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Bracket Preview ───────────────────────── */}
              {filledCount >= 2 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-primary-500" />
                      <span className="text-sm font-semibold text-slate-600">
                        Preview Bagan
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const filled = teamInputs.filter((t) => t.trim());
                        const shuffled = [...filled];
                        for (let i = shuffled.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                        }
                        const next = Array(teamCount).fill("");
                        shuffled.forEach((name, idx) => {
                          if (idx < teamCount) next[idx] = name;
                        });
                        setTeamInputs(next);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-600 active:scale-95 transition px-2 py-1 rounded-lg hover:bg-primary-50"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Acak
                    </button>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                    {previewPairs.map((pair, pairIdx) => (
                      <div
                        key={pairIdx}
                        className={`bg-white rounded-lg border border-slate-100 overflow-hidden ${pair.aIsBye || pair.bIsBye ? "opacity-60" : ""
                          }`}
                      >
                        {/* Match header */}
                        <div className="px-3 py-1 bg-primary-50/60 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">
                            Match {pairIdx + 1}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">
                            {pair.aIsBye || pair.bIsBye ? "BYE — auto maju" : getRoundLabel()}
                          </span>
                        </div>
                        {/* Team A */}
                        <div className={`flex items-center border-l-[3px] ${pair.aIsBye ? "border-l-slate-300" : "border-l-primary-500"}`}>
                          <span
                            className={`flex-1 px-3 py-2 text-[13px] font-semibold truncate ${pair.aIsBye
                                ? "text-slate-300 italic"
                                : pair.a.startsWith("Tim ")
                                  ? "text-slate-300 italic"
                                  : "text-slate-700"
                              }`}
                          >
                            {pair.a}
                          </span>
                        </div>
                        {/* VS divider */}
                        <div className="flex items-center px-3">
                          <div className="flex-1 h-px bg-slate-100" />
                          <span className="text-[9px] font-bold text-slate-300 uppercase px-2">
                            vs
                          </span>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        {/* Team B */}
                        <div className={`flex items-center border-l-[3px] ${pair.bIsBye ? "border-l-slate-300" : "border-l-cyan-500"}`}>
                          <span
                            className={`flex-1 px-3 py-2 text-[13px] font-semibold truncate ${pair.bIsBye
                                ? "text-slate-300 italic"
                                : pair.b.startsWith("Tim ")
                                  ? "text-slate-300 italic"
                                  : "text-slate-700"
                              }`}
                          >
                            {pair.b}
                          </span>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400 text-center pt-1">
                      Gunakan ↑↓ atau "Acak" untuk mengubah susunan matchup
                    </p>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                id="generate-bracket"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate Bracket
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
