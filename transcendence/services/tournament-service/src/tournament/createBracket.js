
/**
 * createBracket.js
 *
 * Small helper that generates a bracket structure for a tournament given
 * an array of player aliases. Supported sizes: 4 or 8 players.
 *
 * Output shape:
 * { rounds: [ [ match, ... ], ... ] }
 * where each match contains player1, player2, winner, status, matchId and
 * references to prevMatch1/prevMatch2 for later rounds.
 */
export function generateBracket(players) {
  if (!players || (players.length !== 4 && players.length !== 8)) {
    throw new Error("Player count must be exactly 4 or 8 for this tournament.");
  }

  const rounds = [];
  let currentRound = [];
  // First round: pair up players
  for (let i = 0; i < players.length; i += 2) {
    currentRound.push({
      player1: players[i],
      player2: players[i + 1],
      winner: null,
      status: "waiting",
      matchId: `R1M${i / 2 + 1}`,
    });
  }
  rounds.push(currentRound);

  // Next rounds: winners of previous round
  let roundNum = 2;
  let prevRound = currentRound;
  while (prevRound.length > 1) {
    const nextRound = [];
    for (let i = 0; i < prevRound.length; i += 2) {
      nextRound.push({
        player1: null,
        player2: null,
        winner: null,
        status: "waiting",
        matchId: `R${roundNum}M${i / 2 + 1}`,
        prevMatch1: prevRound[i].matchId,
        prevMatch2: prevRound[i + 1].matchId,
      });
    }
    rounds.push(nextRound);
    prevRound = nextRound;
    roundNum++;
  }

  return { rounds };
}
