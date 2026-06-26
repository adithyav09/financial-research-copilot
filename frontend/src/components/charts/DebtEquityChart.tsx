import { useRef, useEffect } from "react";
import * as d3 from "d3";

interface DataPoint { year: number; value: number | null; }
interface Props { totalDebt: DataPoint[]; equity: DataPoint[]; ticker: string; }

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

export default function DebtEquityChart({ totalDebt, equity, ticker }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    const years = [...new Set([...totalDebt, ...equity].map(d => d.year))].sort();
    const debtMap = Object.fromEntries(totalDebt.map(d => [d.year, d.value ?? 0]));
    const equityMap = Object.fromEntries(equity.map(d => [d.year, d.value ?? 0]));

    type StackRow = { year: number; debt: number; equity: number };
    const stacked: StackRow[] = years.map(y => ({ year: y, debt: Math.max(0, debtMap[y] ?? 0), equity: Math.max(0, equityMap[y] ?? 0) }));
    if (stacked.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 16, right: 24, bottom: 36, left: 56 };
    const width = wrapperRef.current.clientWidth - margin.left - margin.right;
    const height = 260 - margin.top - margin.bottom;

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", 260)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(stacked, d => d.debt + d.equity)!;
    const xScale = d3.scaleBand().domain(years.map(String)).range([0, width]).padding(0.3);
    const yScale = d3.scaleLinear().domain([0, maxVal]).nice().range([height, 0]);

    g.append("g").call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ""))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("line").attr("stroke", "rgba(255,255,255,0.06)"); });

    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call(gEl => { gEl.select(".domain").attr("stroke", "rgba(255,255,255,0.1)"); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => fmt(d as number)))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    const tooltip = d3.select(tooltipRef.current);

    // Equity (bottom segment)
    g.selectAll(".bar-equity").data(stacked).enter().append("rect")
      .attr("x", d => xScale(String(d.year))!)
      .attr("width", xScale.bandwidth())
      .attr("y", height).attr("height", 0)
      .attr("fill", "#14b8a6").attr("rx", 2)
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", "1").style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`)
          .html(`<span class="font-semibold">Equity ${d.year}</span><br/>${fmt(d.equity)}`);
      })
      .on("mouseleave", () => tooltip.style("opacity", "0"))
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("y", d => yScale(d.equity))
      .attr("height", d => height - yScale(d.equity));

    // Debt (top segment)
    g.selectAll(".bar-debt").data(stacked).enter().append("rect")
      .attr("x", d => xScale(String(d.year))!)
      .attr("width", xScale.bandwidth())
      .attr("y", height).attr("height", 0)
      .attr("fill", "#f87171").attr("rx", 2)
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", "1").style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`)
          .html(`<span class="font-semibold">Debt ${d.year}</span><br/>${fmt(d.debt)}`);
      })
      .on("mouseleave", () => tooltip.style("opacity", "0"))
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("y", d => yScale(d.equity + d.debt))
      .attr("height", d => yScale(d.equity) - yScale(d.equity + d.debt));

    const legend = g.append("g").attr("transform", `translate(${width - 130}, -4)`);
    [{ color: "#f87171", label: "Total Debt" }, { color: "#14b8a6", label: "Equity" }].forEach((item, i) => {
      const lg = legend.append("g").attr("transform", `translate(${i * 66}, 0)`);
      lg.append("rect").attr("width", 10).attr("height", 10).attr("fill", item.color).attr("rx", 2);
      lg.append("text").attr("x", 14).attr("y", 9).attr("fill", "#9ca3af").attr("font-size", "10").text(item.label);
    });

    const ro = new ResizeObserver(() => { if (wrapperRef.current) svg.attr("width", wrapperRef.current.clientWidth); });
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [totalDebt, equity]);

  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-3 space-y-1">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Debt vs. Equity · {ticker} 10-K</p>
      <div ref={wrapperRef} className="w-full">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>
      <div ref={tooltipRef} className="fixed pointer-events-none z-50 opacity-0 bg-gray-900 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-200 shadow-xl transition-opacity" />
    </div>
  );
}
