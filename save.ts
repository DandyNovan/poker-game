import type { Config, Difficulty, Speed, TableSize } from "@/poker/types";

const KEY = "felt-save-v1";
export const SAVE_VERSION = 1;

export interface Career {
  hands: number;
  net: number;
  biggestPot: number;
  busts: number;
  tablesWon: number;
}

export interface Saved {
  version: number;
  name: string;
  bankroll: number;
  settings: {
    difficulty: Difficulty;
    speed: Speed;
    seats: TableSize;
    buyInBb: number;
    smallBlind: number;
    sound: boolean;
    autoMuck: boolean;
    showCoach: boolean;
    showHud: boolean;
  };
  career: Career;
}

export const DEFAULT_SAVE: Saved = {
  version: SAVE_VERSION,
  name: "You",
  bankroll: 50_000,
  settings: {
    difficulty: "pro",
    speed: "normal",
    seats: 6,
    buyInBb: 100,
    smallBlind: 50,
    sound: true,
    autoMuck: true,
    showCoach: true,
    showHud: true,
  },
  career: { hands: 0, net: 0, biggestPot: 0, busts: 0, tablesWon: 0 },
};

function migrate(raw: Saved): Saved {
  const s = { ...DEFAULT_SAVE, ...raw, version: SAVE_VERSION };
  s.settings = { ...DEFAULT_SAVE.settings, ...raw.settings };
  s.career = { ...DEFAULT_SAVE.career, ...raw.career };
  if (!Number.isFinite(s.bankroll) || s.bankroll < 0) s.bankroll = DEFAULT_SAVE.bankroll;
  return s;
}

export function loadSave(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const parsed = JSON.parse(raw) as Saved;
    return migrate(parsed);
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function writeSave(save: Saved): void {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(`${KEY}.bak`, prev);
    localStorage.setItem(KEY, JSON.stringify({ ...save, version: SAVE_VERSION }));
  } catch {
    // private mode / quota
  }
}

export function configFromSave(save: Saved): Partial<Config> {
  return {
    seats: save.settings.seats,
    smallBlind: save.settings.smallBlind,
    bigBlind: save.settings.smallBlind * 2,
    buyInBb: save.settings.buyInBb,
    difficulty: save.settings.difficulty,
    speed: save.settings.speed,
    playerName: save.name,
    autoMuck: save.settings.autoMuck,
  };
}
