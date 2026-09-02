/**
 * The Thesis logo mark — a squared, ink-ruled serif "T", identical to the mark
 * in the landing-page header. One component so the navbar, chat header, sign-in
 * page, and modals all render the same editorial mark at different sizes.
 */
export default function ThesisMark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center border-[1.5px] border-ink font-serif font-semibold leading-none text-ink shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.72) }}
      aria-hidden
    >
      T
    </span>
  );
}
