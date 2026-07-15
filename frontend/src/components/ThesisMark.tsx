/**
 * The Thesis logo mark — a trend line in a rounded blue-tinted square.
 * One component so the navbar, chat header, sign-in page, and modals all
 * render the identical mark at different sizes.
 */
export default function ThesisMark({ size = 30 }: { size?: number }) {
  const icon = Math.round(size / 2);
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-accent/10 border border-accent/25 shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    </div>
  );
}
