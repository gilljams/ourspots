/**
 * Golf pairing algorithm for 12–20 players across 2 teams.
 *
 * Goals (in priority order):
 *   1. 2 players from each team per 4-ball where possible
 *   2. Maximum variation of partners and opponents across rounds
 *   3. Minimal three-balls when player count is uneven
 *   4. Rotation of players who end up in three-balls
 *
 * Key terms:
 *   - ball:    a group of players playing together (ideally 4, sometimes 3)
 *   - pairing: the full set of balls for a round
 */

// ── helpers ──────────────────────────────────────────────────────────────

/** Deterministic shuffle using Fisher-Yates with a seed-friendly random */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Build a "played-together" history map from previous rounds.
 * Returns Map<email, Map<email, count>>
 */
const buildPairHistory = (previousRounds) => {
  const history = new Map();
  const inc = (a, b) => {
    if (!history.has(a)) history.set(a, new Map());
    history.get(a).set(b, (history.get(a).get(b) || 0) + 1);
  };
  for (const round of previousRounds) {
    if (!round.pairings) continue;
    for (const ball of round.pairings) {
      for (let i = 0; i < ball.players.length; i++) {
        for (let j = i + 1; j < ball.players.length; j++) {
          inc(ball.players[i], ball.players[j]);
          inc(ball.players[j], ball.players[i]);
        }
      }
    }
  }
  return history;
};

/**
 * Build a "three-ball" history: email → count of times in a 3-ball.
 */
const buildThreeBallHistory = (previousRounds) => {
  const counts = new Map();
  for (const round of previousRounds) {
    if (!round.pairings) continue;
    for (const ball of round.pairings) {
      if (ball.players.length === 3) {
        for (const p of ball.players) {
          counts.set(p, (counts.get(p) || 0) + 1);
        }
      }
    }
  }
  return counts;
};

/**
 * Score a candidate pairing — lower is better.
 * Factors:
 *   - team imbalance within balls (heavily penalised)
 *   - repeated partners/opponents (penalised)
 *   - fairness of three-ball assignment (penalised if same players get 3-ball again)
 */
const scorePairing = (balls, participants, pairHistory, threeBallHistory) => {
  let score = 0;

  for (const ball of balls) {
    // Team balance: ideal is equal split (2+2 for 4-ball, any for 3-ball)
    const teamCounts = [0, 0];
    for (const email of ball.players) {
      const p = participants.find((x) => x.email === email);
      if (p?.team === 1) teamCounts[0]++;
      else if (p?.team === 2) teamCounts[1]++;
    }
    // Penalty for imbalance — e.g. 3+1 is bad, 4+0 is worse
    const imbalance = Math.abs(teamCounts[0] - teamCounts[1]);
    score += imbalance * 50;

    // Repeated pairings penalty — same-team repeats penalised much harder
    for (let i = 0; i < ball.players.length; i++) {
      for (let j = i + 1; j < ball.players.length; j++) {
        const count = pairHistory.get(ball.players[i])?.get(ball.players[j]) || 0;
        if (count > 0) {
          const p1 = participants.find((x) => x.email === ball.players[i]);
          const p2 = participants.find((x) => x.email === ball.players[j]);
          const sameTeam = p1?.team && p1.team === p2?.team;
          score += count * (sameTeam ? 40 : 8);
        }
      }
    }

    // Three-ball fairness: penalise if player already had many 3-balls
    if (ball.players.length === 3) {
      for (const p of ball.players) {
        score += (threeBallHistory.get(p) || 0) * 15;
      }
    }
  }

  return score;
};

// ── main generators ─────────────────────────────────────────────────────

/**
 * Generate a single candidate pairing from shuffled active players.
 * Distributes players round-robin into evenly-sized balls.
 * Team balance is optimised by the scoring loop in generateAutoPairings.
 */
const generateCandidate = (activePlayers, participants, preferredBallSize = 4) => {
  const totalPlayers = activePlayers.length;
  const numBalls = Math.ceil(totalPlayers / preferredBallSize);
  const balls = Array.from({ length: numBalls }, (_, i) => ({
    ballNumber: i + 1,
    players: [],
    locked: false,
  }));

  // Shuffle all players and deal round-robin — guarantees size balance (±1)
  const shuffled = shuffle(activePlayers);
  for (let i = 0; i < shuffled.length; i++) {
    balls[i % numBalls].players.push(shuffled[i]);
  }

  return balls;
};

/**
 * AUTO mode: generate pairings optimised for fairness.
 *
 * @param {string[]}  activePlayers   - emails of players in this round
 * @param {object[]}  participants    - full participant list with team info
 * @param {object[]}  previousRounds  - completed rounds with pairings
 * @param {object}    options
 * @param {object[]}  [options.lockedBalls] - manually locked balls to preserve
 * @param {number}    [options.iterations]  - candidates to try (default 500)
 * @param {number}    [options.preferredBallSize] - preferred players per ball (3 or 4)
 * @returns {{ pairings: object[], score: number }}
 */
export const generateAutoPairings = (
  activePlayers,
  participants,
  previousRounds = [],
  { lockedBalls = [], iterations = 500, preferredBallSize = 4 } = {}
) => {
  const pairHistory = buildPairHistory(previousRounds);
  const threeBallHistory = buildThreeBallHistory(previousRounds);

  // Remove locked-ball players from pool
  const lockedPlayerSet = new Set(lockedBalls.flatMap((b) => b.players));
  const pool = activePlayers.filter((p) => !lockedPlayerSet.has(p));

  let bestBalls = null;
  let bestScore = Infinity;

  for (let i = 0; i < iterations; i++) {
    const candidate = generateCandidate(pool, participants, preferredBallSize);
    const allBalls = [...lockedBalls, ...candidate];
    const s = scorePairing(allBalls, participants, pairHistory, threeBallHistory);
    if (s < bestScore) {
      bestScore = s;
      bestBalls = allBalls;
    }
  }

  // Renumber balls sequentially
  bestBalls.forEach((b, i) => (b.ballNumber = i + 1));

  return { pairings: bestBalls, score: bestScore };
};

/**
 * LEADER mode: top players from each team in the final ball,
 * remaining players paired with AUTO.
 *
 * @param {string[]}  activePlayers
 * @param {object[]}  participants
 * @param {object}    scores         - { email: { roundIdx: points } }
 * @param {object[]}  previousRounds
 * @param {number}    [topN=2]       - top N from each team in leader ball
 */
export const generateLeaderPairings = (
  activePlayers,
  participants,
  scores = {},
  previousRounds = [],
  topN = 2,
  preferredBallSize = 4
) => {
  // Calculate total score per active player
  const totals = activePlayers.map((email) => {
    const rounds = scores[email] || {};
    const total = Object.values(rounds).reduce((s, v) => s + (v || 0), 0);
    return { email, total };
  });

  // Separate by team
  const team1 = totals
    .filter((p) => participants.find((x) => x.email === p.email)?.team === 1)
    .sort((a, b) => b.total - a.total);
  const team2 = totals
    .filter((p) => participants.find((x) => x.email === p.email)?.team === 2)
    .sort((a, b) => b.total - a.total);

  // Leader ball: top N from each team
  const leaderPlayers = [
    ...team1.slice(0, topN).map((p) => p.email),
    ...team2.slice(0, topN).map((p) => p.email),
  ];

  const leaderBall = {
    ballNumber: 0, // Will be renumbered to last
    players: leaderPlayers,
    locked: true,
  };

  // Remaining players via auto algorithm
  const remaining = activePlayers.filter((e) => !leaderPlayers.includes(e));
  const { pairings: autoBalls } = generateAutoPairings(
    remaining,
    participants,
    previousRounds,
    { lockedBalls: [], preferredBallSize }
  );

  // Put leader ball last for dramatic reveal
  const allBalls = [...autoBalls, leaderBall];
  allBalls.forEach((b, i) => (b.ballNumber = i + 1));

  return { pairings: allBalls, leaderBallNumber: allBalls.length };
};

/**
 * Validate a manual pairing:
 *   - every active player assigned exactly once
 *   - ball sizes between 2 and 4
 *
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validatePairings = (pairings, activePlayers) => {
  const errors = [];
  const assigned = new Set();

  for (const ball of pairings) {
    if (ball.players.length < 2 || ball.players.length > 4) {
      errors.push(`Boll ${ball.ballNumber} har ${ball.players.length} spelare (ska vara 2–4)`);
    }
    for (const p of ball.players) {
      if (assigned.has(p)) errors.push(`${p} finns i fler än en boll`);
      assigned.add(p);
    }
  }

  for (const p of activePlayers) {
    if (!assigned.has(p)) errors.push(`${p} saknas i lottningen`);
  }

  for (const p of assigned) {
    if (!activePlayers.includes(p)) errors.push(`${p} är inte aktiv men finns i en boll`);
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Get statistics about pairing history for display.
 */
export const getPairingStats = (previousRounds, participants) => {
  const pairHistory = buildPairHistory(previousRounds);
  const threeBallHistory = buildThreeBallHistory(previousRounds);

  return {
    /** How many times each pair has played together */
    pairCounts: Object.fromEntries(
      [...pairHistory.entries()].map(([email, partners]) => [
        email,
        Object.fromEntries(partners),
      ])
    ),
    /** How many times each player has been in a three-ball */
    threeBallCounts: Object.fromEntries(threeBallHistory),
    totalRounds: previousRounds.filter((r) => r.pairings).length,
  };
};
