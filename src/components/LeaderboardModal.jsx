import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Edit3, Save, Plus, User, Trophy, Trash2, BarChart2, ChevronDown, MapPin, Target, Check, Crosshair, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGPSCapture, calculateDistance } from '../utils/useGPSCapture';

// Custom marker icons for longest drive
const createTeeIcon = () => L.divIcon({
  className: 'custom-tee-icon',
  html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
      <path d="M12 2L12 14M8 14H16L14 22H10L8 14Z"/>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createBallIcon = (fairway, isCurrentUser) => L.divIcon({
  className: 'custom-ball-icon',
  html: `<div style="background: ${fairway ? (isCurrentUser ? '#3b82f6' : '#22c55e') : '#ef4444'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Component to auto-fit map bounds
const FitBoundsComponent = ({ points }) => {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);
  
  return null;
};

// Stacked bar chart comparing user vs average
const ComparisonChart = ({ scores, participants, roundCount, currentUserEmail, sortOrder }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // High-contrast blue palette - curated for visual distinction
  const roundColors = [
    '#93C5FD', // light blue (blue-300)
    '#3B82F6', // primary blue (blue-500)
    '#1D4ED8', // deep blue (blue-700)
    '#1E3A8A', // dark navy (blue-900)
    '#60A5FA', // sky blue (blue-400)
    '#2563EB', // royal blue (blue-600)
    '#1E40AF', // navy (blue-800)
    '#BFDBFE', // pale blue (blue-200)
  ];
  
  const getColor = (index) => roundColors[index % roundColors.length];
  
  // Calculate user and average scores per round
  const userScores = [];
  const avgScores = [];
  let userTotal = 0;
  let avgTotal = 0;
  
  for (let r = 0; r < roundCount; r++) {
    // User score for this round
    const userScore = scores[currentUserEmail]?.[r] || 0;
    userScores.push(userScore);
    userTotal += userScore;
    
    // Average score for this round
    let roundSum = 0;
    let roundCount_ = 0;
    participants.forEach(p => {
      const score = scores[p.email]?.[r] || 0;
      roundSum += score;
      roundCount_++;
    });
    const avgScore = roundCount_ > 0 ? roundSum / roundCount_ : 0;
    avgScores.push(avgScore);
    avgTotal += avgScore;
  }
  
  // Find max to scale bars
  const maxTotal = Math.max(userTotal, avgTotal, 1);
  
  // Check if user is participating
  const userParticipant = participants.find(p => p.email?.toLowerCase() === currentUserEmail);
  if (!userParticipant || roundCount === 0) return null;
  
  // SVG dimensions
  const svgWidth = 280;
  const svgHeight = 130;
  const barWidth = 52;
  const barSpacing = 48;
  const startX = 64;
  const maxBarHeight = 85;
  const bottomY = 105;
  const segmentGap = 1; // Subtle gap between segments
  const cornerRadius = 6; // Rounded top corners
  
  // Build stacked bars with rounded top
  const buildStackedBar = (values, x, label, total, isUser) => {
    const segments = [];
    let currentY = bottomY;
    const barHeight = (total / maxTotal) * maxBarHeight;
    
    // Filter out zero values and calculate positions
    const nonZeroValues = values.map((v, i) => ({ value: v, index: i })).filter(v => v.value > 0);
    
    nonZeroValues.forEach((item, arrayIdx) => {
      const segmentHeight = (item.value / total) * barHeight - segmentGap;
      currentY -= segmentHeight + segmentGap;
      const isTopSegment = arrayIdx === nonZeroValues.length - 1;
      
      if (isTopSegment) {
        // Rounded top corners only on topmost segment
        segments.push(
          <path
            key={item.index}
            d={`
              M ${x} ${currentY + cornerRadius}
              Q ${x} ${currentY} ${x + cornerRadius} ${currentY}
              L ${x + barWidth - cornerRadius} ${currentY}
              Q ${x + barWidth} ${currentY} ${x + barWidth} ${currentY + cornerRadius}
              L ${x + barWidth} ${currentY + segmentHeight}
              L ${x} ${currentY + segmentHeight}
              Z
            `}
            fill={getColor(item.index)}
            className="transition-all duration-500"
          />
        );
      } else {
        segments.push(
          <rect
            key={item.index}
            x={x}
            y={currentY}
            width={barWidth}
            height={segmentHeight}
            fill={getColor(item.index)}
            className="transition-all duration-500"
          />
        );
      }
    });
    
    // Subtle highlight overlay on the bar
    const highlightGradientId = `highlight-${isUser ? 'user' : 'avg'}`;
    
    return (
      <g key={label}>
        {/* Gradient definition for subtle sheen */}
        <defs>
          <linearGradient id={highlightGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.05)" />
          </linearGradient>
        </defs>
        
        {/* Bar segments */}
        {segments}
        
        {/* Subtle sheen overlay */}
        <rect
          x={x}
          y={bottomY - barHeight}
          width={barWidth}
          height={barHeight}
          fill={`url(#${highlightGradientId})`}
          rx={cornerRadius}
          pointerEvents="none"
        />
        
        {/* Label below bar */}
        <text
          x={x + barWidth / 2}
          y={bottomY + 16}
          textAnchor="middle"
          className="fill-gray-400"
          style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.02em' }}
        >
          {label}
        </text>
        
        {/* Total above bar */}
        <text
          x={x + barWidth / 2}
          y={bottomY - barHeight - 8}
          textAnchor="middle"
          className="fill-gray-200"
          style={{ fontSize: '13px', fontWeight: 600 }}
        >
          {Math.round(total)}
        </text>
      </g>
    );
  };
  
  return (
    <div className="border-t border-white/10">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <BarChart2 size={14} className="text-gray-500" />
        <span className="text-sm text-gray-400 flex-1">Jämförelse</span>
        <ChevronDown 
          size={14} 
          className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} 
        />
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight + 20}`} className="max-w-[300px] mx-auto">
            {/* Subtle grid line */}
            <line 
              x1={startX - 8} 
              y1={bottomY} 
              x2={startX + 2 * barWidth + barSpacing + 8} 
              y2={bottomY} 
              stroke="rgba(255,255,255,0.08)" 
              strokeWidth="1"
            />
            
            {/* Bars */}
            {buildStackedBar(userScores, startX, 'Du', userTotal, true)}
            {buildStackedBar(avgScores, startX + barWidth + barSpacing, 'Snitt', avgTotal, false)}
          </svg>
          
          {/* Legend - pill style */}
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {Array.from({ length: roundCount }).map((_, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5"
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: getColor(idx) }}
                />
                <span className="text-[10px] text-gray-400 font-medium">R{idx + 1}</span>
              </div>
            ))}
          </div>
          
          {/* Statistics row */}
          {(() => {
            const diff = userTotal - avgTotal;
            const diffSign = diff >= 0 ? '+' : '';
            const diffColor = diff >= 0 ? 'text-emerald-400' : 'text-rose-400';
            
            // Find best and worst rounds
            let bestRound = { index: 0, score: userScores[0] || 0 };
            let worstRound = { index: 0, score: userScores[0] || 0 };
            
            userScores.forEach((score, idx) => {
              if (score > bestRound.score) bestRound = { index: idx, score };
              if (score < worstRound.score) worstRound = { index: idx, score };
            });
            
            return (
              <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                {/* Diff vs average */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Vs snitt</span>
                  <span className={`text-sm font-semibold tabular-nums ${diffColor}`}>
                    {diffSign}{diff.toFixed(1)}p
                  </span>
                </div>
                
                {/* Best & worst round */}
                {roundCount > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Bäst / Sämst</span>
                    <div className="flex items-center gap-3 text-sm tabular-nums">
                      <span className="text-emerald-400">
                        R{bestRound.index + 1} <span className="text-gray-500">({bestRound.score}p)</span>
                      </span>
                      <span className="text-gray-600">/</span>
                      <span className="text-rose-400">
                        R{worstRound.index + 1} <span className="text-gray-500">({worstRound.score}p)</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

// Triangle up/down icons for rank change
const TriangleUp = ({ className }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={className}>
    <path d="M5 2 L9 8 L1 8 Z" fill="currentColor" />
  </svg>
);

const TriangleDown = ({ className }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={className}>
    <path d="M5 8 L9 2 L1 2 Z" fill="currentColor" />
  </svg>
);

// Avatar with initials and consistent color based on email or team
const Avatar = ({ name, email, size = 'md', isCurrentUser = false, team = null }) => {
  // Team colors override individual colors
  const getTeamColor = (teamId) => {
    if (teamId === 1) return 'bg-cyan-500';
    if (teamId === 2) return 'bg-orange-500';
    return null;
  };
  
  // Generate consistent color from email
  const getColorFromEmail = (email) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-cyan-500', 'bg-teal-500', 'bg-orange-500'
    ];
    const hash = (email || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return (email || '?').slice(0, 2).toUpperCase();
  };
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs'
  };
  
  // Priority: team color > current user > email hash
  const colorClass = team ? getTeamColor(team) : (isCurrentUser ? 'bg-blue-500' : getColorFromEmail(email));
  
  return (
    <div className={`${sizeClasses[size]} ${colorClass} rounded-full flex items-center justify-center flex-shrink-0 font-medium text-white`}>
      {getInitials(name, email)}
    </div>
  );
};

export default function LeaderboardModal({ 
  data, 
  currentUser, 
  shares = {}, 
  canEdit = false, 
  onClose, 
  onUpdateScores,
  onUpdateShots,
  onUpdateRounds,
  onAddRound,
  onDeleteRound,
  preciseGPS = true
}) {
  const [currentRound, setCurrentRound] = useState(() => {
    // Start at last round if there are rounds, otherwise 0
    const rc = data.roundCount || 0;
    return rc > 0 ? rc - 1 : 0;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editScores, setEditScores] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [sortBy, setSortBy] = useState('total'); // 'total' or 'round'
  const [focusedParticipant, setFocusedParticipant] = useState(null);
  const [rowOffsets, setRowOffsets] = useState({}); // For FLIP animation
  const [showDeleteRoundConfirm, setShowDeleteRoundConfirm] = useState(false);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'team' - for team mode display toggle
  
  // Longest drive specific state
  const [ldTab, setLdTab] = useState('results'); // 'results', 'capture', 'map'
  const [capturingFor, setCapturingFor] = useState(null); // 'tee' or participant email
  const [showMap, setShowMap] = useState(false);
  const [ldStatsExpanded, setLdStatsExpanded] = useState(false); // Stats collapsed by default
  
  const playIntervalRef = useRef(null);
  const inputRefs = useRef({});
  const rowRefs = useRef({});
  
  // GPS capture hook - same settings as object pinning (10m threshold, 15s timeout)
  const gpsCapture = useGPSCapture({ preciseGPS, accuracyThreshold: 10, timeout: 15000 });
  
  const title = data.title || 'Leaderboard';
  const participants = data.participants || [];
  const roundCount = data.roundCount || 0;
  const scores = data.scores || {};
  const shots = data.shots || {}; // Longest drive shots: { [email]: { [roundIndex]: { distance, fairway, position } } }
  const rounds = data.rounds || []; // Round metadata: [{ holeNumber?, teePosition: { lat, lng, accuracy }? }]
  const status = data.status || 'active';
  const sortOrder = data.sortOrder || 'desc';
  const mode = data.mode || 'single'; // Competition mode: 'single' or 'team'
  const competitionType = data.competitionType || 'score'; // 'score' or 'longestdrive'
  const isLongestDrive = competitionType === 'longestdrive';
  const teams = data.teams || [
    { id: 1, name: 'Lag 1' },
    { id: 2, name: 'Lag 2' }
  ];
  
  const currentUserEmail = currentUser?.email?.toLowerCase();
  const isTeamMode = mode === 'team';
  
  // Set focused participant to current user by default
  useEffect(() => {
    if (!focusedParticipant && currentUserEmail) {
      const userParticipant = participants.find(p => p.email?.toLowerCase() === currentUserEmail);
      if (userParticipant) {
        setFocusedParticipant(userParticipant.email);
      }
    }
  }, [currentUserEmail, participants, focusedParticipant]);
  
  // Initialize edit scores when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const initialScores = {};
      participants.forEach(p => {
        initialScores[p.email] = scores[p.email]?.[currentRound] ?? '';
      });
      setEditScores(initialScores);
    }
  }, [isEditing, currentRound, participants, scores]);
  
  // Cleanup play interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);
  
  // Calculate total score up to a specific round
  const getTotalUpToRound = (email, upToRound) => {
    const participantScores = scores[email] || {};
    let total = 0;
    for (let i = 0; i <= upToRound; i++) {
      total += participantScores[i] || 0;
    }
    return total;
  };
  
  // Get ranking at a specific round (with shared ranks for ties)
  const getRankingAtRound = (roundIndex) => {
    const sorted = participants
      .map(p => ({
        ...p,
        roundScore: scores[p.email]?.[roundIndex] || 0,
        total: getTotalUpToRound(p.email, roundIndex)
      }))
      .sort((a, b) => {
        const scoreA = sortBy === 'round' ? a.roundScore : a.total;
        const scoreB = sortBy === 'round' ? b.roundScore : b.total;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    
    // Add rank with ties (standard competition ranking: 1, 1, 3)
    // Use for-loop to allow referencing previous items
    const withRanks = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const sortScore = sortBy === 'round' ? p.roundScore : p.total;
      const prevSortScore = i > 0 
        ? (sortBy === 'round' ? sorted[i - 1].roundScore : sorted[i - 1].total)
        : null;
      
      // Same score as previous = same rank, otherwise position + 1
      const rank = (i > 0 && sortScore === prevSortScore)
        ? withRanks[i - 1].rank
        : i + 1;
      
      withRanks.push({ ...p, rank, sortScore });
    }
    
    // Second pass: mark ties (check if anyone else has same rank)
    return withRanks.map(p => {
      const isTied = withRanks.filter(other => other.rank === p.rank).length > 1;
      return { ...p, isTied };
    });
  };
  
  // Get rank change compared to previous round
  const getRankChange = (email, roundIndex) => {
    if (roundIndex === 0) return 0;
    
    const currentRanking = getRankingAtRound(roundIndex);
    const previousRanking = getRankingAtRound(roundIndex - 1);
    
    const currentRank = currentRanking.findIndex(p => p.email === email) + 1;
    const previousRank = previousRanking.findIndex(p => p.email === email) + 1;
    
    return previousRank - currentRank; // Positive = moved up, negative = moved down
  };
  
  const rankedParticipants = getRankingAtRound(currentRound);
  
  // Team-related calculations
  const getTeamTotalUpToRound = (teamId, upToRound) => {
    const teamMembers = participants.filter(p => p.team === teamId);
    return teamMembers.reduce((sum, p) => sum + getTotalUpToRound(p.email, upToRound), 0);
  };
  
  const getTeamRoundScore = (teamId, roundIndex) => {
    const teamMembers = participants.filter(p => p.team === teamId);
    return teamMembers.reduce((sum, p) => sum + (scores[p.email]?.[roundIndex] || 0), 0);
  };
  
  const getTeamRankingAtRound = (roundIndex) => {
    const sorted = teams
      .filter(team => participants.some(p => p.team === team.id)) // Only teams with members
      .map(team => ({
        ...team,
        roundScore: getTeamRoundScore(team.id, roundIndex),
        total: getTeamTotalUpToRound(team.id, roundIndex),
        members: participants.filter(p => p.team === team.id)
      }))
      .sort((a, b) => {
        const scoreA = sortBy === 'round' ? a.roundScore : a.total;
        const scoreB = sortBy === 'round' ? b.roundScore : b.total;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    
    // Add rank with ties (standard competition ranking: 1, 1, 3)
    // Use for-loop to allow referencing previous items
    const withRanks = [];
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      const sortScore = sortBy === 'round' ? t.roundScore : t.total;
      const prevSortScore = i > 0 
        ? (sortBy === 'round' ? sorted[i - 1].roundScore : sorted[i - 1].total)
        : null;
      
      const rank = (i > 0 && sortScore === prevSortScore)
        ? withRanks[i - 1].rank
        : i + 1;
      
      withRanks.push({ ...t, rank, sortScore });
    }
    
    // Mark ties
    return withRanks.map(t => {
      const isTied = withRanks.filter(other => other.rank === t.rank).length > 1;
      return { ...t, isTied };
    });
  };
  
  const rankedTeams = getTeamRankingAtRound(currentRound);
  
  // FLIP animation for row position changes
  const animateRowChange = (newRound) => {
    // First: Record current positions
    const firstPositions = {};
    Object.keys(rowRefs.current).forEach(email => {
      const el = rowRefs.current[email];
      if (el) {
        firstPositions[email] = el.getBoundingClientRect().top;
      }
    });
    
    // Change round
    setCurrentRound(newRound);
    
    // After render, calculate and apply FLIP
    requestAnimationFrame(() => {
      const offsets = {};
      Object.keys(rowRefs.current).forEach(email => {
        const el = rowRefs.current[email];
        if (el && firstPositions[email] !== undefined) {
          const lastPosition = el.getBoundingClientRect().top;
          const delta = firstPositions[email] - lastPosition;
          if (Math.abs(delta) > 2) {
            offsets[email] = delta;
          }
        }
      });
      
      if (Object.keys(offsets).length > 0) {
        setRowOffsets(offsets);
        // Clear offsets after animation
        setTimeout(() => setRowOffsets({}), 400);
      }
    });
  };
  
  // Play animation through rounds
  const handlePlay = () => {
    if (roundCount === 0) return;
    
    setIsPlaying(true);
    
    // Start from round 0 with animation
    animateRowChange(0);
    
    let round = 0;
    playIntervalRef.current = setInterval(() => {
      round++;
      if (round >= roundCount) {
        clearInterval(playIntervalRef.current);
        setIsPlaying(false);
      } else {
        animateRowChange(round);
      }
    }, 1800); // 1.8 seconds between rounds for smoother feel
  };
  
  const handlePause = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    setIsPlaying(false);
  };
  
  const handleStop = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    setIsPlaying(false);
    setCurrentRound(roundCount > 0 ? roundCount - 1 : 0);
  };
  
  // Handle score input change
  const handleScoreChange = (email, value) => {
    setEditScores(prev => ({
      ...prev,
      [email]: value
    }));
  };
  
  // Handle Enter key to move to next input
  const handleKeyDown = (e, email, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = index + 1;
      const nextParticipant = participants[nextIndex];
      if (nextParticipant && inputRefs.current[nextParticipant.email]) {
        inputRefs.current[nextParticipant.email].focus();
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };
  
  // Save scores
  const handleSave = () => {
    if (!onUpdateScores) return;
    
    const newScores = { ...scores };
    participants.forEach(p => {
      if (!newScores[p.email]) {
        newScores[p.email] = {};
      }
      const value = editScores[p.email];
      if (value !== '' && value !== undefined) {
        newScores[p.email][currentRound] = parseFloat(value) || 0;
      }
    });
    
    onUpdateScores(newScores);
    setIsEditing(false);
  };
  
  // Add new round
  const handleAddRound = () => {
    if (onAddRound) {
      onAddRound();
      // Switch to the new round
      setTimeout(() => {
        setCurrentRound(roundCount);
      }, 100);
    }
  };
  
  // Delete current round
  const handleDeleteRound = () => {
    if (onDeleteRound && roundCount > 0) {
      onDeleteRound(currentRound);
      setShowDeleteRoundConfirm(false);
      // Move to previous round if we deleted the last one
      if (currentRound >= roundCount - 1) {
        setCurrentRound(Math.max(0, roundCount - 2));
      }
    }
  };

  // ========== LONGEST DRIVE HANDLERS ==========
  
  // Get current round's tee position
  const getCurrentTeePosition = () => {
    return rounds[currentRound]?.teePosition || null;
  };
  
  // Get current round's hole number
  const getCurrentHoleNumber = () => {
    return rounds[currentRound]?.holeNumber || null;
  };
  
  // Get participant's shot for current round
  const getParticipantShot = (email) => {
    return shots[email]?.[currentRound] || null;
  };
  
  // Update hole number for current round
  const handleSetHoleNumber = (holeNum) => {
    if (!onUpdateRounds) return;
    const newRounds = [...rounds];
    if (!newRounds[currentRound]) {
      newRounds[currentRound] = {};
    }
    newRounds[currentRound] = {
      ...newRounds[currentRound],
      holeNumber: holeNum ? parseInt(holeNum) : null
    };
    onUpdateRounds(newRounds);
  };
  
  // Capture tee position
  const handleCaptureTee = async () => {
    if (!onUpdateRounds) return;
    setCapturingFor('tee');
    
    try {
      const pos = await gpsCapture.capture();
      const newRounds = [...rounds];
      if (!newRounds[currentRound]) {
        newRounds[currentRound] = {};
      }
      newRounds[currentRound] = {
        ...newRounds[currentRound],
        teePosition: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }
      };
      onUpdateRounds(newRounds);
    } catch (err) {
      console.error('Failed to capture tee position:', err);
      alert(err.message);
    } finally {
      setCapturingFor(null);
    }
  };
  
  // Capture ball position for a participant
  // Editors can capture anyone's ball, viewers only their own
  const handleCaptureBall = async (email) => {
    console.log('[handleCaptureBall] Starting for:', email);
    console.log('[handleCaptureBall] onUpdateShots:', !!onUpdateShots);
    console.log('[handleCaptureBall] currentRound:', currentRound);
    console.log('[handleCaptureBall] rounds:', rounds);
    console.log('[handleCaptureBall] shots:', shots);
    
    // Permission check: editors can do all, viewers only their own
    const targetEmail = email?.toLowerCase();
    if (!canEdit && targetEmail !== currentUserEmail) {
      console.warn('Viewers can only capture their own ball position');
      return;
    }
    
    if (!onUpdateShots) {
      console.error('onUpdateShots is not defined');
      alert('Fel: onUpdateShots saknas');
      return;
    }
    const tee = getCurrentTeePosition();
    console.log('[handleCaptureBall] teePosition:', tee);
    
    if (!tee) {
      alert('Sätt tee-position först!');
      return;
    }
    
    // Cancel any previous capture in progress
    if (gpsCapture.isCapturing) {
      console.log('[handleCaptureBall] Cancelling previous capture');
      gpsCapture.cancel();
      // Wait a tick for state to clear
      await new Promise(r => setTimeout(r, 100));
    }
    
    setCapturingFor(email);
    
    try {
      console.log('[handleCaptureBall] Starting GPS capture...');
      const pos = await gpsCapture.capture();
      console.log('[handleCaptureBall] Got position:', pos);
      
      const distance = calculateDistance(tee.lat, tee.lng, pos.lat, pos.lng);
      console.log('[handleCaptureBall] Calculated distance:', distance);
      
      const newShots = { ...shots };
      if (!newShots[email]) {
        newShots[email] = {};
      }
      newShots[email][currentRound] = {
        ...newShots[email]?.[currentRound],
        position: { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy },
        distance,
        fairway: newShots[email]?.[currentRound]?.fairway ?? true
      };
      
      console.log('[handleCaptureBall] Calling onUpdateShots with:', newShots);
      await onUpdateShots(newShots);
      console.log('[handleCaptureBall] Success!');
    } catch (err) {
      console.error('[handleCaptureBall] Failed:', err);
      alert('Fel vid positionshämtning: ' + err.message);
    } finally {
      setCapturingFor(null);
    }
  };
  
  // Toggle fairway status for a participant
  // Editors can toggle anyone, viewers can only toggle their own
  const handleToggleFairway = (email) => {
    if (!onUpdateShots) return;
    
    // Permission check: editors can do all, viewers only their own
    const targetEmail = email?.toLowerCase();
    if (!canEdit && targetEmail !== currentUserEmail) {
      console.warn('Viewers can only toggle their own fairway status');
      return;
    }
    
    const newShots = { ...shots };
    if (!newShots[email]) {
      newShots[email] = {};
    }
    if (!newShots[email][currentRound]) {
      newShots[email][currentRound] = { fairway: true };
    }
    newShots[email][currentRound] = {
      ...newShots[email][currentRound],
      fairway: !newShots[email][currentRound].fairway
    };
    onUpdateShots(newShots);
  };
  
  // Get ranked participants for longest drive (current round)
  const getLongestDriveRanking = () => {
    const qualified = [];
    const disqualified = [];
    
    participants.forEach(p => {
      const shot = getParticipantShot(p.email);
      if (shot?.distance > 0) {
        if (shot.fairway) {
          qualified.push({ ...p, ...shot });
        } else {
          disqualified.push({ ...p, ...shot });
        }
      } else {
        // No shot yet
        qualified.push({ ...p, distance: 0, fairway: true, position: null });
      }
    });
    
    // Sort by distance descending
    qualified.sort((a, b) => (b.distance || 0) - (a.distance || 0));
    disqualified.sort((a, b) => (b.distance || 0) - (a.distance || 0));
    
    return { qualified, disqualified };
  };

  // Calculate longest drive statistics for current round
  const getLongestDriveStats = () => {
    const { qualified, disqualified } = getLongestDriveRanking();
    const allWithDistance = [...qualified, ...disqualified].filter(p => p.distance > 0);
    
    if (allWithDistance.length === 0) {
      return null;
    }
    
    // Calculate stats
    const distances = allWithDistance.map(p => p.distance);
    const totalDistance = distances.reduce((sum, d) => sum + d, 0);
    const avgDistance = Math.round(totalDistance / distances.length);
    const maxDistance = Math.max(...distances);
    const minDistance = Math.min(...distances);
    
    // Find longest drive holder (fairway only)
    const longestDrive = qualified.find(p => p.distance === maxDistance && p.fairway);
    
    // Fairway percentage
    const fairwayHits = qualified.filter(p => p.distance > 0 && p.fairway).length;
    const totalShots = allWithDistance.length;
    const fairwayPct = Math.round((fairwayHits / totalShots) * 100);
    
    // Current user stats
    const currentUserShot = allWithDistance.find(p => p.email?.toLowerCase() === currentUserEmail);
    const userDiffFromAvg = currentUserShot ? currentUserShot.distance - avgDistance : null;
    const userRank = currentUserShot && currentUserShot.fairway
      ? qualified.findIndex(p => p.email?.toLowerCase() === currentUserEmail) + 1
      : null;
    
    return {
      avgDistance,
      maxDistance,
      minDistance,
      longestDrive,
      fairwayPct,
      fairwayHits,
      totalShots,
      userDiffFromAvg,
      userRank,
      participantsWithShots: allWithDistance.length
    };
  };

  // Rank display component
  const RankDisplay = ({ rank, isTied }) => {
    if (rank === 1) return (
      <span className="relative">
        <Trophy size={16} className="text-amber-400" />
        {isTied && <span className="absolute -right-1.5 -top-1 text-[8px] text-amber-400 font-bold">=</span>}
      </span>
    );
    if (rank === 2) return (
      <span className="relative">
        <Trophy size={16} className="text-gray-300" />
        {isTied && <span className="absolute -right-1.5 -top-1 text-[8px] text-gray-300 font-bold">=</span>}
      </span>
    );
    if (rank === 3) return (
      <span className="relative">
        <Trophy size={16} className="text-orange-600" />
        {isTied && <span className="absolute -right-1.5 -top-1 text-[8px] text-orange-600 font-bold">=</span>}
      </span>
    );
    return (
      <span className="text-sm text-gray-500 w-4 text-center">{rank}</span>
    );
  };
  
  // Rank change indicator
  const RankChangeIndicator = ({ change }) => {
    if (change > 0) {
      return <TriangleUp className="text-green-400" />;
    } else if (change < 0) {
      return <TriangleDown className="text-red-400" />;
    }
    return <span className="text-gray-600">–</span>;
  };
  
  return (
    <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900/50">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          {isLongestDrive ? (
            <Target size={20} className="text-green-400" />
          ) : (
            <Trophy size={20} className="text-amber-400" />
          )}
          {isEditing ? 'Redigera poäng' : (isLongestDrive ? 'Longest Drive' : 'Poäng')}
        </h2>
        <div className="flex items-center gap-2">
          {/* View toggle for team mode (only when not editing) */}
          {isTeamMode && !isEditing && (
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => setViewMode('single')}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'single'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
                title="Visa individer"
              >
                <User size={14} />
              </button>
              <button
                onClick={() => setViewMode('team')}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'team'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
                }`}
                title="Visa lag"
              >
                <span className="text-xs">LAG</span>
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Round navigation / controls */}
      <div className="px-4 py-3 border-b border-white/10 bg-gray-900/30">
        {isEditing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentRound(Math.max(0, currentRound - 1))}
                disabled={currentRound === 0}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-300 min-w-[100px] text-center">
                Runda {currentRound + 1} av {roundCount || 1}
              </span>
              <button
                onClick={() => setCurrentRound(Math.min((roundCount || 1) - 1, currentRound + 1))}
                disabled={currentRound >= (roundCount || 1) - 1}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {roundCount > 0 && onDeleteRound && (
                <button
                  onClick={() => setShowDeleteRoundConfirm(true)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400"
                  title="Ta bort runda"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={handleAddRound}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm"
              >
                <Plus size={14} />
                Ny runda
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => animateRowChange(Math.max(0, currentRound - 1))}
                disabled={currentRound === 0 || isPlaying}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-300 min-w-[100px] text-center">
                {`Runda ${currentRound + 1}${roundCount > 1 ? ` av ${roundCount}` : ''}${
                  isLongestDrive && rounds[currentRound]?.holeNumber 
                    ? ` (Hål ${rounds[currentRound].holeNumber})` 
                    : ''
                }`}
              </span>
              <button
                onClick={() => animateRowChange(Math.min(roundCount - 1, currentRound + 1))}
                disabled={currentRound >= roundCount - 1 || isPlaying}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Play controls - only show if more than 1 round */}
              {roundCount > 1 && isPlaying && (
                <button
                  onClick={handlePause}
                  className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400"
                  title="Pausa"
                >
                  <Pause size={16} />
                </button>
              )}
              {roundCount > 1 && !isPlaying && (
                <button
                  onClick={handlePlay}
                  className="w-8 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400"
                  title="Spela upp"
                >
                  <Play size={14} />
                </button>
              )}
              
              {/* Edit button - visible but disabled during play */}
              {canEdit && status !== 'finished' && (
                <button
                  onClick={() => !isPlaying && setIsEditing(true)}
                  disabled={isPlaying}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPlaying 
                      ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                  title="Redigera"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Longest Drive tabs - only in longestdrive mode */}
      {isLongestDrive && !isEditing && (
        <div className="px-4 py-2 border-b border-white/10 bg-gray-900/20">
          <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
            <button
              onClick={() => setLdTab('results')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                ldTab === 'results'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Trophy size={14} />
              Resultat
            </button>
            <button
              onClick={() => setLdTab('capture')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                ldTab === 'capture'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Crosshair size={14} />
              Registrera
            </button>
            <button
              onClick={() => setLdTab('map')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                ldTab === 'map'
                  ? 'bg-green-500/20 text-green-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <MapIcon size={14} />
              Karta
            </button>
          </div>
        </div>
      )}
      
      {/* Table content */}
      <div className="flex-1 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Inga deltagare tillagda än
          </div>
        ) : isLongestDrive ? (
          /* Longest Drive Mode */
          <div className="p-4">
            {ldTab === 'results' && (
              /* Results tab - ranking by distance */
              <div className="space-y-3">
                {(() => {
                  const { qualified, disqualified } = getLongestDriveRanking();
                  const teePos = getCurrentTeePosition();
                  
                  return (
                    <>
                      {!teePos && roundCount > 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          <MapPin size={24} className="mx-auto mb-2 text-gray-600" />
                          Tee-position ej satt för denna runda
                        </div>
                      )}
                      
                      {/* Qualified players */}
                      <div className="space-y-1">
                        {qualified.map((p, idx) => {
                          const rank = p.distance > 0 ? idx + 1 : null;
                          const isCurrentUser = p.email?.toLowerCase() === currentUserEmail;
                          return (
                            <div 
                              key={p.email}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                                isCurrentUser 
                                  ? 'bg-blue-500/15 ring-1 ring-blue-500/40' 
                                  : 'bg-white/[0.03]'
                              }`}
                            >
                              <div className="w-6 flex justify-center">
                                {rank === 1 && <Trophy size={16} className="text-amber-400" />}
                                {rank === 2 && <Trophy size={16} className="text-gray-300" />}
                                {rank === 3 && <Trophy size={16} className="text-orange-600" />}
                                {rank > 3 && <span className="text-sm text-gray-500">{rank}</span>}
                                {!rank && <span className="text-sm text-gray-600">–</span>}
                              </div>
                              <Avatar 
                                name={p.name} 
                                email={p.email} 
                                isCurrentUser={isCurrentUser}
                              />
                              <span className={`flex-1 text-sm truncate ${
                                isCurrentUser ? 'text-blue-300 font-medium' : 'text-gray-300'
                              }`}>
                                {p.name || p.email?.split('@')[0]}
                                {isCurrentUser && ' (du)'}
                              </span>
                              <span className={`text-sm font-medium tabular-nums ${
                                p.distance > 0 ? 'text-green-400' : 'text-gray-600'
                              }`}>
                                {p.distance > 0 ? `${p.distance}m` : '–'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* DQ players */}
                      {disqualified.length > 0 && (
                        <>
                          <div className="text-xs text-gray-600 text-center py-2 flex items-center gap-2 justify-center">
                            <div className="flex-1 h-px bg-white/10" />
                            <span>DISKVALIFICERADE</span>
                            <div className="flex-1 h-px bg-white/10" />
                          </div>
                          <div className="space-y-1 opacity-60">
                            {disqualified.map((p) => {
                              const isCurrentUser = p.email?.toLowerCase() === currentUserEmail;
                              return (
                                <div 
                                  key={p.email}
                                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-red-500/5"
                                >
                                  <div className="w-6 flex justify-center">
                                    <span className="text-xs text-red-400 font-medium">DQ</span>
                                  </div>
                                  <Avatar 
                                    name={p.name} 
                                    email={p.email} 
                                    isCurrentUser={isCurrentUser}
                                  />
                                  <span className={`flex-1 text-sm truncate text-gray-500`}>
                                    {p.name || p.email?.split('@')[0]}
                                  </span>
                                  <span className="text-sm font-medium tabular-nums text-red-400/70">
                                    {p.distance}m
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            
            {ldTab === 'capture' && (
              /* Capture tab - GPS registration */
              <div className="space-y-4">
                {/* Hole number + Tee position section - only for editors */}
                {canEdit && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  {/* Hole number input */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    <span className="text-sm text-gray-400">Hål</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="18"
                      value={getCurrentHoleNumber() || ''}
                      onChange={(e) => handleSetHoleNumber(e.target.value)}
                      placeholder="#"
                      className="w-16 px-3 py-2 text-center text-sm bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-green-500 text-white placeholder-gray-600"
                    />
                  </div>
                  
                  {/* Tee position */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target size={16} className="text-green-400" />
                      <span className="text-sm font-medium text-white">Tee-position</span>
                    </div>
                    {getCurrentTeePosition() && (
                      <span className="text-xs text-gray-500">
                        ±{getCurrentTeePosition().accuracy}m
                      </span>
                    )}
                  </div>
                  
                  {getCurrentTeePosition() ? (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {getCurrentTeePosition().lat.toFixed(6)}, {getCurrentTeePosition().lng.toFixed(6)}
                      </div>
                      <button
                        onClick={handleCaptureTee}
                        disabled={capturingFor !== null}
                        className="px-3 py-1.5 text-xs rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                      >
                        {capturingFor === 'tee' ? (
                          <span className="flex items-center gap-1">
                            <span className="animate-pulse">●</span>
                            {gpsCapture.accuracy ? `±${gpsCapture.accuracy}m` : 'Söker...'}
                          </span>
                        ) : 'Uppdatera'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCaptureTee}
                      disabled={capturingFor !== null}
                      className="w-full py-3 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {capturingFor === 'tee' ? (
                        <>
                          <span className="animate-pulse">●</span>
                          {gpsCapture.accuracy ? `Söker... ±${gpsCapture.accuracy}m` : 'Hämtar GPS...'}
                        </>
                      ) : (
                        <>
                          <Crosshair size={16} />
                          Sätt tee-position
                        </>
                      )}
                    </button>
                  )}
                </div>
                )}
                
                {/* Show tee info for non-editors */}
                {!canEdit && getCurrentTeePosition() && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin size={14} className="text-green-400" />
                      <span>Tee-position satt{getCurrentHoleNumber() ? ` (hål ${getCurrentHoleNumber()})` : ''}</span>
                      {getCurrentTeePosition()?.accuracy && (
                        <span className="text-xs text-gray-500">±{getCurrentTeePosition().accuracy}m</span>
                      )}
                    </div>
                  </div>
                )}
                
                {!getCurrentTeePosition() && (
                  <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/30 text-sm text-blue-400 text-center">
                    Tee-position måste sättas av en redaktör innan slag kan registreras
                  </div>
                )}
                
                {/* Player shots section */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 uppercase px-1">Spelarnas slag</div>
                  {participants.map((p) => {
                    const shot = getParticipantShot(p.email);
                    const isCurrentUser = p.email?.toLowerCase() === currentUserEmail;
                    const isCapturing = capturingFor === p.email;
                    // Editors can capture all balls, viewers can only capture their own
                    const canCapture = canEdit || isCurrentUser;
                    
                    return (
                      <div 
                        key={p.email}
                        className={`rounded-xl p-3 border ${
                          isCurrentUser 
                            ? 'bg-blue-500/10 border-blue-500/30' 
                            : 'bg-white/[0.03] border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar 
                            name={p.name} 
                            email={p.email} 
                            size="sm"
                            isCurrentUser={isCurrentUser}
                          />
                          <span className={`flex-1 text-sm truncate ${
                            isCurrentUser ? 'text-blue-300' : 'text-gray-300'
                          }`}>
                            {p.name || p.email?.split('@')[0]}
                          </span>
                          {shot?.position ? (
                            <div className="text-right">
                              <span className={`text-lg font-bold tabular-nums ${
                                shot.fairway ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {shot.distance != null ? `${shot.distance}m` : '?'}
                              </span>
                              {shot.position?.accuracy && (
                                <div className="text-[10px] text-gray-500">±{shot.position.accuracy}m</div>
                              )}
                            </div>
                          ) : null}
                        </div>
                        
                        {canCapture ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCaptureBall(p.email)}
                            disabled={(capturingFor !== null && capturingFor !== p.email) || !getCurrentTeePosition()}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 ${
                              shot?.position
                                ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            } disabled:opacity-50`}
                          >
                            {isCapturing ? (
                              <>
                                <span className="animate-pulse">●</span>
                                {gpsCapture.accuracy ? `±${gpsCapture.accuracy}m` : 'Söker...'}
                              </>
                            ) : shot?.position ? (
                              <>
                                <MapPin size={14} />
                                Uppdatera position
                              </>
                            ) : (
                              <>
                                <Crosshair size={14} />
                                Markera boll
                              </>
                            )}
                          </button>
                          
                          {shot?.position && (canEdit || isCurrentUser) && (
                            <button
                              onClick={() => handleToggleFairway(p.email)}
                              className="flex items-center rounded-lg overflow-hidden border border-white/10"
                            >
                              <span className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                                shot.fairway
                                  ? 'bg-green-500/30 text-green-400'
                                  : 'bg-white/5 text-gray-500'
                              }`}>
                                ✓ Fairway
                              </span>
                              <span className={`px-2.5 py-2 text-xs font-medium transition-colors ${
                                !shot.fairway
                                  ? 'bg-red-500/30 text-red-400'
                                  : 'bg-white/5 text-gray-500'
                              }`}>
                                ✗ Miss
                              </span>
                            </button>
                          )}
                        </div>
                        ) : (
                          /* Non-editable row for other participants when viewer */
                          shot?.position && (
                            <div className={`text-xs text-center py-1.5 rounded-lg ${
                              shot.fairway ? 'text-green-400/70 bg-green-500/10' : 'text-red-400/70 bg-red-500/10'
                            }`}>
                              {shot.fairway ? '✓ Fairway' : '✗ Miss'}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {ldTab === 'map' && (
              /* Map tab - visual overview */
              <div className="space-y-3">
                {(() => {
                  const teePos = getCurrentTeePosition();
                  const { qualified, disqualified } = getLongestDriveRanking();
                  const allShots = [...qualified, ...disqualified].filter(p => p.position);
                  
                  if (!teePos) {
                    return (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        <div className="text-center">
                          <MapIcon size={24} className="mx-auto mb-2 text-gray-600" />
                          <div>Sätt tee-position för att visa karta</div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Calculate bounds to fit all markers
                  const allPoints = [
                    [teePos.lat, teePos.lng],
                    ...allShots.map(s => [s.position.lat, s.position.lng])
                  ];
                  
                  return (
                    <div className="h-[50vh] rounded-xl overflow-hidden border border-white/10">
                      <MapContainer
                        center={[teePos.lat, teePos.lng]}
                        zoom={17}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        />
                        
                        {/* Tee marker */}
                        <Marker 
                          position={[teePos.lat, teePos.lng]} 
                          icon={createTeeIcon()}
                        >
                          <Tooltip permanent direction="top" offset={[0, -12]}>
                            Tee
                          </Tooltip>
                        </Marker>
                        
                        {/* Ball markers and lines */}
                        {allShots.map((p) => {
                          const isCurrentUser = p.email?.toLowerCase() === currentUserEmail;
                          return (
                            <React.Fragment key={p.email}>
                              {/* Line from tee to ball */}
                              <Polyline
                                positions={[
                                  [teePos.lat, teePos.lng],
                                  [p.position.lat, p.position.lng]
                                ]}
                                color={p.fairway ? '#22c55e' : '#ef4444'}
                                weight={2}
                                opacity={0.6}
                                dashArray={p.fairway ? undefined : '5, 5'}
                              />
                              
                              {/* Ball marker */}
                              <Marker 
                                position={[p.position.lat, p.position.lng]}
                                icon={createBallIcon(p.fairway, isCurrentUser)}
                              >
                                <Tooltip permanent direction="top" offset={[0, -8]}>
                                  <span className={p.fairway ? '' : 'text-red-400'}>
                                    {p.name?.split(' ')[0] || p.email?.split('@')[0]} · {p.distance}m
                                    {!p.fairway && ' (DQ)'}
                                  </span>
                                </Tooltip>
                              </Marker>
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Auto-fit bounds */}
                        {allPoints.length > 1 && (
                          <FitBoundsComponent points={allPoints} />
                        )}
                      </MapContainer>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : isEditing ? (
          /* Edit mode */
          <div className="p-4 space-y-2">
            {participants.map((participant, index) => {
              const isCurrentUser = participant.email?.toLowerCase() === currentUserEmail;
              return (
                <div 
                  key={participant.email}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isCurrentUser ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'bg-white/[0.03]'
                  }`}
                >
                  <Avatar 
                    name={participant.name} 
                    email={participant.email} 
                    isCurrentUser={isCurrentUser}
                    team={isTeamMode ? participant.team : null}
                  />
                  <span className={`flex-1 text-sm truncate ${isCurrentUser ? 'text-blue-300' : 'text-gray-300'}`}>
                    {participant.name || participant.email?.split('@')[0]}
                  </span>
                  <input
                    ref={el => inputRefs.current[participant.email] = el}
                    type="number"
                    inputMode="numeric"
                    value={editScores[participant.email] ?? ''}
                    onChange={(e) => handleScoreChange(participant.email, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, participant.email, index)}
                    placeholder="0"
                    className="w-20 px-3 py-2 text-sm text-right bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-600"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          /* View mode - Table */
          <div className="p-4">
            {/* Show team view or single view */}
            {isTeamMode && viewMode === 'team' ? (
              /* Team view */
              <>
                {/* Table header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs text-gray-500 uppercase">
                  <span className="w-6 text-center">#</span>
                  <span className="flex-1">Lag</span>
                  <button
                    onClick={() => setSortBy('round')}
                    className={`w-16 text-right hover:text-gray-300 ${sortBy === 'round' ? 'text-blue-400' : ''}`}
                  >
                    Runda {currentRound + 1}
                  </button>
                  <button
                    onClick={() => setSortBy('total')}
                    className={`w-16 text-right hover:text-gray-300 ${sortBy === 'total' ? 'text-blue-400' : ''}`}
                  >
                    Total
                  </button>
                </div>
                
                {/* Team rows */}
                <div className="space-y-1 mt-2">
                  {rankedTeams.map((team, index) => {
                    const rank = team.rank;
                    const teamColor = team.id === 1 ? 'cyan' : 'orange';
                    
                    return (
                      <div 
                        key={team.id}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl ${
                          team.id === 1 
                            ? 'bg-cyan-500/10 ring-1 ring-cyan-500/30' 
                            : 'bg-orange-500/10 ring-1 ring-orange-500/30'
                        }`}
                      >
                        <div className="w-6 flex justify-center">
                          <RankDisplay rank={rank} isTied={team.isTied} />
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          team.id === 1 ? 'bg-cyan-500 text-white' : 'bg-orange-500 text-white'
                        }`}>
                          {team.id}
                        </div>
                        <span className={`flex-1 text-sm font-medium ${
                          team.id === 1 ? 'text-cyan-300' : 'text-orange-300'
                        }`}>
                          {team.name}
                        </span>
                        <span className="w-16 text-right text-sm tabular-nums text-gray-400">
                          {team.roundScore || '–'}
                        </span>
                        <span className={`w-16 text-right text-sm font-bold tabular-nums ${
                          team.id === 1 ? 'text-cyan-400' : 'text-orange-400'
                        }`}>
                          {team.total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Single/individual view */
              <>
                {/* Table header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 text-xs text-gray-500 uppercase">
                  <span className="w-6 text-center">#</span>
                  <span className="w-6 text-center">+/-</span>
                  <span className="flex-1">Deltagare</span>
                  <button
                    onClick={() => setSortBy('round')}
                    className={`w-16 text-right hover:text-gray-300 ${sortBy === 'round' ? 'text-blue-400' : ''}`}
                  >
                    Runda {currentRound + 1}
                  </button>
                  <button
                    onClick={() => setSortBy('total')}
                    className={`w-16 text-right hover:text-gray-300 ${sortBy === 'total' ? 'text-blue-400' : ''}`}
                  >
                    Total
                  </button>
                </div>
                
                {/* Table rows */}
                <div className="space-y-1 mt-2">
                  {rankedParticipants.map((participant, index) => {
                    const rank = participant.rank;
                    const rankChange = getRankChange(participant.email, currentRound);
                    const isCurrentUser = participant.email?.toLowerCase() === currentUserEmail;
                    const isFocused = participant.email === focusedParticipant;
                    const offset = rowOffsets[participant.email] || 0;
                    
                    return (
                      <div 
                        key={participant.email}
                        ref={el => rowRefs.current[participant.email] = el}
                        onClick={() => setFocusedParticipant(participant.email)}
                        style={{
                          transform: offset ? `translateY(${offset}px)` : 'translateY(0)',
                          transition: offset ? 'none' : 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer ${
                          isCurrentUser 
                            ? 'bg-blue-500/15 ring-1 ring-blue-500/40' 
                            : isFocused 
                              ? 'bg-white/10 ring-1 ring-white/20'
                              : 'bg-white/[0.03] hover:bg-white/[0.06]'
                        } ${isPlaying && isFocused ? 'ring-2 ring-blue-400/60 scale-[1.02]' : ''}`}
                      >
                        <div className="w-6 flex justify-center">
                          <RankDisplay rank={rank} isTied={participant.isTied} />
                        </div>
                        <div className="w-6 flex justify-center">
                          <RankChangeIndicator change={rankChange} />
                        </div>
                        <Avatar 
                          name={participant.name} 
                          email={participant.email} 
                          isCurrentUser={isCurrentUser}
                          team={isTeamMode ? participant.team : null}
                        />
                        <span className={`flex-1 text-sm truncate ${
                          isCurrentUser ? 'text-blue-300 font-medium' : 'text-gray-300'
                        }`}>
                          {participant.name || participant.email?.split('@')[0]}
                          {isCurrentUser && ' (du)'}
                        </span>
                        <span className="w-16 text-right text-sm tabular-nums text-gray-400">
                          {participant.roundScore || '–'}
                        </span>
                        <span className={`w-16 text-right text-sm font-medium tabular-nums ${
                          isCurrentUser ? 'text-blue-400' : 'text-gray-300'
                        }`}>
                          {participant.total}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Comparison chart - only show when not editing and has rounds (score mode) */}
      {!isEditing && roundCount > 0 && !isLongestDrive && (
        <ComparisonChart
          scores={scores}
          participants={participants}
          roundCount={roundCount}
          currentUserEmail={currentUserEmail}
          sortOrder={sortOrder}
        />
      )}
      
      {/* Longest drive statistics - only show for longest drive mode with shots */}
      {isLongestDrive && ldTab === 'results' && (() => {
        const stats = getLongestDriveStats();
        if (!stats) return null;
        
        return (
          <div className="border-t border-white/10">
            <button
              onClick={() => setLdStatsExpanded(!ldStatsExpanded)}
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <BarChart2 size={14} className="text-gray-500" />
              <span className="text-sm text-gray-400 flex-1">Statistik</span>
              <ChevronDown 
                size={14} 
                className={`text-gray-500 transition-transform ${ldStatsExpanded ? 'rotate-0' : '-rotate-90'}`} 
              />
            </button>
            
            {ldStatsExpanded && (
              <div className="px-4 pb-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Average distance */}
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Snitt</div>
                    <div className="text-lg font-bold text-white tabular-nums">{stats.avgDistance}m</div>
                  </div>
                  
                  {/* Longest drive */}
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Längst</div>
                    <div className="text-lg font-bold text-green-400 tabular-nums">{stats.maxDistance}m</div>
                    {stats.longestDrive && (
                      <div className="text-xs text-gray-500 truncate">
                        {stats.longestDrive.name || stats.longestDrive.email?.split('@')[0]}
                      </div>
                    )}
                  </div>
                  
                  {/* Fairway percentage */}
                  <div className="bg-white/[0.03] rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1">Fairway-träff</div>
                    <div className="text-lg font-bold text-white tabular-nums">{stats.fairwayPct}%</div>
                    <div className="text-xs text-gray-500">{stats.fairwayHits} av {stats.totalShots}</div>
                  </div>
                  
                  {/* User comparison */}
                  {stats.userDiffFromAvg !== null && (
                    <div className="bg-blue-500/10 rounded-xl p-3 ring-1 ring-blue-500/20">
                      <div className="text-xs text-blue-400/70 mb-1">Du vs snitt</div>
                      <div className={`text-lg font-bold tabular-nums ${
                        stats.userDiffFromAvg >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {stats.userDiffFromAvg >= 0 ? '+' : ''}{stats.userDiffFromAvg}m
                      </div>
                      {stats.userRank && (
                        <div className="text-xs text-blue-400/70">
                          Placering: {stats.userRank} av {stats.participantsWithShots}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      
      {/* Footer - Edit mode actions */}
      {isEditing && (
        <div className="px-4 py-3 border-t border-white/10 bg-gray-900/50 flex gap-3">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-400 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Spara
          </button>
        </div>
      )}
      
      {/* Delete round confirm dialog */}
      {showDeleteRoundConfirm && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">Ta bort runda?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Är du säker på att du vill ta bort runda {currentRound + 1}? Alla poäng för denna runda kommer att försvinna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteRoundConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
              >
                Avbryt
              </button>
              <button
                onClick={handleDeleteRound}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-400 text-sm font-medium"
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
