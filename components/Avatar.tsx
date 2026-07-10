export default function Avatar({
  emoji,
  color,
  size = 40,
}: {
  emoji: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: color, fontSize: size * 0.55 }}
    >
      {emoji}
    </span>
  );
}
