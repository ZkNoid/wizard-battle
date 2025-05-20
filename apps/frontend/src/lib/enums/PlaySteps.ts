export enum PlaySteps {
  SELECT_MODE = "select-mode",
  SELECT_CHARACTER = "select-character",
  SELECT_MAP = "select-map",
  MATCHMAKING = "matchmaking",
  PLAY = "play",
  WIN = "win",
  LOSE = "lose",
}

export const PlayStepOrder = [
  PlaySteps.SELECT_MODE,
  PlaySteps.SELECT_CHARACTER,
  PlaySteps.SELECT_MAP,
  PlaySteps.MATCHMAKING,
  PlaySteps.PLAY,
];
