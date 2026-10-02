"use client";

import { create } from "zustand";
import type { Action, Config, GameState } from "@/poker/types";
import {
  applyAction,
  beginActing,
  concludeShowdown,
  dealNextStreet,
  legalActions,
  newLobby,
  nextHand,
  potTotal,
  rebuyHero,
  sitDown,
} from "@/poker/engine";
import { chooseAction } from "@/poker/ai";
import { configFromSave, loadSave, writeSave, type Saved } from "./save";
import { setSoundEnabled, sfxPlay, unlockAudio } from "./audio";
import { LINES, PERSONALITIES } from "@/poker/personalities";

export interface Toast {
  id: number;
  text: string;
  name: string;
}

interface FeltStore {
  game: GameState;
  save: Saved;
  toast: Toast | null;
  betTo: number;
  showCoach: boolean;
  showLog: boolean;
  showHud: boolean;
  showMenu: boolean;
  showRules: boolean;
  dealingKey: number;
  hydrate: () => void;
  setName: (name: string) => void;
  patchSettings: (p: Partial<Saved["settings"]>) => void;
  startTable: (cfg?: Partial<Config>) => void;
  humanAct: (action: Action) => void;
  setBetTo: (n: number) => void;
  tick: () => void;
  skipToNext: () => void;
  rebuy: () => void;
  cashOut: () => void;
  toggle: (k: "showCoach" | "showLog" | "showHud" | "showMenu" | "showRules") => void;
}

let toastSeq = 1;

function persist(save: Saved) {
  writeSave(save);
}

function applyCareer(save: Saved, game: GameState, extra?: Partial<Saved["career"]>): Saved {
  const hero = game.players.find((p) => p.id === "hero");
  const pot = game.result?.pots.reduce((s, p) => s + p.amount, 0) ?? 0;
  const career = {
    ...save.career,
    hands: save.career.hands + (game.phase === "showdown" ? 1 : 0),
    biggestPot: Math.max(save.career.biggestPot, pot),
    ...extra,
  };
  const bankroll = save.bankroll; // updated on cashout / sit
  void hero;
  return { ...save, career, bankroll };
}

function talkFor(action: Action, name: string, personalityId: string | null): string | null {
  const pers = PERSONALITIES.find((p) => p.id === personalityId);
  if (!pers || pers.talk < 0.15) {
    if (action.kind === "allin") return `${name}: All-in.`;
    return null;
  }
  const key = action.kind === "bet" || action.kind === "raise" ? "raise" : action.kind;
  const band = pers.talk > 0.4 ? "high" : pers.talk > 0.2 ? "mid" : "low";
  const pool = LINES[key]?.[band] ?? LINES[key]?.low ?? [];
  if (!pool.length) return null;
  if (Math.random() > pers.talk + 0.25) return null;
  const line = pool[Math.floor(Math.random() * pool.length)]!;
  return `${name}: ${line}`;
}

function sfxFor(kind: Action["kind"] | string) {
  if (kind === "fold") sfxPlay.fold();
  else if (kind === "check") sfxPlay.check();
  else if (kind === "call" || kind === "bet") sfxPlay.chip();
  else if (kind === "raise") sfxPlay.raise();
  else if (kind === "allin") sfxPlay.allin();
}

export const useFelt = create<FeltStore>((set, get) => ({
  game: newLobby(),
  save: loadSave(),
  toast: null,
  betTo: 0,
  showCoach: true,
  showLog: false,
  showHud: true,
  showMenu: false,
  showRules: false,
  dealingKey: 0,

  hydrate: () => {
    const save = loadSave();
    setSoundEnabled(save.settings.sound);
    set({
      save,
      showCoach: save.settings.showCoach,
      showHud: save.settings.showHud,
    });
  },

  setName: (name) => {
    const save = { ...get().save, name: name.slice(0, 16) };
    persist(save);
    set({ save });
  },

  patchSettings: (p) => {
    const save = { ...get().save, settings: { ...get().save.settings, ...p } };
    persist(save);
    setSoundEnabled(save.settings.sound);
    set({
      save,
      showCoach: save.settings.showCoach,
      showHud: save.settings.showHud,
    });
  },

  startTable: (cfg) => {
    unlockAudio();
    const { save } = get();
    const merged = { ...configFromSave(save), ...cfg, playerName: save.name };
    const buy = (merged.buyInBb ?? 100) * (merged.bigBlind ?? (merged.smallBlind ?? 50) * 2);
    if (save.bankroll < buy) {
      const topped = { ...save, bankroll: Math.max(save.bankroll, buy * 3) };
      persist(topped);
      set({ save: topped });
    }
    const current = get().save;
    const nextBank = current.bankroll - buy;
    const nextSave = { ...current, bankroll: Math.max(0, nextBank) };
    persist(nextSave);
    const game = sitDown(newLobby(merged));
    sfxPlay.deal();
    set({
      save: nextSave,
      game,
      dealingKey: get().dealingKey + 1,
      showMenu: false,
      betTo: merged.bigBlind ?? 100,
    });
  },

  humanAct: (action) => {
    const { game } = get();
    if (game.phase !== "acting" || game.actorId !== "hero") return;
    const next = applyAction(game, action);
    sfxFor(action.kind);
    set({ game: next, toast: null });
  },

  setBetTo: (n) => set({ betTo: Math.max(0, Math.round(n)) }),

  tick: () => {
    const { game } = get();
    if (game.phase === "dealing") {
      const next = beginActing(game);
      sfxPlay.deal();
      const legal = legalActions(next);
      set({
        game: next,
        dealingKey: get().dealingKey + 1,
        betTo: legal.minRaiseTo || legal.minBet || next.config.bigBlind,
      });
      return;
    }
    if (game.phase === "runout") {
      sfxPlay.deal();
      const next = dealNextStreet(game);
      const legal = legalActions(next);
      set({
        game: next,
        dealingKey: get().dealingKey + 1,
        betTo: legal.minRaiseTo || legal.minBet || next.config.bigBlind,
      });
      return;
    }
    if (game.phase === "acting" && game.actorId && game.actorId !== "hero") {
      const seed = (game.rngSeed ^ game.log.length * 9973) >>> 0;
      const action = chooseAction(game, seed || 1);
      const actor = game.players.find((p) => p.id === game.actorId);
      let next = applyAction(game, action);
      if (next.log.length === game.log.length) {
        const legal = legalActions(game);
        next = applyAction(game, legal.canCheck ? { kind: "check" } : { kind: "fold" });
      }
      sfxFor(action.kind);
      const line = actor ? talkFor(action, actor.name, actor.personalityId) : null;
      const toast = line ? { id: toastSeq++, text: line, name: actor?.name ?? "" } : get().toast;
      const legal = legalActions(next);
      set({
        game: next,
        toast,
        betTo: legal.minRaiseTo || legal.minBet || next.config.bigBlind,
      });
      return;
    }
    if (game.phase === "showdown") {
      const hero = game.players.find((p) => p.id === "hero");
      const start = game.lastStartStacks.hero ?? hero?.stack ?? 0;
      const delta = (hero?.stack ?? 0) - start;
      if (delta > 0) sfxPlay.win();
      else if (delta < 0) sfxPlay.lose();
      const save = applyCareer(get().save, game);
      persist(save);
      set({ save, game: concludeShowdown(game) });
      return;
    }
    if (game.phase === "between") {
      const next = nextHand(game);
      sfxPlay.deal();
      set({ game: next, dealingKey: get().dealingKey + 1, toast: null });
    }
  },

  skipToNext: () => {
    const { game } = get();
    if (game.phase === "showdown") {
      get().tick();
    }
    if (get().game.phase === "between") get().tick();
  },

  rebuy: () => {
    const { game, save } = get();
    const buy = game.config.buyInBb * game.config.bigBlind;
    if (save.bankroll < buy) {
      const topped = {
        ...save,
        bankroll: buy * 4,
        career: { ...save.career, busts: save.career.busts + 1 },
      };
      persist(topped);
      set({ save: topped, game: rebuyHero(game), dealingKey: get().dealingKey + 1 });
      return;
    }
    const nextSave = {
      ...save,
      bankroll: save.bankroll - buy,
      career: { ...save.career, busts: save.career.busts + 1 },
    };
    persist(nextSave);
    set({ save: nextSave, game: rebuyHero(game), dealingKey: get().dealingKey + 1 });
  },

  cashOut: () => {
    const { game, save } = get();
    const hero = game.players.find((p) => p.id === "hero");
    const stack = hero && !hero.busted ? hero.stack : 0;
    const nextSave = {
      ...save,
      bankroll: save.bankroll + stack,
      career: {
        ...save.career,
        net: save.career.net + (stack - game.config.buyInBb * game.config.bigBlind),
        tablesWon: save.career.tablesWon + (game.phase === "winner" ? 1 : 0),
      },
    };
    persist(nextSave);
    set({
      save: nextSave,
      game: newLobby(configFromSave(nextSave)),
      showMenu: false,
    });
  },

  toggle: (k) => {
    const next = !get()[k];
    set({ [k]: next } as Partial<FeltStore>);
    if (k === "showCoach" || k === "showHud") {
      get().patchSettings({ [k]: next } as Partial<Saved["settings"]>);
    }
  },
}));

export function tablePot(game: GameState): number {
  return potTotal(game);
}
