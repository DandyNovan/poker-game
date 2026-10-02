import { cn } from "@/lib/utils";
import type { Card } from "@/poker/types";
import { RANK_LABEL, SUIT_GLYPH, isRed } from "@/poker/cards";

interface Props {
  card?: Card | null;
  hidden?: boolean;
  win?: boolean;
  size?: "sm" | "md" | "lg";
  delay?: number;
  className?: string;
}

const SIZE = {
  sm: "w-9 h-[3.25rem] text-[0.7rem] rounded-[6px]",
  md: "w-12 h-[4.25rem] text-sm rounded-[8px]",
  lg: "w-16 h-[5.6rem] text-base rounded-[10px]",
};

export function PlayingCard({ card, hidden, win, size = "md", delay = 0, className }: Props) {
  if (!card || hidden) {
    return (
      <div
        className={cn("card-back deal-card relative overflow-hidden", SIZE[size], className)}
        style={{ animationDelay: `${delay}ms` }}
        aria-label="Facedown card"
      >
        <div className="absolute inset-[5px] rounded-[5px] border border-accent/20" />
      </div>
    );
  }
  const red = isRed(card.suit);
  return (
    <div
      className={cn(
        "card-face deal-card relative flex flex-col justify-between p-1 leading-none",
        SIZE[size],
        win && "card-win",
        className,
      )}
      style={{ animationDelay: `${delay}ms`, color: red ? "var(--color-suit-red)" : "var(--color-suit-ink)" }}
      aria-label={`${RANK_LABEL[card.rank]} of ${card.suit}`}
    >
      <div className="font-display font-semibold tracking-tight">
        <div>{RANK_LABEL[card.rank]}</div>
        <div className="-mt-0.5">{SUIT_GLYPH[card.suit]}</div>
      </div>
      <div className="self-end rotate-180 font-display font-semibold">
        <div>{RANK_LABEL[card.rank]}</div>
      </div>
    </div>
  );
}

export function CardSlot({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={cn(
        "border border-dashed border-fg/15 bg-black/10",
        SIZE[size],
        size === "lg" ? "rounded-[10px]" : "rounded-[8px]",
      )}
    />
  );
}
