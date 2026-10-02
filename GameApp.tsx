"use client";

import { useEffect, type ReactNode } from "react";
import { Menu, ScrollText, Brain, BookOpen } from "lucide-react";
import { useFelt } from "@/game/store";
import { resumeAudio, unlockAudio } from "@/game/audio";
import { aiDelayMs } from "@/poker/ai";
import { legalActions } from "@/poker/engine";
import { formatChips } from "@/poker/cards";
import { Lobby } from "./Lobby";
import { TableView } from "./TableView";
import { ActionBar } from "./ActionBar";
import { CoachPanel, HudPanel, LogPanel, MenuSheet, RulesSheet } from "./Panels";
import { PlayingCard } from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GameApp() {
  const game = useFelt((s) => s.game);
  const save = useFelt((s) => s.save);
  const toast = useFelt((s) => s.toast);
  const showCoach = useFelt((s) => s.showCoach);
  const showLog = useFelt((s) => s.showLog);
  const showHud = useFelt((s) => s.showHud);
  const showRules = useFelt((s) => s.showRules);
  const hydrate = useFelt((s) => s.hydrate);
  const toggle = useFelt((s) => s.toggle);
  const humanAct = useFelt((s) => s.humanAct);
  const skipToNext = useFelt((s) => s.skipToNext);
  const betTo = useFelt((s) => s.betTo);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    const onFirst = () => unlockAudio();
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const phase = game.phase;
  const actorId = game.actorId;
  const handId = game.handId;
  const street = game.street;
  const logLen = game.log.length;
  const boardLen = game.board.length;

  useEffect(() => {
    if (phase === "lobby") return;
    let delay = 0;
    if (phase === "dealing") delay = 880;
    else if (phase === "runout") delay = 640;
    else if (phase === "acting" && actorId && actorId !== "hero") {
      delay = aiDelayMs(game);
    } else if (phase === "showdown") delay = 2400;
    else if (phase === "between") delay = 1200;
    else return;
    const t = window.setTimeout(() => useFelt.getState().tick(), delay);
    return () => window.clearTimeout(t);
  }, [phase, actorId, handId, street, logLen, boardLen, game]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const g = useFelt.getState().game;
      const k = e.key.toLowerCase();
      if (k === "n") {
        skipToNext();
        return;
      }
      if (g.phase !== "acting" || g.actorId !== "hero") return;
      const legal = legalActions(g);
      if (k === "f") humanAct({ kind: "fold" });
      if (k === "c") humanAct({ kind: legal.canCheck ? "check" : "call", amount: legal.callAmount });
      if (k === "r") {
        const raise = legal.callAmount > 0;
        if (!legal.canBet && !legal.canRaise && legal.canAllIn) humanAct({ kind: "allin" });
        else humanAct({ kind: raise ? "raise" : "bet", amount: useFelt.getState().betTo });
      }
      if (k === "a") humanAct({ kind: "allin" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [humanAct, skipToNext, betTo]);

  if (game.phase === "lobby") return <Lobby />;

  const hero = game.players.find((p) => p.isHuman);
  const hole = hero?.hole ?? [];
  const session = game.sessionNet;

  return (
    <div className="felt-shell flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div>
          <p className="font-display text-xl leading-none">Felt</p>
          <p className="font-mono text-[11px] text-fg-muted">
            {game.config.smallBlind}/{game.config.bigBlind} · {game.config.difficulty}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "hidden font-mono text-xs tabular-nums sm:block",
              session >= 0 ? "text-good" : "text-danger",
            )}
          >
            {session >= 0 ? "+" : ""}
            {formatChips(session)}
          </p>
          <p className="font-mono text-xs tabular-nums text-fg-muted">{formatChips(save.bankroll)} book</p>
          <IconBtn label="Coach" onClick={() => toggle("showCoach")} active={showCoach}>
            <Brain className="size-4" />
          </IconBtn>
          <IconBtn label="Log" onClick={() => toggle("showLog")} active={showLog}>
            <ScrollText className="size-4" />
          </IconBtn>
          <IconBtn label="Rules" onClick={() => toggle("showRules")} active={false}>
            <BookOpen className="size-4" />
          </IconBtn>
          <IconBtn label="Menu" onClick={() => toggle("showMenu")} active={false}>
            <Menu className="size-4" />
          </IconBtn>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-3 pb-4 lg:grid-cols-[1fr_280px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative px-1 pt-8 sm:pt-4">
            <TableView game={game} showHud={showHud} />
            {toast && (
              <div
                key={toast.id}
                className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm"
              >
                {toast.text}
              </div>
            )}
          </div>

          {hole.length === 2 && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <PlayingCard card={hole[0]} size="lg" delay={20} />
                <PlayingCard card={hole[1]} size="lg" delay={80} />
              </div>
              <p className="text-xs text-fg-subtle">{hero?.folded ? "Folded" : "Your hand"}</p>
            </div>
          )}

          <div className="px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <ActionBar />
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          {showCoach && (
            <section className="rounded-xl border border-border bg-bg-elevated p-4">
              <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-fg-subtle">Coach</h2>
              <CoachPanel />
            </section>
          )}
          {showHud && (
            <section className="rounded-xl border border-border bg-bg-elevated p-4">
              <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-fg-subtle">HUD</h2>
              <HudPanel />
            </section>
          )}
          {showLog && (
            <section className="rounded-xl border border-border bg-bg-elevated p-4">
              <h2 className="mb-3 text-xs uppercase tracking-[0.16em] text-fg-subtle">Action</h2>
              <LogPanel />
            </section>
          )}
        </aside>
      </div>
      <MenuSheet />
      <RulesSheet open={showRules} onClose={() => toggle("showRules")} />
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  active: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      className={cn("size-10 p-0", active && "text-fg bg-bg-subtle")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
