import { useRef, useEffect } from "react";
import * as d3 from "d3";

interface DataPoint { year: number; value: number | null; }
interface Props { data: DataPoint[]; ticker: string; }

export default function EPSChart({ data, ticker }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;
    const clean = data.filter(d => d.value !== null) as { year: number; value: number }[];
    if (clean.length === 0) return;

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

    const xScale = d3.scaleBand().domain(clean.map(d => String(d.year))).range([0, width]).padding(0.3);
    const yMin = Math.min(0, d3.min(clean, d => d.value)!);
    const yMax = Math.max(0, d3.max(clean, d => d.value)!);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).nice().range([height, 0]);

    g.append("g").call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ""))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("line").attr("stroke", "rgba(255,255,255,0.06)"); });

    g.append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", yScale(0)).attr("y2", yScale(0))
      .attr("stroke", "rgba(255,255,255,0.15)").attr("stroke-dasharray", "4,3");

    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call(gEl => { gEl.select(".domain").attr("stroke", "rgba(255,255,255,0.1)"); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `$${(d as number).toFixed(2)}`))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    const tooltip = d3.select(tooltipRef.current);

    g.selectAll(".bar").data(clean).enter().append("rect")
      .attr("x", d => xScale(String(d.year))!)
      .attr("width", xScale.bandwidth())
      .attr("y", height)
      .attr("height", 0)
      .attr("rx", 2)
      .attr("fill", (d, i) => {
        if (i === 0) return "#22c55e";
        return d.value >= clean[i - 1].value ? "#22c55e" : "#ef4444";
      })
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", "1").style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`)
          .html(`<span class="font-semibold">EPS ${d.year}</span><br/>$${d.value.toFixed(2)}`);
      })
      .on("mouseleave", () => tooltip.style("opacity", "0"))
      .transition().duration(600).ease(d3.easeCubicOut)
      .attr("y", d => yScale(Math.max(0, d.value)))
      .attr("height", d => Math.abs(yScale(d.value) - yScale(0)));

    const ro = new ResizeObserver(() => { if (wrapperRef.current) svg.attr("width", wrapperRef.current.clientWidth); });
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-3 space-y-1">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">EPS (Diluted) · {ticker} 10-K</p>
      <div ref={wrapperRef} className="w-full">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>
      <div ref={tooltipRef} className="fixed pointer-events-none z-50 opacity-0 bg-gray-900 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-200 shadow-xl transition-opacity" />
    </div>
  );
}
