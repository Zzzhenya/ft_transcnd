import type { GameConfig } from "./state";

export const COURT_MARGIN = 48;

export function courtRect(cfg: GameConfig) {
  const x = COURT_MARGIN;
  const y = COURT_MARGIN;
  const w = cfg.court.width - COURT_MARGIN * 2;
  const h = cfg.court.height - COURT_MARGIN * 2;
  return { x, y, w, h, left: x, top: y, right: x + w, bottom: y + h };
}