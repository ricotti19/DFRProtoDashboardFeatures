"use client";   // Next.js directive to ensure this component runs on the client-side

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Row = Record<string, any>;

const TIRES = ["FL", "FR", "RL", "RR"];
const COLORS: Record<string, string> = {
  FL: "#ff6b6b",
  FR: "#ffbe4a",
  RL: "#00f3ff", 
  RR: "#9fd3a3",
  OVERALL: "#000000", 
};

function safeNum(v: any) {
  if (v == null) return NaN;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  const s = String(v).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export default function TireDegradation({
  csvPath = "/carData.csv",
  applyExponential = false,
  normalize = false,
}: {
  csvPath?: string;
  applyExponential?: boolean;
  normalize?: boolean;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0); // currently hovered / active graph index

  // Load CSV data
  useEffect(() => {
    let cancelled = false;      //safety guard in case component unmounts before fetch completes
    (async () => {      //immediately invoked async function to fetch and parse CSV data
      try {
        const r = await fetch(csvPath, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const txt = await r.text();
        const parsed: Row[] = txt ? JSON.parse(txt) : [];
        if (!cancelled) setRows(parsed.length ? parsed : null);
      } catch (e) {
        console.warn("CSV not loaded, using synthetic data");
        if (!cancelled) setRows(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [csvPath]);     //only run this data-fetching logic when component first loads

  // Generate chart data
  const chartData = useMemo(() => {
    if (!rows || rows.length < 2) {
      // Synthetic fallback
      return Array.from({ length: 40 }).map((_, i) => {
        const wear = (i / 39) * 100;
        const FL = +(100 * Math.exp(-0.015 * wear)).toFixed(2);
        const FR = +(100 * Math.exp(-0.012 * wear)).toFixed(2);
        const RL = +(100 * Math.exp(-0.013 * wear)).toFixed(2);
        const RR = +(100 * Math.exp(-0.011 * wear)).toFixed(2);
        const OVERALL = +((FL + FR + RL + RR) / 4).toFixed(2);
        return { wear, FL, FR, RL, RR, OVERALL };
      });
    }

    // Use CSV data
    const grips: Record<string, number[]> = { FL: [], FR: [], RL: [], RR: [] };
    rows.forEach((row) => {
      TIRES.forEach((t) => {
        const val = safeNum(row[t]);
        grips[t].push(Number.isFinite(val) ? val : 0);
      });
    });

    return grips.FL.map((_, i) => {
      const out: any = { wear: (i / grips.FL.length) * 100 };
      TIRES.forEach((t) => (out[t] = grips[t][i]));
      const vals = TIRES.map((t) => out[t]);
      out.OVERALL = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
      return out;
    });
  }, [rows]);

  // Dynamic wheel percentages based on activeIndex
  const wheelPercentages = useMemo(() => {
    const idx = Math.min(activeIndex, chartData.length - 1);
    const point = chartData[idx];
    return TIRES.reduce(
      (acc, t) => ({ ...acc, [t]: point ? (point[t] ?? 0) : 0 }),
      {} as Record<string, number>
    );
  }, [chartData, activeIndex]);

  return (
    <div style={{ width: "100%", padding: 16 }}>
      {/* Car Prototype */}
      <div
        style={{
          position: "relative",
          width: 300,
          aspectRatio: "2 / 4",
          margin: "0 auto",
          background: "#222",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <img
          src="DFRCarProtoTireDeg.png"
          alt="Car Prototype"
          style={{ 
            width: "100%", 
            height: "100%", 
            objectFit: "cover",
          }}
        />

        {[ 
          //displaying the prototype overlayed with circles having tire percentages
          { t: "FL", top: "12%", left: "28%" },
          { t: "FR", top: "12%", left: "70%" },
          { t: "RL", top: "87%", left: "30%" },
          { t: "RR", top: "87%", left: "70%" }
        ].map(({ t, top, left }) => (
          <div
            key={t}
            style={{
              position: "absolute", 
              top,
              left, 
              width: 50, 
              height: 50, 
              borderRadius: "50%", 
              background: "#d0ff00", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              color: "#002fff", 
              fontWeight: 500, 
              fontSize: 20, 
              boxShadow: "0 0 6px #0f0",   
              transform: "translate(-50%, -50%)",
            }}
          >
            {wheelPercentages[t] ? wheelPercentages[t].toFixed(0) : 0}%
          </div>
        ))}
      </div>

      {/* Mini Chart */}
      <div style={{ width: "100%", height: 500, marginTop: 32 }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 25, right: 20, left: 10, bottom: 35 }}
            onMouseMove={(state: any) => {
              if (state && state.activeTooltipIndex != null) setActiveIndex(state.activeTooltipIndex);
            }}
            onMouseLeave={() => setActiveIndex(chartData.length - 1)}
          >
            <CartesianGrid stroke="#2a2a2a" />

            <XAxis 
              dataKey="wear" 
              type="number"
              domain={[0, 100]}
              tickCount={21}
              tick={{ fill: "#ffffff", fontSize: 15, fontWeight: 500 }}
              axisLine={{ stroke: "#888" }}
              tickLine={{ stroke: "#888" }}
              tickMargin={10}
              tickFormatter={(value) => `${Math.round(value)}%`} 
              label={{ 
                value: "Wear (%)", 
                fill: "#ffffff", 
                position: "insideBottom", 
                offset: -15,
                style: { textAnchor: "middle", fontSize: 20, fontWeight: 700 }
              }} 
            />

            <YAxis
              tick={{ fill: "#ffffff", fontSize: 15, fontWeight: 500 }}
              axisLine={{ stroke: "#888" }}
              tickLine={{ stroke: "#888" }}
              width={75}        
              tickMargin={10}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              label={{ 
                value: "Grip (%)", 
                angle: -90, 
                position: "insideLeft", 
                fill: "#ffffff", 
                style: { textAnchor: "middle", fontSize: 20, fontWeight: 700 } 
              }}
            />

            <Tooltip 
            contentStyle={{ 
              backgroundColor: "#fffde6", // Soft pale yellow background
              border: "1px solid #ddd",   // Clean light grey border
              borderRadius: 6,            // Rounded corner aesthetics
            }}
            labelStyle={{
              fontWeight: 800,          
            }}
            itemStyle={{ 
              fontWeight: 600,           
              color: "#000000",        
              paddingTop: 2,
              paddingBottom: 2
            }} 
            />

            
            <Legend
              verticalAlign="top"
              align="center"
              layout="horizontal"
              wrapperStyle={{
                position: "relative", 
                top: -10,              
                paddingBottom: 15,   
                fontSize: 14,       
                fontWeight: 500,    
                color: "fffae0",   
              }}
              iconType="circle"
              iconSize={10}
            />
            
            <Line dataKey="OVERALL" stroke={COLORS.OVERALL} strokeWidth={2} dot={false} fontSize={13.5} fontWeight={500} />
            {TIRES.map((t) => (
              <Line key={t} dataKey={t} stroke={COLORS[t]} strokeWidth={2} dot={false} fontSize={13.5} fontWeight={500} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
