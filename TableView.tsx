import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { GameState, Player } from "@/poker/types";
import { formatChips, formatBb } from "@/poker/cards";
import { positionName, potTotal } from "@/poker/engine";
import { bestHand } from "@/poker/hand";
import { PERSONALITIES } from "@/poker/personalities";
import { PlayingCard, CardSlot } from "./PlayingCard";

function relativeSeats(game: GameState): Player[] {
  const heroIdx = game.players.findIndex((p) => p.isHuman);
  if (heroIdx < 0) return game.players;
  return [...game.players.slice(heroIdx), ...game.players.slice(0, heroIdx)];
}

function seatPos(i: number, n: number): { left: string; top: string } {
  const a = Math.PI / 2 + (i / n) * Math.PI * 2;
  const rx = n <= 2 ? 0 : 42;
  const ry = n <= 2 ? (i === 0 ? 40 : -38) : 39;
  const x = 50 + rx * Math.cos(a);
  const y = 50 + (n <= 2 ? (i === 0 ? 40 : 12) : ry * Math.sin(a));
  return { left: `${x}%`, top: `${y}%` };
}

function hudLine(game: GameState, id: string): string | null {
  const st = game.playerStats[id];
  if (!st || st.hands < 3) return null;
  const vpip = Math.round((st.vpip / st.hands) * 100);
  const pfr = Math.round((st.pfr / st.hands) * 100);
  return `${vpip}/${pfr}`;
}

function Seat({
  player,
  game,
  style,
  showHud,
}: {
  player: Player;
  game: GameState;
  style: CSSProperties;
  showHud: boolean;
}) {
  const acting = game.actorId === player.id && game.phase === "acting";
  const pers = PERSONALITIES.find((p) => p.id === player.personalityId);
  const role = positionName(game, player.seat);
  const isBtn = game.button === player.seat;
  const shown = game.result?.shown.find((s) => s.playerId === player.id);
  const winIds = new Set(game.result?.pots.flatMap((p) => p.winnerIds) ?? []);
  const winner = winIds.has(player.id);
  const reveal = player.isHuman || player.showed || !!shown;
  const hole = player.hole ?? [];
  const madeFive =
    player.isHuman && game.board.length >= 3 && hole.length === 2
      ? (bestHand(hole, game.board)?.five ?? [])
      : [];
  const fiveIds = new Set((shown?.five ?? madeFive).map((c) => `${c.rank}${c.suit}`));
  const hud = showHud && !player.isHuman ? hudLine(game, player.id) : null;
  const dim = player.folded || player.busted;

  return (
    <div
      className={cn(
        "absolute z-10 flex w-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 sm:w-44",
        dim && "opacity-45",
      )}
      style={style}
    >
      {!player.isHuman && hole.length === 2 && (
        <div className="flex gap-1">
          <PlayingCard
            card={hole[0]}
            hidden={!reveal}
            win={winner && fiveIds.has(`${hole[0]!.rank}${hole[0]!.suit}`)}
            size="sm"
            delay={40}
          />
          <PlayingCard
            card={hole[1]}
            hidden={!reveal}
            win={winner && fiveIds.has(`${hole[1]!.rank}${hole[1]!.suit}`)}
            size="sm"
            delay={90}
          />
        </div>
      )}
      {player.betStreet > 0 && (
        <div className="rounded-full bg-bg-elevated/90 px-2 py-0.5 font-mono text-[11px] tabular-nums text-accent">
          {formatChips(player.betStreet)}
        </div>
      )}
      <div
        className={cn(
          "relative flex w-full items-center gap-2 rounded-lg border bg-bg-elevated/90 px-2 py-1.5",
          acting ? "border-accent" : "border-border",
          winner && "border-accent",
        )}
      >
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
            pers?.tone === "clay" && "bg-danger/30",
            pers?.tone === "pine" && "bg-felt",
            pers?.tone === "mist" && "bg-chip-blue/50",
            pers?.tone === "ink" && "bg-bg-subtle",
            pers?.tone === "bone" && "bg-accent text-accent-fg",
            player.isHuman && "bg-fg text-accent-fg",
          )}
        >
          {(player.name[0] ?? "?").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-xs font-medium">{player.name}</p>
            {isBtn && <span className="dealer-btn">D</span>}
          </div>
          <p className="font-mono text-[11px] tabular-nums text-fg-muted">
            {player.busted ? "Out" : formatChips(player.stack)}
            {player.allIn && !player.busted ? " · all-in" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-fg-subtle">
        <span>{role}</span>
        {hud && <span className="font-mono normal-case tracking-normal text-fg-muted">{hud}</span>}
        {acting && <span className="text-accent">act</span>}
      </div>
    </div>
  );
}

export function TableView({ game, showHud }: { game: GameState; showHud: boolean }) {
  const seats = relativeSeats(game);
  const n = seats.length;
  const pot = potTotal(game);
  const hero = game.players.find((p) => p.isHuman);
  const heroShown = game.result?.shown.find((s) => s.playerId === "hero");
  const winIds = new Set(game.result?.pots.flatMap((p) => p.winnerIds) ?? []);
  const heroFive = new Set(
    (heroShown?.five ??
      (hero?.hole && game.board.length >= 3 ? bestHand(hero.hole, game.board)?.five : undefined) ??
      []
    ).map((c) => `${c.rank}${c.suit}`),
  );
  const made =
    hero?.hole && game.board.length >= 3 && !hero.folded ? bestHand(hero.hole, game.board)?.name : null;

  return (
    <div className="felt-table">
      {seats.map((p, i) => (
        <Seat key={p.id} player={p} game={game} showHud={showHud} style={seatPos(i, n)} />
      ))}

      <div className="absolute left-1/2 top-[46%] flex w-[78%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 sm:top-[44%]">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            {game.street}
            {game.handId ? ` · #${game.handId}` : ""}
          </p>
          <p className="font-display text-2xl font-medium tabular-nums text-accent sm:text-3xl">
            {formatChips(pot)}
          </p>
          <p className="font-mono text-[11px] text-fg-muted">{formatBb(pot, game.config.bigBlind)}</p>
        </div>
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const c = game.board[i];
            if (!c) return <CardSlot key={i} size={n <= 2 ? "md" : "md"} />;
            const win = winIds.size > 0 && heroFive.has(`${c.rank}${c.suit}`) && winIds.has("hero");
            return <PlayingCard key={`${c.rank}${c.suit}${i}`} card={c} size="md" delay={i * 80} win={win} />;
          })}
        </div>
        {made && <p className="text-xs text-fg-muted">{made}</p>}
        {game.result?.uncontested && (
          <p className="text-xs text-fg-muted">
            {game.players.find((p) => p.id === game.result?.uncontested)?.name} takes it
          </p>
        )}
      </div>
    </div>
  );
}
