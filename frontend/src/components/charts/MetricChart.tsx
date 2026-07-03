import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

interface DataPoint { year: number; value: number | null; }
export interface ChartSeries { key: string; label: string; color: string; data: DataPoint[]; }

function fmt(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `${v.toFixed(2)}`;
}

interface Props {
  series: ChartSeries[];
  years: number[];
  type: "bar" | "line";
}

/**
 * One generic financial chart used by the Visualize builder. Renders any set of
 * year-indexed series as grouped bars or multi-line, with a shared y-axis, grid,
 * legend, and hover tooltip. Replaces the five near-identical D3 chart components.
 */
export default function MetricChart({ series, years, type }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !wrapperRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    if (!series.length || !years.length) return;

    const margin = { top: 16, right: 20, bottom: 36, left: 60 };
    const width = Math.max(220, wrapperRef.current.clientWidth) - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    const g = svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", 280)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yearSet = new Set(years);
    const filtered = series.map(s => ({ ...s, data: s.data.filter(d => yearSet.has(d.year) && d.value !== null) }));
    const allVals = filtered.flatMap(s => s.data.map(d => d.value as number));
    if (!allVals.length) return;

    const xScale = d3.scaleBand<string>().domain(years.map(String)).range([0, width]).padding(0.2);
    const yScale = d3.scaleLinear()
      .domain([Math.min(0, d3.min(allVals)!), Math.max(0, d3.max(allVals)!)])
      .nice()
      .range([height, 0]);

    // Grid
    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(() => ""))
      .call(el => { el.select(".domain").remove(); el.selectAll("line").attr("stroke", "rgba(255,255,255,0.06)"); });

    // X axis (always at the bottom; a separate zero line marks 0 when values go negative)
    g.append("g").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call(el => { el.select(".domain").attr("stroke", "rgba(255,255,255,0.12)"); el.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => fmt(d as number)))
      .call(el => { el.select(".domain").remove(); el.selectAll("text").attr("fill", "#6b7280").attr("font-size", "11"); });

    if (d3.min(allVals)! < 0) {
      g.append("line").attr("x1", 0).attr("x2", width).attr("y1", yScale(0)).attr("y2", yScale(0))
        .attr("stroke", "rgba(255,255,255,0.2)");
    }

    const tooltip = d3.select(tooltipRef.current);
    const showTip = (event: MouseEvent, label: string, year: number, value: number) => {
      tooltip.style("opacity", "1")
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`<span class="font-semibold">${label} ${year}</span><br/>${fmt(value)}`);
    };
    const hideTip = () => tooltip.style("opacity", "0");

    if (type === "bar") {
      const inner = d3.scaleBand<string>().domain(filtered.map(s => s.key)).range([0, xScale.bandwidth()]).padding(0.1);
      filtered.forEach(s => {
        g.selectAll(`.bar-${s.key}`).data(s.data).enter().append("rect")
          .attr("x", d => (xScale(String(d.year)) ?? 0) + (inner(s.key) ?? 0))
          .attr("width", inner.bandwidth())
          .attr("fill", s.color).attr("rx", 2)
          .attr("y", height).attr("height", 0)
          .on("mousemove", (event, d) => showTip(event as MouseEvent, s.label, d.year, d.value!))
          .on("mouseleave", hideTip)
          .transition().duration(500).ease(d3.easeCubicOut)
          .attr("y", d => yScale(Math.max(0, d.value!)))
          .attr("height", d => Math.abs(yScale(d.value!) - yScale(0)));
      });
    } else {
      const cx = (year: number) => (xScale(String(year)) ?? 0) + xScale.bandwidth() / 2;
      filtered.forEach(s => {
        const line = d3.line<DataPoint>().x(d => cx(d.year)).y(d => yScale(d.value!));
        g.append("path").datum(s.data).attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2).attr("d", line);
        g.selectAll(`.dot-${s.key}`).data(s.data).enter().append("circle")
          .attr("cx", d => cx(d.year)).attr("cy", d => yScale(d.value!)).attr("r", 3.5).attr("fill", s.color)
          .on("mousemove", (event, d) => showTip(event as MouseEvent, s.label, d.year, d.value!))
          .on("mouseleave", hideTip);
      });
    }

    // Legend
    const legend = g.append("g").attr("transform", `translate(0, -6)`);
    let offset = 0;
    filtered.forEach(s => {
      const lg = legend.append("g").attr("transform", `translate(${offset}, 0)`);
      lg.append("rect").attr("width", 10).attr("height", 10).attr("fill", s.color).attr("rx", 2).attr("y", -2);
      const text = lg.append("text").attr("x", 14).attr("y", 7).attr("fill", "#9ca3af").attr("font-size", "10").text(s.label);
      offset += 24 + (text.node()?.getComputedTextLength() ?? s.label.length * 6);
    });
  }, [series, years, type, w]);

  return (
    <div className="w-full">
      <div ref={wrapperRef} className="w-full">
        <svg ref={svgRef} className="w-full overflow-visible" />
      </div>
      <div ref={tooltipRef} className="fixed pointer-events-none z-50 opacity-0 bg-gray-900 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-200 shadow-xl transition-opacity" />
    </div>
  );
}
