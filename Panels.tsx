import { useMemo } from "react";
import { coachReport } from "@/poker/coach";
import { formatBb, formatChips } from "@/poker/cards";
import { useFelt } from "@/game/store";
import { cn } from "@/lib/utils";
import { PERSONALITIES } from "@/poker/personalities";
import { Button } from "@/components/ui/button";

export function CoachPanel() {
  const game = useFelt((s) => s.game);
  const report = useMemo(
    () => coachReport(game),
    [game.handId, game.street, game.board, game.currentBet, game.actorId, game.phase],
  );
  if (!report) {
    return <p className="text-sm text-fg-muted">Hole cards land after the deal.</p>;
  }
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-xl">{report.hole}</p>
        <p className="text-xs uppercase tracking-wider text-fg-subtle">{report.position}</p>
      </div>
      <p className="text-fg-muted">{report.made}</p>
      <dl className="grid grid-cols-2 gap-2 font-mono text-xs tabular-nums">
        <Row k="Equity" v={`${Math.round(report.equity * 100)}%`} />
        <Row k="Pot odds" v={report.toCall ? `${Math.round(report.potOdds * 100)}%` : "—"} />
        <Row k="SPR" v={report.spr.toFixed(1)} />
        <Row k="Outs" v={String(report.outs)} />
        <Row k="Pot" v={formatChips(report.pot)} />
        <Row k="To call" v={report.toCall ? formatChips(report.toCall) : "—"} />
      </dl>
      {report.draws.length > 0 && <p className="text-xs text-fg-muted">{report.draws.join(" · ")}</p>}
      {report.texture.length > 0 && <p className="text-xs text-fg-subtle">{report.texture.join(" · ")}</p>}
      <p className="text-pretty text-fg">{report.advice}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm bg-bg-subtle px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-fg-subtle">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

export function LogPanel() {
  const log = useFelt((s) => s.game.log);
  const rows = log.slice(-18).reverse();
  return (
    <ol className="space-y-1.5 font-mono text-[11px] leading-snug text-fg-muted">
      {rows.map((r, i) => (
        <li key={`${r.handId}-${i}-${r.text}`}>
          <span className="text-fg-subtle">{r.street.slice(0, 1).toUpperCase()} </span>
          {r.text}
        </li>
      ))}
    </ol>
  );
}

export function HudPanel() {
  const game = useFelt((s) => s.game);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-fg-subtle">
          <tr>
            <th className="py-1 font-medium">Seat</th>
            <th className="py-1 font-medium">VPIP</th>
            <th className="py-1 font-medium">PFR</th>
            <th className="py-1 font-medium">3B</th>
            <th className="py-1 font-medium">AF</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {game.players.map((p) => {
            const st = game.playerStats[p.id];
            const n = st?.hands || 0;
            const pct = (x: number) => (n ? Math.round((x / n) * 100) : 0);
            const af = st && st.calls + st.aggro ? (st.aggro / Math.max(1, st.calls)).toFixed(1) : "—";
            const pers = PERSONALITIES.find((x) => x.id === p.personalityId);
            return (
              <tr key={p.id} className="border-t border-border">
                <td className="py-1.5">
                  {p.name}
                  <span className="block text-[10px] text-fg-subtle">{pers?.tagline ?? "You"}</span>
                </td>
                <td>{pct(st?.vpip ?? 0)}</td>
                <td>{pct(st?.pfr ?? 0)}</td>
                <td>{pct(st?.threeBet ?? 0)}</td>
                <td>{af}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/55 p-4" onClick={onClose}>
      <div
        className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-bg-elevated p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">How this table plays</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="space-y-3 text-sm text-pretty text-fg-muted">
          <p>No-limit Texas Hold'em. Two hole cards, then flop, turn, river. Best five-card hand wins.</p>
          <p>Action is fold, check, call, bet, raise, or all-in. Min-raise equals the last full raise. A short all-in does not reopen for players who already acted.</p>
          <p>Side pots form when someone is all-in for less. Uncalled bets come back. Odd chips on a split go left of the button.</p>
          <p>Hand ranks: high card, pair, two pair, trips, straight, flush, full house, quads, straight flush. Wheel is A-2-3-4-5. Ace-high straight flush is a royal.</p>
          <p>Pro AI uses Chen preflop ranges, Monte Carlo equity, pot odds, SPR, and board texture. Personalities still leak: Vesper is the tough TAG, Juno prints pressure, Nadir waits for premiums.</p>
          <p>Keys: F fold, C check/call, R bet/raise, A all-in, N next hand. Time bank auto-checks or folds at 16s.</p>
        </div>
      </div>
    </div>
  );
}

export function MenuSheet() {
  const open = useFelt((s) => s.showMenu);
  const toggle = useFelt((s) => s.toggle);
  const cashOut = useFelt((s) => s.cashOut);
  const rebuy = useFelt((s) => s.rebuy);
  const patch = useFelt((s) => s.patchSettings);
  const save = useFelt((s) => s.save);
  const game = useFelt((s) => s.game);
  if (!open) return null;
  const hero = game.players.find((p) => p.id === "hero");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onClick={() => toggle("showMenu")}>
      <div
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-bg-elevated p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl">Table</h2>
        <p className="font-mono text-sm tabular-nums text-fg-muted">
          Stack {formatChips(hero?.stack ?? 0)} · {formatBb(hero?.stack ?? 0, game.config.bigBlind)}
        </p>
        <label className="flex items-center justify-between text-sm">
          Sound
          <input
            type="checkbox"
            checked={save.settings.sound}
            onChange={(e) => patch({ sound: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          Coach
          <input
            type="checkbox"
            checked={save.settings.showCoach}
            onChange={() => toggle("showCoach")}
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          HUD
          <input
            type="checkbox"
            checked={save.settings.showHud}
            onChange={() => toggle("showHud")}
          />
        </label>
        <div className="flex flex-col gap-2 pt-2">
          {(game.phase === "busted" || (hero && hero.stack < game.config.bigBlind * 10 && !hero.busted)) && (
            <Button variant="secondary" onClick={rebuy}>
              Rebuy
            </Button>
          )}
          {game.phase === "busted" && (
            <Button variant="primary" onClick={rebuy}>
              Rebuy {formatChips(game.config.buyInBb * game.config.bigBlind)}
            </Button>
          )}
          <Button variant="secondary" onClick={cashOut}>
            Cash out
          </Button>
          <Button variant="ghost" onClick={() => toggle("showRules")}>
            Rules
          </Button>
        </div>
      </div>
    </div>
  );
}
