
const tournamentLogic = { generateBracket, advanceWinner };

function generateBracket(players) {
  // Shuffle players
  players = [...players].sort(() => Math.random() - 0.5);
  const rounds = [];

  // First round
  let roundPlayers = players;
  let round = [];
  for (let i = 0; i < roundPlayers.length; i += 2) {
    if (i + 1 < roundPlayers.length) {
      round.push({ player1: roundPlayers[i], player2: roundPlayers[i + 1], winner: null });
    } else {
      // Odd player gets a bye
      round.push({ player1: roundPlayers[i], player2: null, winner: roundPlayers[i] });
    }
  }
  rounds.push(round);

  // Calculate total rounds needed
  let numPlayers = players.length;
  while (numPlayers > 1) {
    numPlayers = Math.ceil(numPlayers / 2);
    // Create empty matches for next round
    const nextRound = Array(numPlayers).fill().map(() => ({ player1: null, player2: null, winner: null }));
    rounds.push(nextRound);
  }

  return { rounds, status: 'registration', winner: null };
}

function advanceWinner(bracket, roundIdx, matchIdx, winnerId) {
  const match = bracket.rounds[roundIdx][matchIdx];
  match.winner = winnerId;

  // If not last round, put winner in next round
  if (roundIdx + 1 < bracket.rounds.length) {
    const nextMatchIdx = Math.floor(matchIdx / 2);
    const nextMatch = bracket.rounds[roundIdx + 1][nextMatchIdx];
    if (!nextMatch.player1) nextMatch.player1 = winnerId;
    else nextMatch.player2 = winnerId;
  } else {
    // Last round, set tournament winner
    bracket.status = 'finished';
    bracket.winner = winnerId;
  }
  return bracket;
}

// Create tournament endpoint


export { generateBracket, advanceWinner };