import { useRef, useEffect } from "react";
import * as d3 from "d3";

interface DataPoint { year: number; value: number | null; }
interface Props {
  revenue: DataPoint[];
  grossProfit: DataPoint[];
  operatingIncome: DataPoint[];
  ticker: string;
}

export default function MarginTrendsChart({ revenue, grossProfit, operatingIncome, ticker }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;

    // Build margin series
    const years = [...new Set(revenue.map(d => d.year))].sort();
    const revMap = Object.fromEntries(revenue.map(d => [d.year, d.value]));
    const gpMap = Object.fromEntries(grossProfit.map(d => [d.year, d.value]));
    const oiMap = Object.fromEntries(operatingIncome.map(d => [d.year, d.value]));

    const grossMargin = years
      .map(y => ({ year: y, value: revMap[y] && gpMap[y] ? (gpMap[y]! / revMap[y]!) * 100 : null }))
      .filter(d => d.value !== null) as { year: number; value: number }[];
    const opMargin = years
      .map(y => ({ year: y, value: revMap[y] && oiMap[y] ? (oiMap[y]! / revMap[y]!) * 100 : null }))
      .filter(d => d.value !== null) as { year: number; value: number }[];

    if (grossMargin.length < 2) return;

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

    const allYears = [...new Set([...grossMargin, ...opMargin].map(d => d.year))].sort();
    const allVals = [...grossMargin, ...opMargin].map(d => d.value);
    const xScale = d3.scaleLinear().domain(d3.extent(allYears) as [number, number]).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, Math.max(100, d3.max(allVals)!)]).nice().range([height, 0]);

    g.append("g").call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ""))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("line").attr("stroke", "rgba(255,255,255,0.06)"); });

    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(allYears.length).tickSize(0))
      .call(gEl => { gEl.select(".domain").attr("stroke", "rgba(255,255,255,0.1)"); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    const mkLine = d3.line<{ year: number; value: number }>()
      .x(d => xScale(d.year)).y(d => yScale(d.value)).curve(d3.curveMonotoneX);

    const tooltip = d3.select(tooltipRef.current);

    const drawLine = (data: { year: number; value: number }[], color: string, dash: string, label: string) => {
      const path = g.append("path").datum(data)
        .attr("fill", "none").attr("stroke", color).attr("stroke-width", 2)
        .attr("stroke-dasharray", dash).attr("d", mkLine);
      const len = (path.node() as SVGPathElement).getTotalLength();
      path.attr("stroke-dasharray", `${len}`).attr("stroke-dashoffset", len)
        .transition().duration(600).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
        .on("end", () => { if (dash !== "none") path.attr("stroke-dasharray", dash); });

      g.selectAll(`.dot-${label}`).data(data).enter().append("circle")
        .attr("cx", d => xScale(d.year)).attr("cy", d => yScale(d.value))
        .attr("r", 4).attr("fill", color).attr("stroke", "#1f2937").attr("stroke-width", 1.5)
        .on("mousemove", (event, d) => {
          tooltip.style("opacity", "1").style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`)
            .html(`<span class="font-semibold">${label} ${d.year}</span><br/>${d.value.toFixed(1)}%`);
        })
        .on("mouseleave", () => tooltip.style("opacity", "0"));
    };

    drawLine(grossMargin, "#3b82f6", "none", "Gross Margin");
    drawLine(opMargin, "#a78bfa", "5,4", "Operating Margin");

    const legend = g.append("g").attr("transform", `translate(${width - 200}, -4)`);
    [{ color: "#3b82f6", label: "Gross Margin", dash: false }, { color: "#a78bfa", label: "Operating Margin", dash: true }].forEach((item, i) => {
      const lg = legend.append("g").attr("transform", `translate(${i * 100}, 0)`);
      lg.append("line").attr("x1", 0).attr("x2", 12).attr("y1", 5).attr("y2", 5)
        .attr("stroke", item.color).attr("stroke-width", 2)
        .attr("stroke-dasharray", item.dash ? "4,3" : "none");
      lg.append("text").attr("x", 16).attr("y", 9).attr("fill", "#9ca3af").attr("font-size", "10").text(item.label);
    });

    const ro = new ResizeObserver(() => { if (wrapperRef.current) svg.attr("width", wrapperRef.current.clientWidth); });
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [revenue, grossProfit, operatingIncome]);

  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-3 space-y-1">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Margin Trends · {ticker} 10-K</p>
      <div ref={wrapperRef} className="w-full">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>
      <div ref={tooltipRef} className="fixed pointer-events-none z-50 opacity-0 bg-gray-900 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-200 shadow-xl transition-opacity" />
    </div>
  );
}
