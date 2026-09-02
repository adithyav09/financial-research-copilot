import { useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Marketing landing page (editorial/research identity: "annotated primary source").
 * Shown to logged-out visitors; every CTA leads into sign-in via `onGetStarted`.
 * Light-default; the dark variant is scoped to this component via `.editorial-dark`
 * (CSS vars cascade to descendants) so it never disturbs the legacy dark app.
 */
export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [dark, setDark] = useState(false);

  return (
    <div className={`${dark ? "editorial-dark " : ""}min-h-screen bg-paper text-ink font-sans`}>
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-rule bg-paper">
        <div className="mx-auto flex h-[60px] max-w-[1080px] items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-[30px] w-[30px] place-items-center border-[1.5px] border-ink font-serif text-[22px] font-semibold leading-none">
              T
            </span>
            <span className="font-serif text-[19px] font-semibold">Thesis</span>
            <span className="hidden text-xs text-ink-faint sm:inline">company research you can verify</span>
          </div>
          <nav className="flex items-center gap-5 text-[13.5px]">
            <a href="#how" className="hidden text-ink-soft hover:text-ink sm:inline">How it works</a>
            <a href="#features" className="hidden text-ink-soft hover:text-ink sm:inline">Features</a>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle theme"
              className="grid h-8 w-8 place-items-center border border-rule-strong text-ink-soft hover:text-ink"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onGetStarted} className="border border-rule-strong px-[15px] py-2 font-semibold text-ink">
              Sign in
            </button>
            <button onClick={onGetStarted} className="border border-accent-ink bg-accent-ink px-[15px] py-2 font-semibold text-paper-raised">
              Try it
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-6 sm:px-8">
        {/* hero */}
        <section className="pt-[74px] pb-12">
          <p className="eyebrow"><span className="text-stamp">§</span>&nbsp; primary-source equity research</p>
          <h1 className="mt-3.5 font-serif text-[clamp(34px,5.4vw,58px)] font-semibold leading-[1.04] [text-wrap:balance]">
            Answer any question about a public company — <em className="italic font-medium">straight from the filings.</em>
          </h1>
          <p className="mt-5 max-w-[54ch] text-[18px] leading-relaxed text-ink-soft">
            Ask in plain English. Get an answer drawn from the company&rsquo;s own 10-K and 10-Q, with every figure and
            claim linked to the exact passage it came from. No hype, no black box — a citation you can open.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3.5">
            <button onClick={onGetStarted} className="border border-accent-ink bg-accent-ink px-[15px] py-2 text-[13.5px] font-semibold text-paper-raised">
              Ask about a company
            </button>
            <a href="#how" className="border border-rule-strong px-[15px] py-2 text-[13.5px] font-semibold text-ink">
              See how it works
            </a>
            <span className="text-[13px] text-ink-faint">Free to try · SEC EDGAR + live market data</span>
          </div>

          {/* specimen: the loop, shown as an annotated primary source */}
          <div id="how" className="mt-[52px] border border-rule-strong bg-paper-raised shadow-[0_18px_40px_-28px_rgba(20,22,26,.35)]">
            <div className="flex items-center justify-between border-b border-rule px-[18px] py-2.5">
              <span className="eyebrow !text-accent-ink">The loop — ask · cite · verify</span>
              <span className="border border-stamp px-[7px] py-[3px] font-mono text-[10px] uppercase tracking-[.12em] text-stamp [transform:rotate(-1.5deg)]">
                as filed
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr]">
              {/* answer */}
              <div className="border-b border-rule px-6 py-[22px] md:border-b-0 md:border-r">
                <p className="font-serif text-[17px] italic text-ink">
                  &ldquo;What are Apple&rsquo;s main risk factors?&rdquo;
                </p>
                <p className="mt-4 text-[15.5px] leading-[1.62]">
                  Apple&rsquo;s filing centers its risk disclosure on <strong>manufacturing and supplier concentration</strong> in
                  a small number of Asian locations<Fn n="1" />, exposure to <strong>intense competition and rapid technological
                  change</strong><Fn n="2" />, and <strong>legal and regulatory scrutiny of the App Store</strong><Fn n="3" />.
                </p>

                <div className="mt-[18px] border-t-[1.5px] border-rule-strong">
                  <Row label="Total net sales, FY2024" value="$391.0B" delta="+2.0% YoY" dir="up" />
                  <Row label="Services revenue" value="$96.2B" delta="+12.9%" dir="up" />
                  <Row label="Reportable segments" value="5 geographic" />
                </div>
                <p className="mt-3.5 font-mono text-[11px] leading-relaxed text-ink-faint">
                  Figures pulled from the filing &amp; XBRL — never invented. Click a <sup className="text-accent-ink">n</sup> to open its source →
                </p>
              </div>

              {/* source passage — bg-paper is a touch darker than the raised card, giving the column step */}
              <div className="bg-paper px-6 py-[22px]">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="font-mono text-[12px] text-ink-soft">AAPL · 10-K · Item 1A</span>
                  <span className="eyebrow !text-accent-ink">source ¶</span>
                </div>
                <p className="text-[13.5px] leading-[1.68] text-ink-soft">
                  <sup className="font-mono text-[11px] text-accent-ink">1</sup> Substantially all of the Company&rsquo;s
                  manufacturing is performed in whole or in part by{" "}
                  <mark className="hl-mark">outsourcing partners located primarily in China mainland, India, Japan, South
                  Korea, Taiwan and Vietnam</mark>, and the Company&rsquo;s products depend on components from a small number
                  of single-source suppliers. A disruption at these partners could materially adversely affect the Company.
                </p>
                <p className="mt-3.5 text-[13.5px] leading-[1.68] text-ink-soft">
                  <sup className="font-mono text-[11px] text-accent-ink">2</sup> The markets for the Company&rsquo;s products
                  and services are <mark className="hl-mark">highly competitive, and the Company is confronted by aggressive
                  competition</mark> in all areas of its business…
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* pillars */}
        <section className="py-[52px]">
          <h2 className="font-serif text-[26px] font-semibold">Why analysts trust it</h2>
          <div className="mt-6 grid grid-cols-1 border-t-[1.5px] border-rule-strong sm:grid-cols-3">
            <Pillar n="01" title="Grounded">
              Every answer is built from the company&rsquo;s own SEC filings — not the open web, not a model&rsquo;s memory.
              If it isn&rsquo;t in the document, it doesn&rsquo;t appear.
            </Pillar>
            <Pillar n="02" title="Fast">
              Skip the 200-page PDF. Ask in plain English and read a structured answer — takeaway, the figures that matter,
              and the narrative — in seconds.
            </Pillar>
            <Pillar n="03" title="Verifiable">
              Click any citation to jump to the exact passage, highlighted in the real filing. Diff this year&rsquo;s risks
              against last year&rsquo;s. Check the work.
            </Pillar>
          </div>
        </section>

        {/* features */}
        <section id="features" className="py-[52px]">
          <div className="mb-2 flex items-baseline gap-4">
            <h2 className="font-serif text-[26px] font-semibold">Built for reading filings</h2>
            <span className="eyebrow">10-K · 10-Q</span>
          </div>
          <div className="mt-4 grid grid-cols-1 border border-rule sm:grid-cols-2">
            <Feature kicker="Document" title="Jump-to-source, highlighted">
              Open the actual 10-K/10-Q inline; every citation scrolls to and highlights the exact sentence it drew from.
            </Feature>
            <Feature kicker="Compare" signature title="Year-over-year risk diff">
              See exactly what changed in Risk Factors or MD&amp;A vs. last year — added, removed, reworded — in a clean diff.
            </Feature>
            <Feature kicker="Navigate" title="Section table of contents">
              Jump straight to Item 1A Risk Factors, Item 7 MD&amp;A, or Item 8 Financial Statements. Search within the document.
            </Feature>
            <Feature kicker="Figures" title="Clean financial statements">
              Income statement, balance sheet, and cash flow rendered from XBRL as readable, tabular figures — not raw HTML.
            </Feature>
            <Feature kicker="Understand" title="Plain-English summaries">
              A one-paragraph read of any dense section, with jargon defined inline when you ask for the simple view.
            </Feature>
            <Feature kicker="Trend" title="Multi-year charts on request">
              Ask for a trend and get a multi-year revenue, margin, or cash-flow chart built from the company&rsquo;s XBRL history.
            </Feature>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-rule">
        <div className="mx-auto max-w-[1080px] px-6 py-10 sm:px-8">
          <p className="mb-6 max-w-[65ch] border-l-2 border-stamp py-2 pl-4 text-[13px] text-ink-soft">
            <strong>Research, not advice.</strong> Thesis surfaces and cites what companies disclose. It does not recommend
            buying, selling, or holding any security, and it does not predict prices — that&rsquo;s a deliberate design choice,
            and part of why you can trust what it says.
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-3 text-[12.5px] text-ink-faint">
            <span>Thesis — company research you can verify</span>
            <span className="font-mono">SEC EDGAR · XBRL · Yahoo Finance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --- small building blocks ------------------------------------------------ */

function Fn({ n }: { n: string }) {
  return (
    <sup className="px-px font-mono text-[.68em] text-accent-ink hover:bg-accent-ink-soft">
      <a href="#how" className="no-underline">{n}</a>
    </sup>
  );
}

function Row({ label, value, delta, dir }: { label: string; value: string; delta?: string; dir?: "up" | "down" }) {
  return (
    <div className="flex items-baseline justify-between border-b border-rule py-2">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span>
        <span className="font-mono text-[15px] font-semibold tabular-nums">{value}</span>
        {delta && (
          <span className={`ml-2 font-mono text-[11.5px] ${dir === "down" ? "text-ledger-neg" : "text-ledger-pos"}`}>
            {delta}
          </span>
        )}
      </span>
    </div>
  );
}

function Pillar({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-rule px-6 py-[22px] pb-[26px] sm:[&:not(:last-child)]:border-r">
      <span className="font-mono text-[12px] text-accent-ink">{n}</span>
      <h3 className="mb-1.5 mt-2.5 font-serif text-[20px] font-semibold">{title}</h3>
      <p className="text-[14px] text-ink-soft">{children}</p>
    </div>
  );
}

function Feature({ kicker, title, children, signature }: { kicker: string; title: string; children: React.ReactNode; signature?: boolean }) {
  return (
    <div className="border-b border-rule px-6 py-[22px] [&:nth-child(odd)]:sm:border-r">
      <span className="font-mono text-[11px] uppercase tracking-[.1em] text-ink-faint">
        {kicker}
        {signature && <span className="ml-1.5 border border-stamp px-[5px] py-px text-[10px] text-stamp">signature</span>}
      </span>
      <h3 className="mb-1.5 mt-2 font-serif text-[17px] font-semibold">{title}</h3>
      <p className="text-[13.5px] text-ink-soft">{children}</p>
    </div>
  );
}
