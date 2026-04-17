import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Trophy, User, Users, Lock, Unlock, Shuffle, Check, Circle, MoreVertical, Trash2, Plus, BarChart2, ChevronDown, Target, Flame, UserPlus } from 'lucide-react';
import { generateAutoPairings, generateLeaderPairings, validatePairings } from '../utils/golfPairings';
import { useConfirm } from '../utils/useConfirm';
import { useToast } from '../utils/useToast';

// ── Avatar (matches LeaderboardModal style) ──────────────────────────────
const Avatar = ({ name, email, size = 'md', team = null, isCurrentUser = false }) => {
  const initial = (name || email || '?')[0].toUpperCase();
  const hash = (email || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  const bg = team === 1 ? 'bg-blue-500' : team === 2 ? 'bg-orange-500' : isCurrentUser ? 'bg-blue-500' : undefined;
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white ${bg || ''}`}
      style={!bg ? { background: `hsl(${hue}, 45%, 35%)` } : undefined}
    >
      {initial}
    </div>
  );
};

// ── Animated number (counts from prev to next) ──────────────────────────────
const AnimatedNumber = ({ value, from, duration = 600, delay = 0, suffix = '' }) => {
  const [display, setDisplay] = useState(from !== undefined ? from : value);
  const rafRef = useRef(null);
  const timerRef = useRef(null);
  useEffect(() => {
    if (from === undefined || from === value) { setDisplay(value); return; }
    setDisplay(from);
    const startAnim = () => {
      const start = performance.now();
      const diff = value - from;
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(from + diff * eased));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    if (delay > 0) {
      timerRef.current = setTimeout(startAnim, delay);
    } else {
      startAnim();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, from, duration, delay]);
  return <>{display}{suffix}</>;
};

// ── Ball card ────────────────────────────────────────────────────────────
const BallCard = ({ ball, participants, currentUserEmail, scores, roundCount, revealed = true, hideScores = false }) => {
  if (!revealed) return null;

  return (
    <div
      className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 font-medium">
          Boll {ball.ballNumber}
          {ball.locked && <Lock size={10} className="inline ml-1 text-amber-400" />}
        </span>
        <span className="text-xs text-gray-600 ml-auto">{ball.players.length} spelare</span>
      </div>
      <div className="space-y-1.5">
        {[...ball.players].sort((a, b) => {
          const pa = participants.find((x) => x.email === a);
          const pb = participants.find((x) => x.email === b);
          return (pa?.team || 99) - (pb?.team || 99);
        }).map((email) => {
          const p = participants.find((x) => x.email === email) || { email, name: email.split('@')[0] };
          const isMe = email === currentUserEmail;
          // Total score across all rounds
          const total = scores[email]
            ? Object.values(scores[email]).reduce((s, v) => s + (v || 0), 0)
            : 0;
          return (
            <div
              key={email}
              className={`flex items-center gap-2 py-1 px-2 rounded-lg ${isMe ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''}`}
            >
              <Avatar name={p.name} email={email} size="sm" team={p.team} isCurrentUser={isMe} />
              <span className={`text-sm flex-1 truncate ${isMe ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                {p.name || email.split('@')[0]}
                {isMe && ' (du)'}
              </span>
              {roundCount > 0 && !hideScores && (
                <span className="text-xs text-gray-500 tabular-nums">{total}p</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Rank change triangles ────────────────────────────────────────────
const TriangleUp = ({ className }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={className}><path d="M5 2 L9 8 L1 8 Z" fill="currentColor" /></svg>
);
const TriangleDown = ({ className }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={className}><path d="M5 8 L9 2 L1 2 Z" fill="currentColor" /></svg>
);

// ── Main GolfModal ───────────────────────────────────────────────────────
export default function GolfModal({
  data,
  currentUser,
  canEdit = false,
  onClose,
  onUpdateData,
}) {
  const confirm = useConfirm();
  const toast = useToast();

  const participants = data.participants || [];
  const balancePlayers = useMemo(() =>
    (data.balancePlayers || []).map((bp) => ({ ...bp, email: bp.id, isBalance: true })),
    [data.balancePlayers]
  );
  const allParticipants = useMemo(() => [...participants, ...balancePlayers], [participants, balancePlayers]);
  const teams = data.teams || [{ id: 1, name: 'Lag 1' }, { id: 2, name: 'Lag 2' }];
  const golfRounds = data.golfRounds || [];
  const scores = data.scores || {};
  const roundCount = data.roundCount || 0;
  const status = data.status || 'active';
  const awardPoints = data.awardPoints ?? 1;
  const currentUserEmail = currentUser?.email?.toLowerCase();
  const editable = canEdit && status !== 'finished';
  const revealedRoundSet = new Set(golfRounds.map((r, i) => r.status !== 'draft' ? i : null).filter(i => i !== null));

  const [selectedRound, setSelectedRound] = useState(() => {
    const active = golfRounds.findIndex((r) => r.status === 'draft' || r.status === 'started');
    return active >= 0 ? active : Math.max(0, golfRounds.length - 1);
  });
  const [tab, setTab] = useState('round'); // 'round' | 'leaderboard'
  const [showMenu, setShowMenu] = useState(false);
  const [scoreEdits, setScoreEdits] = useState({});
  const [awardsEdits, setAwardsEdits] = useState({ longestDrive: undefined, closestToPin: undefined });

  // Keyboard offset for floating save button
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    if (!editable) { setKbOffset(0); return; }
    const vp = window.visualViewport;
    if (!vp) return;
    const update = () => setKbOffset(Math.round(window.innerHeight - vp.height));
    vp.addEventListener('resize', update);
    update();
    return () => vp.removeEventListener('resize', update);
  }, [editable]);

  // Leaderboard tab state
  const [rowOffsets, setRowOffsets] = useState({});
  const [lbStatsExpanded, setLbStatsExpanded] = useState(false);
  const [lbArrowsVisible, setLbArrowsVisible] = useState(true);
  const [showBonus, setShowBonus] = useState(true);
  const rowRefs = useRef({});
  const prevTotalsRef = useRef({});
  const lbArrowTimerRef = useRef(null);
  const lbStatsRef = useRef(null);

  const round = golfRounds[selectedRound];

  // Initialize scoreEdits + awardsEdits from persisted data when round changes (for admins)
  useEffect(() => {
    if (!editable || !round) return;
    const edits = {};
    allParticipants.forEach((p) => {
      const val = scores[p.email]?.[selectedRound];
      edits[p.email] = val !== undefined && val !== 0 ? String(val) : '';
    });
    setScoreEdits(edits);
    setAwardsEdits({ longestDrive: round.longestDrive ?? null, closestToPin: round.closestToPin ?? null });
  }, [selectedRound, editable, round, allParticipants.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── data helpers ─────────────────────────────────────────────────────
  const updateGolfRounds = useCallback((updater) => {
    const updated = typeof updater === 'function' ? updater(golfRounds) : updater;
    onUpdateData({ golfRounds: updated });
  }, [golfRounds, onUpdateData]);

  const updateRound = useCallback((roundIdx, patch) => {
    updateGolfRounds((prev) =>
      prev.map((r, i) => (i === roundIdx ? { ...r, ...patch } : r))
    );
  }, [updateGolfRounds]);

  // ── round management ─────────────────────────────────────────────────
  const addRound = () => {
    if (!editable) return;
    const newRound = {
      status: 'draft',
      pairingMode: 'auto',
      activePlayers: participants.map((p) => p.email),
      pairings: [],
      revealTime: null,
    };
    updateGolfRounds([...golfRounds, newRound]);
    setSelectedRound(golfRounds.length);
    setTab('round');
  };

  const togglePlayer = (email) => {
    if (!round || round.status !== 'draft') return;
    const ap = round.activePlayers || [];
    const updated = ap.includes(email) ? ap.filter((e) => e !== email) : [...ap, email];
    updateRound(selectedRound, { activePlayers: updated });
  };

  // ── pairing generation ───────────────────────────────────────────────
  const generatePairings = () => {
    if (!round) return;
    const ap = round.activePlayers || [];
    if (ap.length < 2) { toast.error('Minst 2 aktiva spelare krävs'); return; }

    const previousRounds = golfRounds.filter((_, i) => i < selectedRound && _.pairings?.length > 0);
    const locked = (round.pairings || []).filter((b) => b.locked);

    let result;
    const ballSize = round.preferredBallSize || 4;
    if (round.pairingMode === 'leader') {
      result = generateLeaderPairings(ap, participants, scores, previousRounds, 2, ballSize);
    } else {
      result = generateAutoPairings(ap, participants, previousRounds, { lockedBalls: locked, preferredBallSize: ballSize });
    }

    const validation = validatePairings(result.pairings, ap);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    const updatedRounds = golfRounds.map((r, i) =>
      i === selectedRound ? { ...r, pairings: result.pairings, status: 'started' } : r
    );
    onUpdateData({ golfRounds: updatedRounds, roundCount: Math.max(roundCount, selectedRound + 1) });
    toast.success(`${result.pairings.length} bollar genererade`);
  };

  // ── score editing ────────────────────────────────────────────────────
  const saveScores = () => {
    const updatedScores = { ...scores };
    Object.entries(scoreEdits).forEach(([email, val]) => {
      if (!updatedScores[email]) updatedScores[email] = {};
      updatedScores[email][selectedRound] = val === '' ? 0 : Number(val);
    });
    // Include sidotävlingar in same write
    const updatedRounds = golfRounds.map((r, i) =>
      i === selectedRound ? { ...r, longestDrive: awardsEdits.longestDrive ?? null, closestToPin: awardsEdits.closestToPin ?? null } : r
    );
    onUpdateData({ scores: updatedScores, roundCount: Math.max(roundCount, selectedRound + 1), golfRounds: updatedRounds });
    toast.success('Poäng sparade');
  };

  const isScoresDirty = () => {
    if (!editable) return false;
    const scoresDirty = Object.entries(scoreEdits).some(([email, val]) => {
      const orig = scores[email]?.[selectedRound];
      const origStr = orig !== undefined && orig !== 0 ? String(orig) : '';
      return String(val) !== origStr;
    });
    if (scoresDirty) return true;
    if (!round) return false;
    return (awardsEdits.longestDrive ?? null) !== (round.longestDrive ?? null)
      || (awardsEdits.closestToPin ?? null) !== (round.closestToPin ?? null);
  };

  // ── balance player management ─────────────────────────────────────────
  const addBalancePlayer = () => {
    const teamCounts = teams.map((t) => ({
      id: t.id,
      count: allParticipants.filter((p) => p.team === t.id).length,
    }));
    const sorted = [...teamCounts].sort((a, b) => a.count - b.count);
    const targetTeam = sorted[0].id;
    const bp = { id: `bal_${Date.now()}`, name: 'Balansspelare', team: targetTeam };
    onUpdateData({ balancePlayers: [...(data.balancePlayers || []), bp] });
    const teamName = teams.find((t) => t.id === targetTeam)?.name || `Lag ${targetTeam}`;
    toast.success(`Balansspelare tillagd i ${teamName}`);
  };

  const removeBalancePlayer = (id) => {
    const updated = (data.balancePlayers || []).filter((bp) => bp.id !== id);
    // Also clean up any scores for this balance player
    const updatedScores = { ...scores };
    delete updatedScores[id];
    onUpdateData({ balancePlayers: updated, scores: updatedScores });
  };

  // ── award bonus helper ──────────────────────────────────────────────
  const getAwardBonus = useCallback((email, roundIndex) => {
    if (!awardPoints) return 0;
    const r = golfRounds[roundIndex];
    if (!r) return 0;
    let bonus = 0;
    if (r.longestDrive === email) bonus += awardPoints;
    if (r.closestToPin === email) bonus += awardPoints;
    return bonus;
  }, [golfRounds, awardPoints]);

  const getTotalBonus = useCallback((email) => {
    let bonus = 0;
    for (let i = 0; i < golfRounds.length; i++) bonus += getAwardBonus(email, i);
    return bonus;
  }, [golfRounds, getAwardBonus]);

  // ── ranking helpers ─────────────────────────────────────────────────
  const getRanking = (includeBonus = true) => {
    return allParticipants
      .map((p) => {
        const base = Object.entries(scores[p.email] || {}).reduce((sum, [roundIdx, v]) => {
          if (!canEdit && !revealedRoundSet.has(Number(roundIdx))) return sum;
          return sum + (v || 0);
        }, 0);
        const bonus = includeBonus ? getTotalBonus(p.email) : 0;
        return { ...p, total: base + bonus, bonus };
      })
      .sort((a, b) => b.total - a.total);
  };

  const getTeamTotals = (includeBonus = true) => {
    const ranking = getRanking(includeBonus);
    return teams.map((t) => ({
      ...t,
      total: ranking.filter((p) => p.team === t.id).reduce((s, p) => s + p.total, 0),
    }));
  };

  // ── Leaderboard helpers ──────────────────────────────────────────────
  const getTotalUpToRound = (email, upToRound, includeBonus = true) => {
    const s = scores[email] || {};
    let total = 0;
    for (let i = 0; i <= upToRound; i++) {
      if (!canEdit && !revealedRoundSet.has(i)) continue;
      total += s[i] || 0;
      if (includeBonus) total += getAwardBonus(email, i);
    }
    return total;
  };

  const getRankingAtRound = (roundIndex, includeBonus = true) => {
    const sorted = allParticipants
      .map((p) => ({
        ...p,
        roundScore: (!canEdit && !revealedRoundSet.has(roundIndex)) ? 0 : ((scores[p.email]?.[roundIndex] || 0) + (includeBonus ? getAwardBonus(p.email, roundIndex) : 0)),
        total: getTotalUpToRound(p.email, roundIndex, includeBonus),
      }))
      .sort((a, b) => b.total - a.total);

    const withRanks = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const prev = i > 0 ? withRanks[i - 1] : null;
      const rank = prev && p.total === sorted[i - 1].total ? prev.rank : i + 1;
      withRanks.push({ ...p, rank });
    }
    return withRanks.map((p) => ({
      ...p,
      isTied: withRanks.filter((o) => o.rank === p.rank).length > 1,
    }));
  };

  const getLbRankChange = (email, roundIndex) => {
    if (roundIndex <= 0) return 0;
    const cur = getRankingAtRound(roundIndex, showBonus);
    const prev = getRankingAtRound(roundIndex - 1, showBonus);
    const curRank = cur.find((p) => p.email === email)?.rank ?? 0;
    const prevRank = prev.find((p) => p.email === email)?.rank ?? 0;
    return prevRank - curRank; // positive = climbed
  };

  const animateLbRowChange = (newRound) => {
    // Capture previous totals for count-up animation
    const prevRanking = golfRounds.length > 0 ? getRankingAtRound(selectedRound, showBonus) : [];
    const pt = {};
    prevRanking.forEach((p) => { pt[p.email] = p.total; });
    prevTotalsRef.current = pt;

    const firstPositions = {};
    Object.keys(rowRefs.current).forEach((email) => {
      const el = rowRefs.current[email];
      if (el) firstPositions[email] = el.getBoundingClientRect().top;
    });
    setSelectedRound(newRound);
    setLbArrowsVisible(false);
    if (lbArrowTimerRef.current) clearTimeout(lbArrowTimerRef.current);
    lbArrowTimerRef.current = setTimeout(() => setLbArrowsVisible(true), 1200);
    requestAnimationFrame(() => {
      const offsets = {};
      Object.keys(rowRefs.current).forEach((email) => {
        const el = rowRefs.current[email];
        if (el && firstPositions[email] !== undefined) {
          const delta = firstPositions[email] - el.getBoundingClientRect().top;
          if (Math.abs(delta) > 2) offsets[email] = delta;
        }
      });
      if (Object.keys(offsets).length > 0) {
        setRowOffsets(offsets);
        setTimeout(() => setRowOffsets({}), 400);
      }
    });
  };

  // ── swipe to navigate rounds ─────────────────────────────────────────
  const touchStartRef = useRef(null);
  const handleTouchStart = (e) => {
    if (isScoresDirty()) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || isScoresDirty()) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // too short or too vertical
    if (dx < 0 && selectedRound < golfRounds.length - 1) {
      const next = selectedRound + 1;
      if (tab === 'leaderboard') { animateLbRowChange(next); } else { setSelectedRound(next); }
    } else if (dx > 0 && selectedRound > 0) {
      const prev = selectedRound - 1;
      if (tab === 'leaderboard') { animateLbRowChange(prev); } else { setSelectedRound(prev); }
    }
  };

  // The round index the leaderboard currently shows (same as top selector)
  const lbDisplayRound = selectedRound;
  const lbRanking = golfRounds.length > 0 ? getRankingAtRound(lbDisplayRound, showBonus) : [];

  // ── render ───────────────────────────────────────────────────────────
  const ranking = getRanking(showBonus);
  const teamTotals = getTeamTotals(showBonus);

  return (
    <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col pt-[var(--sat)]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-gray-900/50">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Trophy size={20} className="text-amber-400" />
          {data.title || 'Lagtävling'}
        </h2>
        <div className="flex items-center gap-1">
          {editable && round && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 touch-manipulation"
              >
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-10 z-[101] w-56 py-1 rounded-xl bg-gray-800 border border-white/[0.08] shadow-xl">
                    {status === 'active' && (
                      <button
                        onClick={() => { setShowMenu(false); addRound(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-400 hover:bg-white/5 transition-colors"
                      >
                        <Plus size={14} />
                        Ny runda
                      </button>
                    )}
                    {editable && (
                      <button
                        onClick={() => { setShowMenu(false); addBalancePlayer(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <UserPlus size={14} />
                        Lägg till balansspelare
                      </button>
                    )}
                    {editable && round.status === 'started' && (
                      <button
                        onClick={async () => {
                          setShowMenu(false);
                          if (await confirm({ title: 'Generera om?', message: 'Befintlig bollindelning ersätts.', confirmText: 'Generera om', variant: 'warning' })) {
                            updateRound(selectedRound, { status: 'draft', pairings: [] });
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        <Shuffle size={14} />
                        Generera om bollar
                      </button>
                    )}
                    {editable && selectedRound === golfRounds.length - 1 && (
                      <button
                        onClick={async () => {
                          setShowMenu(false);
                          const hasScores = round.status === 'started' && Object.values(scores).some(s => s[selectedRound]);
                          const msg = hasScores
                            ? `Runda ${selectedRound + 1} och alla registrerade poäng för rundan tas bort.`
                            : `Runda ${selectedRound + 1} tas bort.`;
                          if (await confirm({ title: 'Ta bort runda?', message: msg, confirmText: 'Ta bort', variant: 'danger' })) {
                            const updated = golfRounds.filter((_, i) => i !== selectedRound);
                            // Clean up scores for removed round
                            const updatedScores = { ...scores };
                            Object.keys(updatedScores).forEach(email => {
                              if (updatedScores[email]?.[selectedRound] !== undefined) {
                                updatedScores[email] = { ...updatedScores[email] };
                                delete updatedScores[email][selectedRound];
                              }
                            });
                            onUpdateData({ golfRounds: updated, scores: updatedScores });
                            setSelectedRound(Math.max(0, selectedRound - 1));
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <Trash2 size={14} />
                        Ta bort runda
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={async () => {
            if (isScoresDirty()) {
              if (!(await confirm({ title: 'Osparade ändringar', message: 'Du har poäng som inte sparats. Vill du kasta ändringarna?', confirmText: 'Kasta', variant: 'warning' }))) return;
            }
            onClose();
          }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white transition-all touch-manipulation" aria-label="Stäng">
            <X size={20} />
          </button>
        </div>
        </div>
      </div>

      {/* Content wrapper – constrained width on desktop */}
      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto lg:border-x lg:border-white/[0.06] min-h-0">

      {/* Round selector */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.03]">
        <button
          onClick={() => {
            const next = Math.max(0, selectedRound - 1);
            if (tab === 'leaderboard') { animateLbRowChange(next); } else { setSelectedRound(next); }
          }}
          disabled={selectedRound === 0 || isScoresDirty()}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 disabled:opacity-30 touch-manipulation"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          {golfRounds.length === 0 ? (
            <span className="text-sm text-gray-500">Inga rundor</span>
          ) : (
            <div>
              <span className="text-sm font-medium text-white">Runda {selectedRound + 1}</span>
              {golfRounds.length > 1 && (
                <span className="text-xs ml-2 text-gray-500">av {golfRounds.length}</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            const next = Math.min(golfRounds.length - 1, selectedRound + 1);
            if (tab === 'leaderboard') { animateLbRowChange(next); } else { setSelectedRound(next); }
          }}
          disabled={selectedRound >= golfRounds.length - 1 || isScoresDirty()}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 disabled:opacity-30 touch-manipulation"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06]">
        {['round', 'leaderboard'].map((t) => (
          <button
            key={t}
            onClick={async () => {
              if (t !== tab && isScoresDirty()) {
                if (!(await confirm({ title: 'Osparade ändringar', message: 'Du har poäng som inte sparats. Vill du kasta ändringarna?', confirmText: 'Kasta', variant: 'warning' }))) return;
                // Reset edits to saved values
                const edits = {};
                allParticipants.forEach((p) => {
                  const val = scores[p.email]?.[selectedRound];
                  edits[p.email] = val !== undefined && val !== 0 ? String(val) : '';
                });
                setScoreEdits(edits);
                setAwardsEdits({ longestDrive: round?.longestDrive ?? null, closestToPin: round?.closestToPin ?? null });
              }
              setTab(t);
            }}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
              tab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'round' ? 'Runda' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

        {/* ── No rounds yet ── */}
        {golfRounds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy size={32} className="text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm mb-4">Skapa en runda för att komma igång</p>
            {editablee && (
              <button
                onClick={addRound}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
              >
                + Ny runda
              </button>
            )}
          </div>
        )}

        {/* ── PAIRINGS tab ── */}
        {tab === 'round' && round && (
          <>
            {/* Admin controls for draft round */}
            {editable && round.status === 'draft' && (
              <div className="space-y-3 bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <div>
                  <div className="text-xs text-gray-400 font-medium">Spelare</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">Avmarkera spelare som inte spelar denna runda</div>
                </div>
                {teams.map((t) => {
                  const teamPlayers = participants.filter((p) => p.team === t.id);
                  if (teamPlayers.length === 0) return null;
                  return (
                    <div key={t.id}>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{t.name}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {teamPlayers.map((p) => {
                          const isActive = (round.activePlayers || []).includes(p.email);
                          return (
                            <button
                              key={p.email}
                              onClick={() => togglePlayer(p.email)}
                              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1.5 ${
                                isActive
                                  ? 'bg-white/10 border-white/30 text-gray-300'
                                  : 'bg-white/[0.02] border-white/10 text-gray-600 line-through opacity-60'
                              }`}
                            >
                              {isActive ? <Check size={10} /> : <Circle size={10} />}
                              {p.name || p.email.split('@')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {/* Unassigned players (no team) */}
                {participants.filter((p) => !p.team).length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Utan lag</div>
                    <div className="flex flex-wrap gap-1.5">
                      {participants.filter((p) => !p.team).map((p) => {
                        const isActive = (round.activePlayers || []).includes(p.email);
                        return (
                          <button
                            key={p.email}
                            onClick={() => togglePlayer(p.email)}
                            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-white/10 border-white/30 text-gray-300'
                                : 'bg-white/[0.02] border-white/10 text-gray-600 line-through opacity-60'
                            }`}
                          >
                            {isActive ? <Check size={10} /> : <Circle size={10} />}
                            {p.name || p.email.split('@')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ball size preference */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400 font-medium">Bollstorlek</span>
                  <div className="flex rounded-lg overflow-hidden border border-white/[0.06]">
                    {[3, 4].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateRound(selectedRound, { preferredBallSize: size })}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          (round.preferredBallSize || 4) === size
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {size}-bollar
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pairing mode */}
                <div className="text-xs text-gray-400 font-medium mt-2">Metod</div>
                <div className="flex rounded-lg overflow-hidden border border-white/[0.06]">
                  {[
                    { key: 'auto', label: 'Automatisk' },
                    { key: 'leader', label: 'Ledarboll' },
                    { key: 'manual', label: 'Manuell' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => updateRound(selectedRound, { pairingMode: m.key })}
                      className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                        round.pairingMode === m.key
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-white/5 text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Generate button (auto/leader) or Manual editor */}
                {round.pairingMode !== 'manual' ? (
                  <button
                    onClick={generatePairings}
                    className="w-full py-2.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Shuffle size={14} />
                    Generera bollar
                  </button>
                ) : (() => {
                  const ap = round.activePlayers || [];
                  const pairings = round.pairings || [];
                  const assigned = new Set(pairings.flatMap((b) => b.players));
                  const unassigned = ap.filter((e) => !assigned.has(e));

                  const addBall = () => {
                    const maxNum = pairings.reduce((m, b) => Math.max(m, b.ballNumber), 0);
                    updateRound(selectedRound, { pairings: [...pairings, { ballNumber: maxNum + 1, players: [], locked: false }] });
                  };

                  const removeBall = (ballNumber) => {
                    updateRound(selectedRound, { pairings: pairings.filter((b) => b.ballNumber !== ballNumber) });
                  };

                  const addPlayerToBall = (ballNumber, email) => {
                    updateRound(selectedRound, {
                      pairings: pairings.map((b) =>
                        b.ballNumber === ballNumber ? { ...b, players: [...b.players, email] } : b
                      ),
                    });
                  };

                  const removePlayerFromBall = (ballNumber, email) => {
                    updateRound(selectedRound, {
                      pairings: pairings.map((b) =>
                        b.ballNumber === ballNumber ? { ...b, players: b.players.filter((e) => e !== email) } : b
                      ),
                    });
                  };

                  const canFinalize = pairings.length > 0 && unassigned.length === 0 && pairings.every((b) => b.players.length >= 2);

                  return (
                    <div className="space-y-3">
                      {/* Unassigned players */}
                      {unassigned.length > 0 && (
                        <div className="bg-white/[0.03] rounded-xl border border-dashed border-white/20 p-3">
                          <div className="text-xs text-gray-400 font-medium mb-2">Ej tilldelade spelare</div>
                          <div className="flex flex-wrap gap-1.5">
                            {unassigned.map((email) => {
                              const p = participants.find((x) => x.email === email) || { name: email.split('@')[0] };
                              const tc = p.team === 1 ? { bg: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.5)', text: '#60a5fa' }
                                       : p.team === 2 ? { bg: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.5)', text: '#fb923c' }
                                       : { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)', text: '#9ca3af' };
                              return (
                                <span
                                  key={email}
                                  className="px-2 py-1 text-xs rounded-lg border"
                                  style={{ backgroundColor: tc.bg, borderColor: tc.border, color: tc.text }}
                                >
                                  {p.name || email.split('@')[0]}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Ball cards */}
                      {pairings.map((ball) => (
                        <div key={ball.ballNumber} className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500 font-medium">Boll {ball.ballNumber}</span>
                            <button
                              onClick={() => removeBall(ball.ballNumber)}
                              className="text-gray-600 hover:text-red-400 transition-colors p-0.5"
                              title="Ta bort boll"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {ball.players.map((email) => {
                              const p = participants.find((x) => x.email === email) || { name: email.split('@')[0] };
                              const tc = p.team === 1 ? { bg: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.5)', text: '#60a5fa' }
                                       : p.team === 2 ? { bg: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.5)', text: '#fb923c' }
                                       : { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)', text: '#9ca3af' };
                              return (
                                <button
                                  key={email}
                                  onClick={() => removePlayerFromBall(ball.ballNumber, email)}
                                  className="px-2 py-1 text-xs rounded-lg border flex items-center gap-1"
                                  style={{ backgroundColor: tc.bg, borderColor: tc.border, color: tc.text }}
                                >
                                  {p.name || email.split('@')[0]}
                                  <X size={8} className="opacity-50" />
                                </button>
                              );
                            })}
                            {ball.players.length === 0 && (
                              <span className="text-xs text-gray-600 italic">Tom boll</span>
                            )}
                          </div>
                          {/* Add player dropdown */}
                          {unassigned.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {unassigned.map((email) => {
                                const p = participants.find((x) => x.email === email) || { name: email.split('@')[0] };
                                const tc = p.team === 1 ? { border: 'rgba(59,130,246,0.4)', text: '#93c5fd' }
                                         : p.team === 2 ? { border: 'rgba(249,115,22,0.4)', text: '#fdba74' }
                                         : { border: 'rgba(156,163,175,0.2)', text: '#9ca3af' };
                                return (
                                  <button
                                    key={email}
                                    onClick={() => addPlayerToBall(ball.ballNumber, email)}
                                    className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 border transition-colors hover:bg-white/10"
                                    style={{ borderColor: tc.border, color: tc.text }}
                                  >
                                    + {p.name || email.split('@')[0]}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add ball + finalize */}
                      <div className="flex gap-2">
                        <button
                          onClick={addBall}
                          className="flex-1 py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-medium hover:bg-white/10 transition-colors"
                        >
                          + Ny boll
                        </button>
                        <button
                          onClick={() => {
                            if (!canFinalize) {
                              toast.error('Alla spelare måste vara tilldelade, minst 2 per boll');
                              return;
                            }
                            const updatedRounds = golfRounds.map((r, i) =>
                              i === selectedRound ? { ...r, status: 'started' } : r
                            );
                            onUpdateData({ golfRounds: updatedRounds, roundCount: Math.max(roundCount, selectedRound + 1) });
                            toast.success(`${pairings.length} bollar klara`);
                          }}
                          disabled={!canFinalize}
                          className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:hover:bg-blue-500/20"
                        >
                          Klar
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Draft with no pairings yet */}
            {round.status === 'draft' && (round.pairings || []).length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                {canEdit ? 'Välj spelare och generera bollar' : 'Rundan planeras...'}
              </div>
            )}

            {/* Non-admin waiting state */}
            {!canEdit && round.status === 'draft' && (round.pairings || []).length > 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <Shuffle size={24} className="text-gray-600 mb-3 animate-pulse" />
                <p className="text-gray-400 text-sm">Bollarna delas in...</p>
              </div>
            )}
            {/* Score entry form */}
            {(round.pairings || []).length > 0 && (canEdit || round.status !== 'draft') && (
              <div className="space-y-2">
                {(round.pairings || []).map((ball) => (
                  <div key={ball.ballNumber} className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Boll {ball.ballNumber}</div>
                    <div className="space-y-1.5">
                      {[...ball.players].sort((a, b) => {
                        const pa = participants.find((x) => x.email === a);
                        const pb = participants.find((x) => x.email === b);
                        return (pa?.team || 99) - (pb?.team || 99);
                      }).map((email) => {
                        const p = participants.find((x) => x.email === email) || { email, name: email.split('@')[0] };
                        const isMe = email === currentUserEmail;
                        const roundScore = scores[email]?.[selectedRound] ?? '–';
                        const baseTotal = scores[email] ? Object.entries(scores[email]).reduce((s, [ri, v]) => {
                              if (!canEdit && !revealedRoundSet.has(Number(ri))) return s;
                              return s + (v || 0);
                            }, 0) : 0;
                        const bonus = getTotalBonus(email);
                        const total = baseTotal + bonus;
                        const roundBonus = getAwardBonus(email, selectedRound);
                        return (
                          <div key={email} className={`flex items-center gap-2 py-1 px-2 rounded-lg ${isMe ? 'bg-blue-500/10' : ''}`}>
                            <Avatar name={p.name} email={email} size="sm" team={p.team} isCurrentUser={isMe} />
                            <span className={`text-sm flex-1 truncate ${isMe ? 'text-blue-300' : 'text-gray-300'}`}>
                              {p.name || email.split('@')[0]}
                            </span>
                            {(editable ? awardsEdits.longestDrive : round.longestDrive) === email && <Flame size={12} className="text-orange-400 shrink-0" />}
                            {(editable ? awardsEdits.closestToPin : round.closestToPin) === email && <Target size={12} className="text-emerald-400 shrink-0" />}
                            {editable && round.status === 'started' ? (
                              <input
                                type="number"
                                inputMode="numeric"
                                value={scoreEdits[email] ?? ''}
                                onChange={(e) => setScoreEdits((prev) => ({ ...prev, [email]: e.target.value }))}
                                className="w-16 px-1.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.15] text-white text-xs text-center tabular-nums focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                                placeholder="0"
                              />
                            ) : (
                              <span className="w-16 text-right text-xs text-gray-500 tabular-nums">
                                {roundScore !== '–' && roundBonus > 0 ? `${roundScore}+${roundBonus}` : roundScore}
                              </span>
                            )}
                            <span className={`w-10 text-right text-xs font-medium tabular-nums ${bonus > 0 ? 'text-blue-300' : 'text-gray-400'}`}>{total}p</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inactive players + balance players */}
            {(round.pairings || []).length > 0 && (canEdit || round.status !== 'draft') && (() => {
              const ap = round.activePlayers || [];
              const inactive = allParticipants.filter((p) => !ap.includes(p.email));
              const inactiveWithScores = inactive.filter((p) => editable || scores[p.email]?.[selectedRound]);
              if (inactiveWithScores.length === 0) return null;
              return (
                <div className="bg-white/[0.03] rounded-xl border border-dashed border-white/20 p-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Ej med denna runda</div>
                  <div className="space-y-1.5">
                    {inactiveWithScores.map((p) => {
                      const isMe = p.email === currentUserEmail;
                      const roundScore = scores[p.email]?.[selectedRound] ?? '–';
                      const baseTotal = scores[p.email] ? Object.entries(scores[p.email]).reduce((s, [ri, v]) => {
                            if (!canEdit && !revealedRoundSet.has(Number(ri))) return s;
                            return s + (v || 0);
                          }, 0) : 0;
                      const bonus = getTotalBonus(p.email);
                      const total = baseTotal + bonus;
                      const teamAvg = (() => {
                        if (!editable || !p.team) return null;
                        const teammates = ap.filter((e) => {
                          const tp = participants.find((x) => x.email === e);
                          return tp && tp.team === p.team;
                        });
                        if (teammates.length === 0) return null;
                        const sum = teammates.reduce((s, e) => {
                          const v = scoreEdits[e];
                          return s + (v === '' || v === undefined ? 0 : Number(v));
                        }, 0);
                        return Math.round(sum / teammates.length);
                      })();
                      return (
                        <div key={p.email} className={`flex items-center gap-2 py-1 px-2 rounded-lg ${isMe ? 'bg-blue-500/10' : ''}`}>
                          <Avatar name={p.name} email={p.email} size="sm" team={p.team} isCurrentUser={isMe} />
                          <span className={`text-sm flex-1 truncate ${isMe ? 'text-blue-300' : 'text-gray-400 italic'}`}>
                            {p.name || p.email.split('@')[0]}
                            {p.isBalance && <span className="text-[10px] text-gray-600 ml-1">(balans)</span>}
                          </span>
                          {!editable && <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">lagsnitt</span>}
                          {editable && round.status === 'started' ? (
                            <>
                              {teamAvg !== null && (
                                <button
                                  type="button"
                                  onClick={() => setScoreEdits((prev) => ({ ...prev, [p.email]: String(teamAvg) }))}
                                  className="px-2 py-1 text-xs rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors whitespace-nowrap"
                                >
                                  = Snitt {teamAvg}p
                                </button>
                              )}
                              <input
                                type="number"
                                inputMode="numeric"
                                value={scoreEdits[p.email] ?? ''}
                                onChange={(e) => setScoreEdits((prev) => ({ ...prev, [p.email]: e.target.value }))}
                                className="w-16 px-1.5 py-1 rounded-lg bg-white/[0.08] border border-white/[0.15] text-white text-xs text-center tabular-nums focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                                placeholder="0"
                              />
                            </>
                          ) : (
                            <span className="w-16 text-right text-xs text-gray-500 tabular-nums">R{selectedRound + 1}: {roundScore}</span>
                          )}
                          <span className={`w-10 text-right text-xs font-medium tabular-nums ${bonus > 0 ? 'text-blue-300' : 'text-gray-400'}`}>{total}p</span>
                          {editable && p.isBalance && (
                            <button
                              onClick={() => removeBalancePlayer(p.email)}
                              className="w-5 h-5 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Ta bort balansspelare"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Longest Drive & Closest to Pin awards (admin only) */}
            {editable && round.status === 'started' && (round.pairings || []).length > 0 && (
              <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-3 space-y-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sidotävlingar</div>
                {[{ key: 'longestDrive', label: 'Longest Drive', icon: Flame, color: 'text-orange-400' },
                  { key: 'closestToPin', label: 'Closest to Pin', icon: Target, color: 'text-emerald-400' }].map(({ key, label, icon: Icon, color }) => (
                  <div key={key}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon size={14} className={color} />
                      <span className="text-xs text-gray-300">{label}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setAwardsEdits((prev) => ({ ...prev, [key]: null }))}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          !awardsEdits[key] ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-gray-600'
                        }`}
                      >
                        Ingen
                      </button>
                      {(round.activePlayers || []).map((email) => {
                        const p = participants.find((x) => x.email === email) || { name: email.split('@')[0] };
                        const selected = awardsEdits[key] === email;
                        return (
                          <button
                            key={email}
                            onClick={() => setAwardsEdits((prev) => ({ ...prev, [key]: selected ? null : email }))}
                            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                              selected
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-white/5 border-white/10 text-gray-400'
                            }`}
                          >
                            {p.name || email.split('@')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Round team score summary */}
            {teams.length === 2 && (round.pairings || []).length > 0 && (canEdit || round.status !== 'draft') && (() => {
              const roundScores = teams.map((t) => {
                const teamPlayers = allParticipants.filter((p) => p.team === t.id);
                const base = teamPlayers.reduce((sum, p) => sum + (scores[p.email]?.[selectedRound] || 0), 0);
                const bonus = teamPlayers.reduce((sum, p) => sum + getAwardBonus(p.email, selectedRound), 0);
                return { ...t, total: base + bonus, bonus };
              });
              const hasScores = roundScores.some((t) => t.total > 0);
              if (!hasScores) return null;
              return (
                <div className="flex items-center gap-3 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-xs text-blue-400 font-medium truncate">{roundScores[0].name}</span>
                    <span className="text-sm font-bold text-blue-300 ml-auto tabular-nums">{roundScores[0].total}p</span>
                  </div>
                  <div className="text-xs text-gray-600">vs</div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-sm font-bold text-orange-300 tabular-nums">{roundScores[1].total}p</span>
                    <span className="text-xs text-orange-400 font-medium truncate ml-auto">{roundScores[1].name}</span>
                  </div>
                </div>
              );
            })()}

            {/* No pairings / no round / waiting */}
            {(
              (!canEdit && round.status === 'draft') ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Trophy size={24} className="text-gray-600 mb-3" />
                  <p className="text-gray-400 text-sm">Rundan planeras – poäng visas snart</p>
                </div>
              ) : (round?.pairings || []).length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Generera bollar först för att registrera poäng
                </div>
              ) : null
            )}
          </>
        )}

        {/* ── LEADERBOARD tab ── */}
        {tab === 'leaderboard' && (
          <div className="space-y-3">
            {/* Bonus toggle */}
            {awardPoints > 0 && golfRounds.some((r) => r.longestDrive || r.closestToPin) && (
              <div className="flex items-center justify-end px-1">
                <button
                  onClick={() => setShowBonus(!showBonus)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors"
                >
                  <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${showBonus ? 'bg-blue-500' : 'bg-white/15'}`}>
                    <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${showBonus ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </span>
                  <span className={showBonus ? 'text-gray-300' : 'text-gray-500'}>Inkludera sidotävlingar</span>
                </button>
              </div>
            )}
            {/* Table header */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] text-[10px] text-gray-500 uppercase tracking-wider">
              <span className="w-5 text-center">#</span>
              {golfRounds.length > 1 && <span className="w-5 text-center">+/-</span>}
              <span className="flex-1">Spelare</span>
              {golfRounds.length > 1 && <span className="w-12 text-right">R{lbDisplayRound + 1}</span>}
              <span className="w-12 text-right">Total</span>
            </div>

            {/* Player rows with FLIP animation */}
            <div className="space-y-0.5">
              {lbRanking.map((p) => {
                const isMe = p.email === currentUserEmail;
                const rankChange = getLbRankChange(p.email, lbDisplayRound);
                const offset = rowOffsets[p.email] || 0;
                return (
                  <div
                    key={p.email}
                    ref={(el) => (rowRefs.current[p.email] = el)}
                    style={{
                      transform: offset ? `translateY(${offset}px)` : 'translateY(0)',
                      transition: offset ? 'none' : 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${
                      isMe ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'bg-white/[0.03]'
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-5 flex justify-center">
                      {p.rank <= 3 ? (
                        <span className="relative">
                          <Trophy size={14} className={p.rank === 1 ? 'text-amber-400' : p.rank === 2 ? 'text-gray-400' : 'text-amber-700'} />
                          {p.isTied && <span className="absolute -right-1.5 -top-1 text-[8px] font-bold" style={{ color: 'inherit' }}>=</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">{p.rank}{p.isTied ? '=' : ''}</span>
                      )}
                    </div>

                    {/* Rank change */}
                    {golfRounds.length > 1 && (
                      <div className="w-5 flex justify-center">
                        {!lbArrowsVisible ? <span className="text-gray-700 text-xs">–</span>
                          : rankChange > 0 ? <TriangleUp className="text-green-400" />
                          : rankChange < 0 ? <TriangleDown className="text-red-400" />
                          : <span className="text-gray-700 text-xs">–</span>}
                      </div>
                    )}

                    {/* Avatar + name + awards */}
                    <Avatar name={p.name} email={p.email} size="sm" team={p.team} isCurrentUser={isMe} />
                    <span className={`text-sm flex-1 truncate ${isMe ? 'text-blue-300 font-medium' : 'text-gray-300'}`}>
                      {p.name || p.email?.split('@')[0]}
                      {isMe && ' (du)'}
                      {p.isBalance && <span className="text-[10px] text-gray-600 ml-1">(balans)</span>}
                    </span>
                    {lbDisplayRound != null && golfRounds[lbDisplayRound]?.longestDrive === p.email && (
                      <Flame size={12} className="text-orange-400 flex-shrink-0" title="Longest Drive" />
                    )}
                    {lbDisplayRound != null && golfRounds[lbDisplayRound]?.closestToPin === p.email && (
                      <Target size={12} className="text-emerald-400 flex-shrink-0" title="Closest to Pin" />
                    )}

                    {/* Round score */}
                    {golfRounds.length > 1 && (
                      <span className="w-12 text-right text-sm tabular-nums text-gray-500">
                        {p.roundScore ? (
                          <AnimatedNumber value={p.roundScore} from={0} duration={500} />
                        ) : '–'}
                      </span>
                    )}

                    {/* Total */}
                    <span className={`w-12 text-right text-sm font-medium tabular-nums ${isMe ? 'text-blue-400' : 'text-gray-300'}`}>
                      <AnimatedNumber value={p.total} from={prevTotalsRef.current[p.email] ?? p.total} duration={600} delay={golfRounds.length > 1 ? 500 : 0} suffix="p" />
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Team total summary */}
            {teams.length === 2 && teamTotals.length === 2 && (() => {
              const t1 = teamTotals[0];
              const t2 = teamTotals[1];
              if (t1.total === 0 && t2.total === 0) return null;
              const lead = t1.total > t2.total ? 1 : t2.total > t1.total ? 2 : 0;
              return (
                <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`text-xs font-medium truncate ${lead === 1 ? 'text-blue-400' : 'text-blue-400/60'}`}>{t1.name}</span>
                    <span className={`text-base font-bold ml-auto tabular-nums ${lead === 1 ? 'text-blue-300' : 'text-blue-300/60'}`}>{t1.total}p</span>
                  </div>
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider">vs</span>
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`text-base font-bold tabular-nums ${lead === 2 ? 'text-orange-300' : 'text-orange-300/60'}`}>{t2.total}p</span>
                    <span className={`text-xs font-medium truncate ml-auto ${lead === 2 ? 'text-orange-400' : 'text-orange-400/60'}`}>{t2.name}</span>
                  </div>
                </div>
              );
            })()}

            {/* Per-round team breakdown */}
            {teams.length === 2 && golfRounds.length > 1 && (
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1">Lag per runda</div>
                {golfRounds.map((gr, ri) => {
                  if (!canEdit && !revealedRoundSet.has(ri)) return null;
                  const t1id = teams[0].id;
                  const t2id = teams[1].id;
                  const t1base = allParticipants.filter((p) => p.team === t1id).reduce((s, p) => s + (scores[p.email]?.[ri] || 0), 0);
                  const t2base = allParticipants.filter((p) => p.team === t2id).reduce((s, p) => s + (scores[p.email]?.[ri] || 0), 0);
                  const t1bonus = showBonus ? allParticipants.filter((p) => p.team === t1id).reduce((s, p) => s + getAwardBonus(p.email, ri), 0) : 0;
                  const t2bonus = showBonus ? allParticipants.filter((p) => p.team === t2id).reduce((s, p) => s + getAwardBonus(p.email, ri), 0) : 0;
                  const t1 = t1base + t1bonus;
                  const t2 = t2base + t2bonus;
                  if (t1 === 0 && t2 === 0) return null;
                  const lead = t1 > t2 ? 1 : t2 > t1 ? 2 : 0;
                  return (
                    <div key={ri} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]">
                      <span className="text-[10px] text-gray-600 w-7">R{ri + 1}</span>
                      <span className={`text-xs tabular-nums font-medium ${lead === 1 ? 'text-blue-400' : 'text-blue-400/50'}`}>{t1}p</span>
                      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden flex">
                        <div className="h-full bg-blue-500/60 rounded-l-full" style={{ width: t1 + t2 > 0 ? `${(t1 / (t1 + t2)) * 100}%` : '50%' }} />
                        <div className="h-full bg-orange-500/60 rounded-r-full" style={{ width: t1 + t2 > 0 ? `${(t2 / (t1 + t2)) * 100}%` : '50%' }} />
                      </div>
                      <span className={`text-xs tabular-nums font-medium ${lead === 2 ? 'text-orange-400' : 'text-orange-400/50'}`}>{t2}p</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comparison chart: user vs average */}
            {golfRounds.length > 0 && participants.some((p) => p.email === currentUserEmail) && (
              <div className="mt-2 rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                <button
                  onClick={() => {
                    const willExpand = !lbStatsExpanded;
                    setLbStatsExpanded(willExpand);
                    if (willExpand) {
                      setTimeout(() => lbStatsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                >
                  <BarChart2 size={13} className="text-blue-400/70" />
                  <span className="text-xs font-medium text-gray-300 flex-1">Min statistik</span>
                  <ChevronDown size={14} className={`text-gray-500 transition-transform ${lbStatsExpanded ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                {lbStatsExpanded && (() => {
                  const revealedRounds = golfRounds
                    .map((_, i) => i)
                    .filter((i) => canEdit || revealedRoundSet.has(i));
                  const userScores = revealedRounds.map((i) => scores[currentUserEmail]?.[i] || 0);
                  const avgScores = revealedRounds.map((i) => {
                    const vals = participants.map((p) => scores[p.email]?.[i] || 0);
                    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                  });
                  const userTotal = userScores.reduce((a, b) => a + b, 0);
                  const avgTotal = avgScores.reduce((a, b) => a + b, 0);
                  const diff = userTotal - avgTotal;
                  const bestRound = userScores.length > 1 ? userScores.reduce((best, v, i) => v > best.score ? { idx: revealedRounds[i], score: v } : best, { idx: 0, score: -Infinity }) : null;
                  const worstRound = userScores.length > 1 ? userScores.reduce((worst, v, i) => v < worst.score ? { idx: revealedRounds[i], score: v } : worst, { idx: 0, score: Infinity }) : null;
                  const myRank = lbRanking.find((p) => p.email === currentUserEmail)?.rank ?? '–';

                  return (
                    <div ref={lbStatsRef} className="px-3 pb-3 space-y-3 border-t border-white/[0.04]">
                      {/* Stat cards */}
                      <div className="grid grid-cols-3 gap-2 pt-2.5">
                        <div className="rounded-lg p-2.5 text-center bg-white/[0.04]">
                          <div className="text-lg font-bold text-white leading-none">{myRank}</div>
                          <div className="text-[10px] text-gray-500 mt-1">Placering</div>
                        </div>
                        <div className="rounded-lg p-2.5 text-center bg-white/[0.04]">
                          <div className="text-lg font-bold text-white leading-none">{userTotal}<span className="text-xs font-normal text-gray-500">p</span></div>
                          <div className="text-[10px] text-gray-500 mt-1">Total</div>
                        </div>
                        <div className={`rounded-lg p-2.5 text-center ${diff >= 0 ? 'bg-white/[0.04]' : 'bg-white/[0.04]'}`}>
                          <div className={`text-lg font-bold leading-none ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">Vs snitt</div>
                        </div>
                      </div>

                      {/* Best / Worst round */}
                      {bestRound && worstRound && (
                        <div className="flex items-center gap-3 px-1 text-xs">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Bäst</span>
                            <span className="text-green-400 tabular-nums ml-auto">R{bestRound.idx + 1} · {bestRound.score}p</span>
                          </div>
                          <div className="w-px h-3 bg-white/10" />
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Sämst</span>
                            <span className="text-red-400 tabular-nums ml-auto">R{worstRound.idx + 1} · {worstRound.score}p</span>
                          </div>
                        </div>
                      )}

                      {/* Round-by-round user vs avg bar */}
                      {revealedRounds.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 px-1">
                            <span className="uppercase tracking-wider">Per runda</span>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 inline-block" /> Du</span>
                              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block" /> Snitt</span>
                            </div>
                          </div>
                          {revealedRounds.map((ri, i) => {
                            const maxVal = Math.max(...userScores, ...avgScores, 1);
                            const userPct = (userScores[i] / maxVal) * 100;
                            const avgPct = (avgScores[i] / maxVal) * 100;
                            return (
                              <div key={ri} className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-600 w-6 tabular-nums">R{ri + 1}</span>
                                <div className="flex-1 space-y-0.5">
                                  <div className="h-[5px] rounded-full bg-white/[0.04] overflow-hidden">
                                    <div className="h-full bg-blue-400/70 rounded-full transition-all" style={{ width: `${userPct}%` }} />
                                  </div>
                                  <div className="h-[5px] rounded-full bg-white/[0.04] overflow-hidden">
                                    <div className="h-full bg-white/15 rounded-full transition-all" style={{ width: `${avgPct}%` }} />
                                  </div>
                                </div>
                                <span className="text-[10px] tabular-nums text-blue-400 w-6 text-right">{userScores[i]}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {lbRanking.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">Inga deltagare än</div>
            )}
          </div>
        )}
      </div>
      </div>{/* end content wrapper */}

      {/* Floating save button */}
      {isScoresDirty() && (
        <button
          onClick={saveScores}
          className="fixed z-[2100] right-4 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center touch-manipulation"
          style={{ bottom: `${16 + kbOffset}px` }}
        >
          <Check size={24} strokeWidth={2.5} />
        </button>
      )}

      {/* Floating + new round button */}
      {editable && status === 'active' && round?.status === 'started' && tab === 'round' && !isScoresDirty() && (
        <button
          onClick={addRound}
          className="fixed z-[2100] right-4 bottom-4 w-14 h-14 rounded-full bg-white/10 text-gray-400 shadow-lg active:scale-95 transition-all flex items-center justify-center touch-manipulation border border-white/[0.15]"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
