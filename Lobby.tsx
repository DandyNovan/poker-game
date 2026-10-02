import { Button } from "@/components/ui/button";
import { formatChips } from "@/poker/cards";
import { useFelt } from "@/game/store";
import type { Difficulty, Speed, TableSize } from "@/poker/types";
import { cn } from "@/lib/utils";

function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { v: T; l: string; d?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs uppercase tracking-[0.16em] text-fg-subtle">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "rounded-md border px-3 py-2 text-left text-sm transition-colors",
              value === o.v
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-bg-subtle text-fg hover:border-border-strong",
            )}
          >
            <div className="font-medium">{o.l}</div>
            {o.d && <div className={cn("text-[11px]", value === o.v ? "text-accent-fg/70" : "text-fg-muted")}>{o.d}</div>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Lobby() {
  const save = useFelt((s) => s.save);
  const startTable = useFelt((s) => s.startTable);
  const setName = useFelt((s) => s.setName);
  const patchSettings = useFelt((s) => s.patchSettings);
  const s = save.settings;
  const buy = s.buyInBb * s.smallBlind * 2;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-5 py-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.28em] text-fg-subtle">Six-max cash</p>
        <h1 className="font-display text-5xl font-medium tracking-[-0.04em] sm:text-7xl">Felt</h1>
        <p className="max-w-md text-pretty text-fg-muted">
          Texas Hold'em with a Pro-mode AI that prices pot odds, SPR, position, and board texture. Sit down and play a real table.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-bg-elevated p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-fg-subtle">Name</span>
            <input
              value={save.name}
              maxLength={16}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-48 rounded-md border border-border bg-bg px-3 text-fg"
            />
          </label>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-fg-subtle">Bankroll</p>
            <p className="font-mono text-lg tabular-nums">{formatChips(save.bankroll)}</p>
          </div>
        </div>

        <div className="grid gap-5">
          <Choice
            label="AI"
            value={s.difficulty}
            onChange={(v) => patchSettings({ difficulty: v as Difficulty })}
            options={[
              { v: "casual", l: "Casual", d: "Leaky, sticky" },
              { v: "regular", l: "Regular", d: "Solid club" },
              { v: "pro", l: "Pro", d: "GTO-leaning" },
            ]}
          />
          <Choice
            label="Seats"
            value={s.seats}
            onChange={(v) => patchSettings({ seats: v as TableSize })}
            options={[
              { v: 2, l: "Heads-up" },
              { v: 4, l: "4-max" },
              { v: 6, l: "6-max" },
            ]}
          />
          <Choice
            label="Buy-in"
            value={s.buyInBb}
            onChange={(v) => patchSettings({ buyInBb: v as 50 | 100 | 200 })}
            options={[
              { v: 50, l: "50 BB", d: formatChips(50 * s.smallBlind * 2) },
              { v: 100, l: "100 BB", d: formatChips(100 * s.smallBlind * 2) },
              { v: 200, l: "200 BB", d: formatChips(200 * s.smallBlind * 2) },
            ]}
          />
          <Choice
            label="Speed"
            value={s.speed}
            onChange={(v) => patchSettings({ speed: v as Speed })}
            options={[
              { v: "slow", l: "Slow" },
              { v: "normal", l: "Normal" },
              { v: "fast", l: "Fast" },
            ]}
          />
        </div>

        <Button
          className="mt-6 w-full"
          size="xl"
          onClick={() => startTable()}
          disabled={save.bankroll < buy}
        >
          Sit down · {formatChips(buy)}
        </Button>
        {save.bankroll < buy && (
          <p className="mt-2 text-center text-xs text-fg-muted">Bankroll short of this buy-in. Pick a smaller stack.</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ["Hands", save.career.hands],
          ["Career", formatChips(save.career.net)],
          ["Biggest pot", formatChips(save.career.biggestPot)],
          ["Tables", save.career.tablesWon],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-bg-elevated px-3 py-2">
            <dt className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">{k}</dt>
            <dd className="font-mono tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
