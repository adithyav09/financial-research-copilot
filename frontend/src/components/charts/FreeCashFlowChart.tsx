import { useRef, useEffect } from "react";
import * as d3 from "d3";

interface DataPoint { year: number; value: number | null; }
interface Props { data: DataPoint[]; ticker: string; }

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

export default function FreeCashFlowChart({ data, ticker }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;
    const clean = data.filter(d => d.value !== null) as { year: number; value: number }[];
    if (clean.length < 2) return;

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

    const xScale = d3.scaleLinear().domain(d3.extent(clean, d => d.year) as [number, number]).range([0, width]);
    const yMin = d3.min(clean, d => d.value)!;
    const yMax = d3.max(clean, d => d.value)!;
    const yScale = d3.scaleLinear().domain([Math.min(0, yMin), Math.max(0, yMax)]).nice().range([height, 0]);

    // Defs for gradients
    const defs = svg.append("defs");
    const posGrad = defs.append("linearGradient").attr("id", "fcf-pos").attr("x1", "0").attr("x2", "0").attr("y1", "0").attr("y2", "1");
    posGrad.append("stop").attr("offset", "0%").attr("stop-color", "#22c55e").attr("stop-opacity", 0.35);
    posGrad.append("stop").attr("offset", "100%").attr("stop-color", "#22c55e").attr("stop-opacity", 0.02);
    const negGrad = defs.append("linearGradient").attr("id", "fcf-neg").attr("x1", "0").attr("x2", "0").attr("y1", "0").attr("y2", "1");
    negGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.02);
    negGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.35);

    // Grid
    g.append("g").call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ""))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("line").attr("stroke", "rgba(255,255,255,0.06)"); });

    // Zero line
    g.append("line")
      .attr("x1", 0).attr("x2", width)
      .attr("y1", yScale(0)).attr("y2", yScale(0))
      .attr("stroke", "rgba(255,255,255,0.2)").attr("stroke-dasharray", "4,3");

    // Axes
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(clean.length).tickSize(0))
      .call(gEl => { gEl.select(".domain").attr("stroke", "rgba(255,255,255,0.1)"); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => fmt(d as number)))
      .call(gEl => { gEl.select(".domain").remove(); gEl.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    const area = d3.area<{ year: number; value: number }>()
      .x(d => xScale(d.year))
      .y0(yScale(0))
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const line = d3.line<{ year: number; value: number }>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Positive area
    g.append("path").datum(clean.map(d => ({ ...d, value: Math.max(0, d.value) })))
      .attr("fill", "url(#fcf-pos)").attr("d", area);
    // Negative area
    g.append("path").datum(clean.map(d => ({ ...d, value: Math.min(0, d.value) })))
      .attr("fill", "url(#fcf-neg)").attr("d", area);

    // Line
    const path = g.append("path").datum(clean)
      .attr("fill", "none")
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 2)
      .attr("d", line);

    const totalLength = (path.node() as SVGPathElement).getTotalLength();
    path.attr("stroke-dasharray", totalLength).attr("stroke-dashoffset", totalLength)
      .transition().duration(600).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0);

    // Dots + tooltip
    const tooltip = d3.select(tooltipRef.current);
    g.selectAll(".dot").data(clean).enter().append("circle")
      .attr("cx", d => xScale(d.year)).attr("cy", d => yScale(d.value))
      .attr("r", 4).attr("fill", d => d.value >= 0 ? "#22c55e" : "#ef4444").attr("stroke", "#1f2937").attr("stroke-width", 1.5)
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", "1").style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`)
          .html(`<span class="font-semibold">FCF ${d.year}</span><br/>${fmt(d.value)}`);
      })
      .on("mouseleave", () => tooltip.style("opacity", "0"));

    const ro = new ResizeObserver(() => { if (wrapperRef.current) svg.attr("width", wrapperRef.current.clientWidth); });
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [data]);

  return (
    <div className="rounded-xl border border-border bg-surface-secondary p-3 space-y-1">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Free Cash Flow · {ticker} 10-K</p>
      <div ref={wrapperRef} className="w-full">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>
      <div ref={tooltipRef} className="fixed pointer-events-none z-50 opacity-0 bg-gray-900 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-200 shadow-xl transition-opacity" />
    </div>
  );
}
