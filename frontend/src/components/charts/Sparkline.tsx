import { useRef, useEffect } from "react";
import * as d3 from "d3";

interface Props { values: (number | null)[]; }

export default function Sparkline({ values }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const clean = values.filter((v): v is number => v !== null);

  useEffect(() => {
    if (!svgRef.current || clean.length < 2) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const w = 64, h = 22;
    const x = d3.scaleLinear().domain([0, clean.length - 1]).range([2, w - 2]);
    const y = d3.scaleLinear().domain([d3.min(clean)!, d3.max(clean)!]).range([h - 2, 2]);
    const rising = clean[clean.length - 1] >= clean[0];
    const color = rising ? "#22c55e" : "#6b7280";

    const line = d3.line<number>().x((_, i) => x(i)).y(d => y(d)).curve(d3.curveMonotoneX);
    svg.append("path").datum(clean).attr("fill", "none").attr("stroke", color).attr("stroke-width", 1.5).attr("d", line);
  }, [values]);

  if (clean.length < 2) return null;
  return <svg ref={svgRef} width={64} height={22} className="inline-block align-middle mx-1 shrink-0" />;
}
