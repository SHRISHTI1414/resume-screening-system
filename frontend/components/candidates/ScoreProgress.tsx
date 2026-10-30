export function ScoreProgress({
  label,
  weight,
  value,
}: {
  label: string;
  weight: number;
  value: number;
}) {
  const percent = Math.round(value);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span>
          {label} <span className="text-xs text-muted-foreground">({weight}% weight)</span>
        </span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
