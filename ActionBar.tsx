import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { formatChips } from "@/poker/cards";
import { legalActions, potTotal } from "@/poker/engine";
import { useFelt } from "@/game/store";
import { cn } from "@/lib/utils";

export function ActionBar() {
  const game = useFelt((s) => s.game);
  const betTo = useFelt((s) => s.betTo);
  const setBetTo = useFelt((s) => s.setBetTo);
  const humanAct = useFelt((s) => s.humanAct);
  const skipToNext = useFelt((s) => s.skipToNext);
  const heroTurn = game.phase === "acting" && game.actorId === "hero";
  const legal = useMemo(() => legalActions(game), [game]);
  const pot = potTotal(game);

  useEffect(() => {
    if (!heroTurn) return;
    const start = legal.minRaiseTo || legal.minBet || game.config.bigBlind;
    setBetTo(start);
  }, [heroTurn, game.handId, game.street, game.currentBet, legal.minBet, legal.minRaiseTo, game.config.bigBlind, setBetTo]);

  useEffect(() => {
    if (!heroTurn) return;
    const t = window.setTimeout(() => {
      if (legal.canCheck) humanAct({ kind: "check" });
      else humanAct({ kind: "fold" });
    }, 16000);
    return () => window.clearTimeout(t);
  }, [heroTurn, game.handId, game.street, game.log.length, humanAct, legal.canCheck]);

  if (game.phase === "showdown" || game.phase === "between") {
    const hero = game.players.find((p) => p.id === "hero");
    const delta = (hero?.stack ?? 0) - (game.lastStartStacks.hero ?? 0);
    return (
      <div className="flex flex-col items-center gap-3">
        {game.phase === "showdown" && (
          <p className={cn("font-mono text-sm tabular-nums", delta >= 0 ? "text-good" : "text-danger")}>
            {delta >= 0 ? "+" : ""}
            {formatChips(delta)} this hand
          </p>
        )}
        <Button variant="primary" size="lg" className="min-w-44" onClick={skipToNext}>
          Next hand
        </Button>
      </div>
    );
  }

  if (game.phase === "busted") {
    return (
      <p className="text-center text-sm text-fg-muted">Stack is gone. Rebuy or cash out from the header.</p>
    );
  }
  if (game.phase === "winner") {
    return <p className="text-center text-sm text-fg-muted">Table is yours. Cash out whenever you like.</p>;
  }

  if (!heroTurn) {
    const actor = game.players.find((p) => p.id === game.actorId);
    return (
      <div className="text-center text-sm text-fg-muted">
        {game.phase === "acting" && actor ? `${actor.name} is acting` : "Dealing"}
      </div>
    );
  }

  const presets = [
    { label: "1/3", v: Math.floor(pot / 3) },
    { label: "1/2", v: Math.floor(pot / 2) },
    { label: "2/3", v: Math.floor((pot * 2) / 3) },
    { label: "Pot", v: pot },
    { label: "All-in", v: legal.maxTo - (game.players.find((p) => p.id === "hero")?.betStreet ?? 0) },
  ];

  const isRaise = legal.callAmount > 0;
  const min = isRaise ? legal.minRaiseTo : legal.minBet;
  const max = legal.maxTo;
  const callLabel = legal.canCheck
    ? "Check"
    : `Call ${formatChips(legal.callAmount)}`;

  return (
    <div className="mx-auto w-full max-w-xl space-y-3">
      <div className="timebank" aria-hidden>
        <span key={`${game.handId}-${game.street}-${game.log.length}`} />
      </div>
      {(legal.canBet || legal.canRaise) && (
        <div className="rounded-lg border border-border bg-bg-elevated p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
            <span>{isRaise ? "Raise to" : "Bet"}</span>
            <span className="font-mono tabular-nums text-fg">{formatChips(betTo)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={game.config.smallBlind}
            value={Math.min(max, Math.max(min, betTo))}
            onChange={(e) => setBetTo(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const to = isRaise
                ? Math.min(max, Math.max(min, game.currentBet + p.v))
                : Math.min(max, Math.max(min, p.v));
              return (
                <button
                  key={p.label}
                  type="button"
                  className="h-8 rounded-sm border border-border px-2 text-[11px] text-fg-muted hover:text-fg"
                  onClick={() => setBetTo(p.label === "All-in" ? max : to)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="fold" size="xl" className="min-h-12" onClick={() => humanAct({ kind: "fold" })}>
          Fold
        </Button>
        <Button
          variant="call"
          size="xl"
          className="min-h-12"
          onClick={() => humanAct({ kind: legal.canCheck ? "check" : "call", amount: legal.callAmount })}
          disabled={!legal.canCheck && !legal.canCall}
        >
          {callLabel}
        </Button>
        <Button
          variant="raise"
          size="xl"
          className="min-h-12"
          onClick={() => {
            if (betTo >= max || (!legal.canRaise && !legal.canBet && legal.canAllIn)) {
              humanAct({ kind: "allin" });
              return;
            }
            humanAct({ kind: isRaise ? "raise" : "bet", amount: betTo });
          }}
          disabled={!legal.canBet && !legal.canRaise && !legal.canAllIn}
        >
          {betTo >= max ? "All-in" : isRaise ? "Raise" : "Bet"}
        </Button>
      </div>
    </div>
  );
}
