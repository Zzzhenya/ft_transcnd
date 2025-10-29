export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string; // Made optional to match current API implementation
  avatar_url?: string;
  created_at: string;
}

export interface GameState {
  id: number;
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  paddles: {
    player1: { y: number };
    player2: { y: number };
  };
  score: {
    player1: number;
    player2: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  players: number[];
}

export interface PlayerInput {
  type: 'paddle_move';
  direction: 'up' | 'down';
  playerId: number;
}

export interface Tournament {
  id: number;
  name: string;
  players: User[];
  bracket: any[];
  status: 'registration' | 'in_progress' | 'completed';
  winner?: User;
}
