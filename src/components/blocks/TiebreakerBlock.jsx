import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RotateCcw, Trophy, Clock, Users, X, Check, Loader2, ChevronDown, Swords } from 'lucide-react';
import { doc, updateDoc, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// Game constants
const COUNTDOWN_SECONDS = 3;
const CHOOSING_SECONDS = 4;
const REVEAL_DELAY_MS = 2000;

// Choices with hand emojis
const CHOICES = {
  rock: { emoji: '✊', name: 'Sten', beats: 'scissors' },
  scissors: { emoji: '✌️', name: 'Sax', beats: 'paper' },
  paper: { emoji: '🖐️', name: 'Påse', beats: 'rock' }
};

// Determine winner of a round
const determineWinner = (choice1, choice2) => {
  if (choice1 === choice2) return 'draw';
  if (CHOICES[choice1].beats === choice2) return 'player1';
  return 'player2';
};

// Hand animation component
const AnimatedHand = ({ side, revealed, choice, isWinner }) => {
  return (
    <div className="relative transition-all duration-300">
      <div 
        className={`text-5xl sm:text-6xl transition-all duration-500 ${
          side === 'left' ? 'scale-x-[-1]' : ''
        } ${revealed ? 'scale-110' : 'animate-bounce'} ${
          isWinner ? 'drop-shadow-[0_0_20px_rgba(234,179,8,0.9)]' : ''
        }`}
      >
        {revealed && choice ? CHOICES[choice].emoji : '✊'}
      </div>
    </div>
  );
};

// Choice button component
const ChoiceButton = ({ choice, selected, onSelect, disabled }) => {
  const { emoji, name } = CHOICES[choice];
  
  return (
    <button
      onClick={() => onSelect(choice)}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl transition-all duration-200
        ${selected 
          ? 'bg-blue-500 scale-110 ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900' 
          : 'bg-white/10 hover:bg-white/20 active:scale-95'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className="text-3xl sm:text-4xl mb-1">{emoji}</span>
      <span className="text-xs text-white/70">{name}</span>
    </button>
  );
};

// Countdown display - F1 style start lights
const CountdownDisplay = ({ seconds, label }) => {
  // 3 lights - lit based on remaining seconds
  const lights = [3, 2, 1];
  
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3 mb-3">
        {lights.map((lightNum) => (
          <div 
            key={lightNum}
            className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
              seconds !== null && seconds >= lightNum
                ? 'bg-red-500 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                : 'bg-gray-700 border-gray-600'
            }`}
          />
        ))}
      </div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
};

// Score display
const ScoreDisplay = ({ player1, player2, scores, bestOf }) => (
  <div className="flex items-center justify-center gap-3 sm:gap-4 py-2">
    <div className="text-center flex-1 min-w-0">
      <div className="text-xs text-gray-400 truncate px-1">{player1?.name || '?'}</div>
      <div className="text-2xl sm:text-3xl font-bold text-white">{scores[0]}</div>
    </div>
    <div className="text-gray-600 text-xs shrink-0">
      bäst av {bestOf}
    </div>
    <div className="text-center flex-1 min-w-0">
      <div className="text-xs text-gray-400 truncate px-1">{player2?.name || '?'}</div>
      <div className="text-2xl sm:text-3xl font-bold text-white">{scores[1]}</div>
    </div>
  </div>
);

const TiebreakerBlock = ({ 
  data,
  objectId, 
  blockIndex,
  currentUser,
  shares = {},
  objectOwner,
  canEdit = false,
  onUpdateTiebreaker,
  onExpand
}) => {
  const [isCollapsed, setIsCollapsed] = useState(data?.defaultCollapsed ?? false);
  const [localData, setLocalData] = useState(data || {});
  const [countdown, setCountdown] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [myChoice, setMyChoice] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [roundWinner, setRoundWinner] = useState(null);
  const timerRef = useRef(null);
  const blockRef = useRef(null);
  const localDataRef = useRef(localData); // Ref to always have latest localData
  
  // Keep ref updated
  useEffect(() => {
    localDataRef.current = localData;
  }, [localData]);
  
  const title = data?.title || 'Tiebreaker';
  
  // Sync collapsed state when defaultCollapsed changes
  useEffect(() => {
    setIsCollapsed(data?.defaultCollapsed ?? false);
  }, [data?.defaultCollapsed]);
  
  // Real-time listener for match updates - this is the primary source of truth
  useEffect(() => {
    if (!objectId || blockIndex === undefined || blockIndex === null) return;
    
    // Initial data from props
    setLocalData(data || {});
    
    const unsubscribe = onSnapshot(
      doc(db, 'objects', objectId),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const objectData = docSnapshot.data();
          const blockData = objectData.blocks?.[blockIndex]?.data;
          if (blockData) {
            setLocalData(blockData);
          }
        }
      },
      (error) => {
        console.error('Tiebreaker realtime listener error:', error);
      }
    );
    
    return () => unsubscribe();
  }, [objectId, blockIndex]);
  
  // Clean up stale matches - runs when localData changes
  useEffect(() => {
    if (!localData.activeMatch) return;
    
    const match = localData.activeMatch;
    const roundStartedAt = match.roundStartedAt?.toMillis?.() || match.roundStartedAt;
    
    // If match is in countdown or choosing but too old (more than 30 seconds), clear it
    if ((match.status === 'countdown' || match.status === 'choosing') && roundStartedAt) {
      const elapsed = (Date.now() - roundStartedAt) / 1000;
      if (elapsed > 30) {
        // Match is stale, clear it and sync to Firestore
        const newData = { ...localData, activeMatch: null };
        setLocalData(newData);
        if (onUpdateTiebreaker) {
          onUpdateTiebreaker(newData);
        }
      }
    }
  }, [localData.activeMatch?.status, localData.activeMatch?.roundStartedAt]);
  
  // Periodic check for stale matches (every 5 seconds when match is active)
  useEffect(() => {
    if (!localData.activeMatch) return;
    if (localData.activeMatch.status === 'finished') return;
    
    const interval = setInterval(() => {
      const match = localData.activeMatch;
      if (!match) return;
      
      const roundStartedAt = match.roundStartedAt?.toMillis?.() || match.roundStartedAt;
      if ((match.status === 'countdown' || match.status === 'choosing') && roundStartedAt) {
        const elapsed = (Date.now() - roundStartedAt) / 1000;
        if (elapsed > 30) {
          const newData = { ...localData, activeMatch: null };
          setLocalData(newData);
          if (onUpdateTiebreaker) {
            onUpdateTiebreaker(newData);
          }
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [localData, onUpdateTiebreaker]);
  
  // Clean up stale challenges on load (older than 5 minutes)
  useEffect(() => {
    const challenges = localData.challenges;
    if (!challenges || Object.keys(challenges).length === 0) return;
    
    const now = Date.now();
    const staleIds = Object.entries(challenges)
      .filter(([_, c]) => {
        const createdAt = c.createdAt?.toMillis?.() || c.createdAt || 0;
        return (now - createdAt) > 5 * 60 * 1000; // 5 minutes
      })
      .map(([id]) => id);
    
    if (staleIds.length > 0) {
      const newChallenges = { ...challenges };
      staleIds.forEach(id => delete newChallenges[id]);
      const newData = { ...localData, challenges: newChallenges };
      setLocalData(newData);
      if (onUpdateTiebreaker) {
        onUpdateTiebreaker(newData);
      }
    }
  }, []);
  
  // Handle collapse toggle with scroll
  const handleToggleCollapse = () => {
    const wasCollapsed = isCollapsed;
    setIsCollapsed(!isCollapsed);
    if (wasCollapsed && onExpand) {
      setTimeout(() => onExpand(blockRef.current), 100);
    }
  };
  
  // Derive followers from shares (anyone with access to this object) + owner
  const followers = useMemo(() => {
    const followerList = Object.entries(shares)
      .map(([key, share]) => ({
        uid: key,
        email: share.email || key.replace(/_DOT_/g, '.'),
        displayName: share.displayName || share.name || share.email?.split('@')[0] || 'Okänd',
        isOwner: false
      }));
    
    // Add owner if available and not already in the list
    if (objectOwner?.email) {
      const ownerEmailLower = objectOwner.email.toLowerCase();
      const ownerAlreadyInList = followerList.some(
        f => f.email?.toLowerCase() === ownerEmailLower
      );
      if (!ownerAlreadyInList) {
        followerList.unshift({
          uid: objectOwner.uid,
          email: objectOwner.email,
          displayName: objectOwner.displayName || objectOwner.email?.split('@')[0] || 'Ägare',
          isOwner: true
        });
      }
    }
    
    return followerList;
  }, [shares, objectOwner]);
  
  const match = localData.activeMatch;
  const challenges = localData.challenges || {};
  const bestOf = localData.bestOf || 3;
  
  // Helper to get user email key (same format as shares keys)
  const getUserEmailKey = (email) => {
    if (!email) return null;
    return email.replace(/\./g, '_DOT_');
  };
  
  const currentUserEmailKey = getUserEmailKey(currentUser?.email);
  
  // Am I a player in the current match? Check uid, email key, and email
  const checkIsPlayer = (player) => {
    if (!player || !currentUser) return false;
    // Check Firebase uid
    if (player.uid === currentUser.uid) return true;
    // Check email key format (from shares)
    if (player.uid === currentUserEmailKey) return true;
    // Check direct email match
    if (player.email && currentUser.email && 
        player.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
    return false;
  };
  
  const isPlayer1 = checkIsPlayer(match?.player1);
  const isPlayer2 = checkIsPlayer(match?.player2);
  const isPlayer = isPlayer1 || isPlayer2;
  const myPlayerKey = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;
  
  // Get my actual choice from the match (source of truth from Firestore)
  const myActualChoice = myPlayerKey ? match?.[myPlayerKey]?.choice : null;
  
  // Get pending challenges TO me (I need to accept/decline)
  const myPendingChallenges = Object.entries(challenges).filter(([_, c]) => {
    if (c.status !== 'pending') return false;
    const toUid = c.to?.uid;
    const toEmail = c.to?.email?.toLowerCase();
    const myEmail = currentUser?.email?.toLowerCase();
    return toUid === currentUser?.uid || 
           toUid === currentUserEmailKey ||
           (toEmail && myEmail && toEmail === myEmail);
  });
  
  // Get pending challenges FROM me (waiting for response)
  const mySentChallenges = Object.entries(challenges).filter(([_, c]) => {
    if (c.status !== 'pending') return false;
    const fromUid = c.from?.uid;
    const fromEmail = c.from?.email?.toLowerCase();
    const myEmail = currentUser?.email?.toLowerCase();
    return fromUid === currentUser?.uid || 
           (fromEmail && myEmail && fromEmail === myEmail);
  });
  
  // Sync local data changes to Firestore
  const saveData = useCallback(async (newData) => {
    // Update ref immediately (synchronous) so callbacks always have latest data
    localDataRef.current = newData;
    
    // Update local state for UI rendering
    setLocalData(newData);
    
    // Sync to Firestore - realtime listener will confirm/update
    if (onUpdateTiebreaker) {
      await onUpdateTiebreaker(newData);
    }
  }, [onUpdateTiebreaker]);

  // Handle timeout when player doesn't choose in time - any player can handle this
  const handleChooseTimeout = useCallback(() => {
    // Use ref to get the LATEST match state (avoids stale closure)
    const latestData = localDataRef.current;
    const currentMatch = latestData.activeMatch;
    if (!currentMatch || currentMatch.status !== 'choosing') return;
    if (!isPlayer) return;
    
    const updatedMatch = { ...currentMatch };
    
    // Check what each player has chosen from CURRENT match state
    const p1HasChosen = !!currentMatch.player1?.choice;
    const p2HasChosen = !!currentMatch.player2?.choice;
    
    // For demo mode, auto-pick for demo opponent
    if (currentMatch.player2?.uid === 'demo' && !p2HasChosen) {
      const choices = ['rock', 'paper', 'scissors'];
      updatedMatch.player2 = {
        ...updatedMatch.player2,
        choice: choices[Math.floor(Math.random() * 3)]
      };
    }
    
    // If player1 hasn't chosen, forfeit
    if (!p1HasChosen) {
      const opponentChoice = updatedMatch.player2?.choice || 'rock';
      const losingChoice = opponentChoice === 'rock' ? 'scissors' 
        : opponentChoice === 'paper' ? 'rock' : 'paper';
      updatedMatch.player1 = { ...updatedMatch.player1, choice: losingChoice };
    }
    
    // If player2 hasn't chosen, forfeit
    if (!p2HasChosen && currentMatch.player2?.uid !== 'demo') {
      const opponentChoice = updatedMatch.player1?.choice || 'rock';
      const losingChoice = opponentChoice === 'rock' ? 'scissors' 
        : opponentChoice === 'paper' ? 'rock' : 'paper';
      updatedMatch.player2 = { ...updatedMatch.player2, choice: losingChoice };
    }
    
    // Move to revealing - sync to Firestore
    updatedMatch.status = 'revealing';
    saveData({ ...latestData, activeMatch: updatedMatch });
  }, [isPlayer, isPlayer1, saveData]);

  // Handle countdown and choosing timers
  useEffect(() => {
    if (!match || !isPlayer) return;
    
    const now = Date.now();
    const roundStartedAt = match.roundStartedAt?.toMillis?.() || match.roundStartedAt;
    
    if (!roundStartedAt) return;
    
    // Player1 acts immediately, Player2 waits a bit as fallback
    const fallbackDelay = isPlayer1 ? 0 : 1500;
    
    if (match.status === 'countdown') {
      const elapsed = Math.floor((now - roundStartedAt) / 1000);
      const remaining = COUNTDOWN_SECONDS - elapsed;
      
      if (remaining > 0) {
        setCountdown(remaining);
        timerRef.current = setInterval(() => {
          const newRemaining = COUNTDOWN_SECONDS - Math.floor((Date.now() - roundStartedAt) / 1000);
          if (newRemaining <= 0) {
            setCountdown(0);
            clearInterval(timerRef.current);
            // Transition to choosing - player1 first, player2 as fallback
            setTimeout(() => {
              const latestData = localDataRef.current;
              const currentMatch = latestData.activeMatch;
              if (currentMatch?.status === 'countdown') {
                const updatedMatch = {
                  ...currentMatch,
                  status: 'choosing',
                  roundStartedAt: Date.now()
                };
                saveData({ ...latestData, activeMatch: updatedMatch });
              }
            }, 500 + fallbackDelay);
          } else {
            setCountdown(newRemaining);
          }
        }, 100);
      } else {
        // Already past countdown - transition
        setCountdown(0);
        setTimeout(() => {
          const latestData = localDataRef.current;
          if (latestData.activeMatch?.status === 'countdown') {
            const updatedMatch = {
              ...latestData.activeMatch,
              status: 'choosing',
              roundStartedAt: Date.now()
            };
            saveData({ ...latestData, activeMatch: updatedMatch });
          }
        }, fallbackDelay);
      }
    } else if (match.status === 'choosing') {
      const elapsed = Math.floor((now - roundStartedAt) / 1000);
      const remaining = CHOOSING_SECONDS - elapsed;
      
      if (remaining > 0) {
        setTimeLeft(remaining);
        timerRef.current = setInterval(() => {
          const newRemaining = CHOOSING_SECONDS - Math.floor((Date.now() - roundStartedAt) / 1000);
          if (newRemaining <= 0) {
            setTimeLeft(null);
            clearInterval(timerRef.current);
            // Time's up - handle timeout (with fallback delay for player2)
            setTimeout(() => {
              handleChooseTimeout();
            }, fallbackDelay);
          } else {
            setTimeLeft(newRemaining);
          }
        }, 100);
      } else {
        // Already timed out
        setTimeout(() => {
          handleChooseTimeout();
        }, fallbackDelay);
      }
    } else if (match.status === 'revealing') {
      setRevealed(true);
      // Determine round winner for display
      if (match.player1?.choice && match.player2?.choice) {
        setRoundWinner(determineWinner(match.player1.choice, match.player2.choice));
      }
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [match?.status, match?.roundStartedAt]);

  // Reset states when match changes or sync with Firestore
  useEffect(() => {
    if (match?.status === 'pending' || match?.status === 'countdown') {
      setMyChoice(null);
      setRevealed(false);
      setRoundWinner(null);
    }
    // Sync local myChoice with what's actually in Firestore
    if (myActualChoice && myChoice !== myActualChoice) {
      setMyChoice(myActualChoice);
    }
  }, [match?.currentRound, match?.status, myActualChoice]);

  // Challenge a follower - creates a pending challenge that opponent must accept
  const sendChallenge = async (targetUser) => {
    const challengeId = `challenge_${Date.now()}`;
    const newChallenge = {
      from: { 
        uid: currentUser?.uid, 
        email: currentUser?.email,
        name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Någon' 
      },
      to: { 
        uid: targetUser.uid,
        email: targetUser.email,
        name: targetUser.displayName || targetUser.email?.split('@')[0] || 'Motståndare' 
      },
      status: 'pending',
      createdAt: Date.now()
    };
    
    const newChallenges = { ...challenges, [challengeId]: newChallenge };
    const newData = { ...localData, challenges: newChallenges };
    await saveData(newData);
  };

  // Accept a challenge
  const acceptChallenge = async (challengeId) => {
    const challenge = challenges[challengeId];
    if (!challenge) return;
    
    // Create the match
    const newMatch = {
      player1: challenge.from,
      player2: challenge.to,
      bestOf: bestOf,
      scores: [0, 0],
      currentRound: 1,
      status: 'countdown',
      roundStartedAt: Date.now(),
      rounds: []
    };
    
    // Remove challenge and start match
    const newChallenges = { ...challenges };
    delete newChallenges[challengeId];
    
    const newData = { ...localData, challenges: newChallenges, activeMatch: newMatch };
    await saveData(newData);
  };

  // Decline a challenge
  const declineChallenge = async (challengeId) => {
    const newChallenges = { ...challenges };
    delete newChallenges[challengeId];
    const newData = { ...localData, challenges: newChallenges };
    await saveData(newData);
  };

  // Make a choice - sync to Firestore for real-time multiplayer
  const makeChoice = async (choice) => {
    // Use ref to get latest data (avoids stale closure)
    const latestData = localDataRef.current;
    const currentMatch = latestData.activeMatch;
    
    if (!isPlayer || currentMatch?.status !== 'choosing') return;
    setMyChoice(choice);
    
    // Update the match with my choice only
    const updatedMatch = {
      ...currentMatch,
      [myPlayerKey]: {
        ...currentMatch[myPlayerKey],
        choice
      }
    };
    
    // Sync to Firestore for real-time updates
    await saveData({ ...latestData, activeMatch: updatedMatch });
  };

  // Process round result and continue or finish
  // Process round result and sync to Firestore
  const processRoundResult = async () => {
    // Use ref to get latest data (avoids stale closure)
    const latestData = localDataRef.current;
    const currentMatch = latestData.activeMatch;
    if (!currentMatch || currentMatch.status !== 'revealing') return;
    
    const winner = determineWinner(currentMatch.player1.choice, currentMatch.player2.choice);
    const newScores = [...currentMatch.scores];
    
    if (winner === 'player1') newScores[0]++;
    else if (winner === 'player2') newScores[1]++;
    
    const winsNeeded = Math.ceil(currentMatch.bestOf / 2);
    const matchWinner = newScores[0] >= winsNeeded ? 'player1' 
      : newScores[1] >= winsNeeded ? 'player2' 
      : null;
    
    const newRound = {
      player1Choice: currentMatch.player1.choice,
      player2Choice: currentMatch.player2.choice,
      winner
    };
    
    let updatedMatch;
    if (matchWinner) {
      // Match finished
      updatedMatch = {
        ...currentMatch,
        scores: newScores,
        rounds: [...currentMatch.rounds, newRound],
        status: 'finished',
        winner: matchWinner
      };
    } else {
      // Next round - clear choices for both players
      updatedMatch = {
        ...currentMatch,
        scores: newScores,
        rounds: [...currentMatch.rounds, newRound],
        currentRound: currentMatch.currentRound + 1,
        status: 'countdown',
        roundStartedAt: Date.now(),
        player1: { ...currentMatch.player1, choice: null },
        player2: { ...currentMatch.player2, choice: null }
      };
    }
    
    // Sync to Firestore for real-time updates
    await saveData({ ...latestData, activeMatch: updatedMatch });
  };

  // Reset the block
  const resetMatch = () => {
    const newData = { ...localDataRef.current, activeMatch: null };
    saveData(newData);
    setMyChoice(null);
    setRevealed(false);
    setRoundWinner(null);
    setCountdown(null);
    setTimeLeft(null);
  };

  // Simulate other player (for demo/testing)
  // Auto-choose for DEMO opponent only (not real players)
  useEffect(() => {
    if (match?.status === 'choosing' && match.player2?.uid === 'demo' && !match.player2?.choice) {
      const timeout = setTimeout(() => {
        const latestData = localDataRef.current;
        if (latestData.activeMatch?.status === 'choosing' && !latestData.activeMatch?.player2?.choice) {
          const choices = ['rock', 'scissors', 'paper'];
          const randomChoice = choices[Math.floor(Math.random() * 3)];
          const updatedMatch = {
            ...latestData.activeMatch,
            player2: { ...latestData.activeMatch.player2, choice: randomChoice }
          };
          saveData({ ...latestData, activeMatch: updatedMatch });
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [match?.status, match?.player2?.uid, match?.player2?.choice]);

  // Auto-transition to revealing when both have chosen - any player can do this
  useEffect(() => {
    if (match?.status === 'choosing' && match.player1?.choice && match.player2?.choice && isPlayer) {
      // Player1 acts immediately, Player2 waits as fallback
      const delay = isPlayer1 ? 0 : 1000;
      const timeout = setTimeout(() => {
        const latestData = localDataRef.current;
        if (latestData.activeMatch?.status === 'choosing') {
          const updatedMatch = {
            ...latestData.activeMatch,
            status: 'revealing'
          };
          saveData({ ...latestData, activeMatch: updatedMatch });
        }
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [match?.player1?.choice, match?.player2?.choice, match?.status, isPlayer, isPlayer1]);

  // Auto-process round after reveal - any player can do this
  useEffect(() => {
    if (revealed && match?.status === 'revealing' && isPlayer) {
      // Player1 acts after normal delay, Player2 waits longer as fallback
      const delay = isPlayer1 ? REVEAL_DELAY_MS : REVEAL_DELAY_MS + 1500;
      const timeout = setTimeout(processRoundResult, delay);
      return () => clearTimeout(timeout);
    }
  }, [revealed, match?.status, isPlayer, isPlayer1]);

  // Render idle state (no match, can challenge)
  const renderIdleState = () => {
    // Check if I have a pending sent challenge to a specific follower
    const hasSentChallengeTo = (email) => {
      return mySentChallenges.some(([_, c]) => 
        c.to?.email?.toLowerCase() === email?.toLowerCase()
      );
    };
    
    return (
    <div className="space-y-4">
      {/* My sent challenges - waiting for response */}
      {mySentChallenges.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="text-blue-400 text-sm font-medium mb-3 flex items-center gap-2">
            <Clock size={16} className="animate-pulse" />
            Väntar på svar
          </div>
          {mySentChallenges.map(([id, challenge]) => (
            <div key={id} className="flex items-center justify-between">
              <span className="text-white text-sm">{challenge.to.name}</span>
              <button
                onClick={() => declineChallenge(id)}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-xs transition-colors"
              >
                Avbryt
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Pending challenges for me */}
      {myPendingChallenges.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="text-yellow-400 text-sm font-medium mb-3 flex items-center gap-2">
            <Swords size={16} />
            Utmaningar till dig
          </div>
          {myPendingChallenges.map(([id, challenge]) => (
            <div key={id} className="flex items-center justify-between">
              <span className="text-white">{challenge.from.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptChallenge(id)}
                  className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 transition-colors"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => declineChallenge(id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Available followers to challenge */}
      <div className="bg-white/5 rounded-xl p-4">
        <div className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
          <Users size={16} />
          Utmana någon
        </div>
        {followers.filter(f => f.email?.toLowerCase() !== currentUser?.email?.toLowerCase()).length === 0 ? (
          <p className="text-gray-500 text-sm">Inga andra följare att utmana just nu</p>
        ) : (
          <div className="space-y-2">
            {followers
              .filter(f => f.email?.toLowerCase() !== currentUser?.email?.toLowerCase())
              .map(follower => {
                const alreadyChallenged = hasSentChallengeTo(follower.email);
                return (
                <div key={follower.uid} className="flex items-center justify-between">
                  <span className="text-white text-sm">{follower.displayName || follower.email}</span>
                  {alreadyChallenged ? (
                    <span className="text-gray-500 text-xs">Utmaning skickad</span>
                  ) : (
                  <button
                    onClick={() => sendChallenge(follower)}
                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 text-sm transition-colors flex items-center gap-2"
                  >
                    <Swords size={14} />
                    Utmana
                  </button>
                  )}
                </div>
              );
              })}
          </div>
        )}
        
        {/* Demo button for testing - less prominent when real players exist */}
        {followers.filter(f => f.uid !== currentUser?.uid).length > 0 ? (
          <button
            onClick={() => {
              const newMatch = {
                player1: { uid: currentUser?.uid, name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Du' },
                player2: { uid: 'demo', name: 'Demo-motståndare' },
                bestOf: bestOf,
                scores: [0, 0],
                currentRound: 1,
                status: 'countdown',
                roundStartedAt: Date.now(),
                rounds: []
              };
              saveData({ ...localData, activeMatch: newMatch });
            }}
            className="w-full mt-4 px-3 py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Swords size={14} />
            Eller starta demo-match
          </button>
        ) : (
          <button
            onClick={() => {
              const newMatch = {
                player1: { uid: currentUser?.uid, name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Du' },
                player2: { uid: 'demo', name: 'Demo-motståndare' },
                bestOf: bestOf,
                scores: [0, 0],
                currentRound: 1,
                status: 'countdown',
                roundStartedAt: Date.now(),
                rounds: []
              };
              saveData({ ...localData, activeMatch: newMatch });
            }}
            className="w-full mt-4 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
          >
            <Swords size={18} />
            Starta demo-match
          </button>
        )}
      </div>
    </div>
  );
  };

  // Render countdown state
  const renderCountdownState = () => (
    <div className="text-center py-8">
      <ScoreDisplay 
        player1={match.player1} 
        player2={match.player2} 
        scores={match.scores}
        bestOf={match.bestOf}
      />
      <div className="text-sm text-gray-500 mb-4">Runda {match.currentRound}</div>
      <CountdownDisplay seconds={countdown || '...'} label="Gör dig redo!" />
    </div>
  );

  // Render choosing state
  const renderChoosingState = () => (
    <div className="text-center py-4">
      <ScoreDisplay 
        player1={match.player1} 
        player2={match.player2} 
        scores={match.scores}
        bestOf={match.bestOf}
      />
      
      <div className="text-sm text-gray-500 mb-2">Runda {match.currentRound}</div>
      
      {/* Timer */}
      <div className="flex items-center justify-center gap-2 text-amber-400 mb-6">
        <Clock size={16} className="animate-pulse" />
        <span className="font-mono text-lg">{timeLeft || '...'}</span>
      </div>
      
      {/* Hands animation */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <AnimatedHand side="left" revealed={false} />
        <div className="text-2xl text-gray-600">VS</div>
        <AnimatedHand side="right" revealed={false} />
      </div>
      
      {/* Choice buttons */}
      {isPlayer ? (
        <div className="flex justify-center gap-4">
          {Object.keys(CHOICES).map(choice => (
            <ChoiceButton
              key={choice}
              choice={choice}
              selected={myActualChoice === choice || myChoice === choice}
              onSelect={makeChoice}
              disabled={!!myActualChoice || !!myChoice}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-400">Väntar på spelarnas val...</p>
      )}
      
      {(myActualChoice || myChoice) && (
        <p className="text-green-400 text-sm mt-4 flex items-center justify-center gap-2">
          <Check size={16} />
          Du valde {CHOICES[myActualChoice || myChoice]?.name}! Väntar på motståndaren...
        </p>
      )}
    </div>
  );

  // Render revealing state
  const renderRevealingState = () => {
    // Calculate preview scores (what they will be after this round)
    const previewScores = [...match.scores];
    if (revealed && roundWinner === 'player1') previewScores[0]++;
    else if (revealed && roundWinner === 'player2') previewScores[1]++;
    
    return (
    <div className="text-center py-4">
      <ScoreDisplay 
        player1={match.player1} 
        player2={match.player2} 
        scores={previewScores}
        bestOf={match.bestOf}
      />
      
      <div className="text-sm text-gray-500 mb-4">Runda {match.currentRound}</div>
      
      {/* Hands reveal */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <div className="text-center">
          <AnimatedHand 
            side="left" 
            revealed={revealed} 
            choice={match.player1?.choice}
            isWinner={roundWinner === 'player1'}
          />
          <div className="text-sm text-gray-400 mt-2">{match.player1?.name}</div>
        </div>
        <div className="text-2xl text-gray-600">VS</div>
        <div className="text-center">
          <AnimatedHand 
            side="right" 
            revealed={revealed} 
            choice={match.player2?.choice}
            isWinner={roundWinner === 'player2'}
          />
          <div className="text-sm text-gray-400 mt-2">{match.player2?.name}</div>
        </div>
      </div>
      
      {/* Round result */}
      {revealed && (
        <div className={`text-lg font-bold ${
          roundWinner === 'draw' ? 'text-gray-400' :
          (roundWinner === 'player1' && isPlayer1) || (roundWinner === 'player2' && isPlayer2)
            ? 'text-green-400' : 'text-red-400'
        }`}>
          {roundWinner === 'draw' ? '🤝 Oavgjort!' :
           roundWinner === 'player1' ? `${match.player1.name} vinner rundan!` :
           `${match.player2.name} vinner rundan!`}
        </div>
      )}
    </div>
  )};

  // Render finished state
  const renderFinishedState = () => {
    const winnerName = match.winner === 'player1' ? match.player1.name : match.player2.name;
    const isWinner = (match.winner === 'player1' && isPlayer1) || (match.winner === 'player2' && isPlayer2);
    
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Trophy size={24} className="text-amber-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 truncate px-2">
          {isWinner ? 'Du vann!' : <><span className="truncate">{winnerName}</span> vann!</>}
        </h3>
        
        <ScoreDisplay 
          player1={match.player1} 
          player2={match.player2} 
          scores={match.scores}
          bestOf={match.bestOf}
        />
        
        {/* Round history */}
        <div className="flex justify-center gap-2 my-4">
          {match.rounds.map((round, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-sm">
              <span>{CHOICES[round.player1Choice]?.emoji}</span>
              <span className="text-gray-600">vs</span>
              <span>{CHOICES[round.player2Choice]?.emoji}</span>
            </div>
          ))}
        </div>
        
        <button
          onClick={resetMatch}
          className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors flex items-center gap-2 mx-auto"
        >
          <RotateCcw size={18} />
          Spela igen
        </button>
      </div>
    );
  };

  // Get status text for collapsed header
  const getStatusText = () => {
    if (match) {
      if (match.status === 'finished') {
        const winnerName = match.winner === 'player1' ? match.player1.name : match.player2.name;
        return `${winnerName} vann!`;
      }
      return `${match.player1?.name} vs ${match.player2?.name}`;
    }
    return `Bäst av ${bestOf}`;
  };

  return (
    <div ref={blockRef} className="space-y-2">
      {/* Collapsible Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggleCollapse}
          className="flex-1 flex items-center gap-2.5 py-2 group touch-manipulation"
        >
          <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
            <ChevronDown 
              size={16} 
              className={`text-gray-400 group-hover:text-white transition-all ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} 
            />
          </div>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Swords size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors truncate">{title}</span>
          </div>
        </button>
        
        {/* Cancel button when match is active */}
        {match && !isCollapsed && (
          <button
            onClick={resetMatch}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Avbryt match"
          >
            <X size={16} />
          </button>
        )}
      </div>
      
      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className={`bg-white/[0.03] rounded-xl p-4 ${match ? 'min-h-[280px]' : ''}`}>
          {!match && renderIdleState()}
          {match?.status === 'countdown' && renderCountdownState()}
          {match?.status === 'choosing' && renderChoosingState()}
          {match?.status === 'revealing' && renderRevealingState()}
          {match?.status === 'finished' && renderFinishedState()}
        </div>
      )}
    </div>
  );
};

export default TiebreakerBlock;
