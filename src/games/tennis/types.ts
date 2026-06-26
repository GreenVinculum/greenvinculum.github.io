export type TennisMatchPhase = "menu" | "serve" | "playing" | "point" | "matchover" | "paused";

export type TennisHudState = {
  phase: TennisMatchPhase;
  paused: boolean;
  playerScore: number;
  aiScore: number;
  aiLevel: number;
  pointWinner: "player" | "ai" | null;
  matchWinner: "player" | "ai" | null;
};

export type TennisGameOptions = {
  canvas: HTMLCanvasElement;
  initialAiLevel?: number;
  onHudUpdate: (state: TennisHudState) => void;
  onMatchComplete: (result: {
    playerScore: number;
    aiScore: number;
    aiLevel: number;
    playerWon: boolean;
  }) => void;
};
