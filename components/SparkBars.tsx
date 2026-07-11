// A tiny dependency-free bar chart (server-safe: pure divs, no handlers).
// Bar heights scale to the biggest value; zero days still show a 4px stub
// so the week reads as seven columns.
const CHART_HEIGHT = 72;

export default function SparkBars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 0);
  return (
    <div className="flex items-end gap-2">
      {values.map((v, i) => {
        const h = max > 0 ? Math.max(4, Math.round((v / max) * CHART_HEIGHT)) : 4;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[12px] font-semibold text-ink-soft">{v}</span>
            <div
              className="w-full rounded-t bg-accent"
              style={{ height: `${h}px` }}
              aria-hidden
            />
            <span className="text-[11px] text-ink-soft">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
