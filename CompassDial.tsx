// components/liveData/CompassDial.tsx
// renders an interactive compass-style dial for each set of 2 features being compared from 'grid'     
// displayed in top right of graph area

// "use client"; // Next.js directive to ensure it runs on the client-side
import React, { useRef } from "react";

// Props for the CompassDial component
interface CompassDialProps {
  value: number;                  // Current value of the dial
  min?: number;                   // Minimum allowed value (default 0)
  max?: number;                   // Maximum allowed value (default 100)
  size?: number;                  // Diameter of the dial in pixels (default 88)
  step?: number;                  // Increment step when using keyboard arrows (default 1)
  onChange?: (v: number) => void; // Callback when value changes
  label?: string;                 // Optional label displayed below the dial
}

export default function CompassDial({
  value,
  min = 0,
  max = 100,
  size = 88,
  step = 1,
  onChange,
  label,
}: CompassDialProps) {
  const elRef = useRef<HTMLDivElement | null>(null); // Ref to the main dial div
  const pointerIdRef = useRef<number | null>(null);  // Track active pointer ID for drag events

  const startAngle = -135; // Starting angle of the dial (degrees)
  const endAngle = 135;    // Ending angle of the dial (degrees)
  const angleRange = endAngle - startAngle; // Total angle range of the dial

  // Convert a value to a rotation angle for the needle
  const valueToAngle = (v: number) =>
    startAngle + ((v - min) / (max - min || 1)) * angleRange;

  // Convert pointer coordinates to a value on the dial
  const pointerToValue = (clientX: number, clientY: number) => {
    const el = elRef.current;
    if (!el) return value;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2; // Center X
    const cy = rect.top + rect.height / 2; // Center Y
    const dx = clientX - cx;
    const dy = clientY - cy;

    let deg = (Math.atan2(dy, dx) * 180) / Math.PI; // Calculate angle in degrees
    deg = Math.max(startAngle, Math.min(endAngle, deg)); // Clamp to dial range

    const raw = min + ((deg - startAngle) / angleRange) * (max - min); // Map angle to value
    const stepped = Math.round(raw / (step || 1)) * (step || 1);        // Apply step increment

    return Number(Math.max(min, Math.min(max, stepped))); // Clamp final value
  };

  // Handle pointer (mouse/touch) down events
  const handlePointerDown = (e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el) return;

    pointerIdRef.current = e.pointerId; // Track pointer
    el.setPointerCapture?.(e.pointerId); // Capture pointer events for dragging

    const v = pointerToValue(e.clientX, e.clientY); // Get initial value
    onChange?.(v);

    // Update value while dragging
    const onMove = (ev: PointerEvent) => {
      if (pointerIdRef.current !== ev.pointerId) return;
      const nv = pointerToValue(ev.clientX, ev.clientY);
      onChange?.(nv);
    };

    // Release pointer capture on pointer up/cancel
    const onUp = (ev: PointerEvent) => {
      if (pointerIdRef.current !== ev.pointerId) return;
      try { el.releasePointerCapture?.(ev.pointerId); } catch {}
      pointerIdRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // Handle keyboard interaction for accessibility
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange?.(Math.max(min, value - step));
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange?.(Math.min(max, value + step));
    if (e.key === "Home") onChange?.(min);
    if (e.key === "End") onChange?.(max);
  };

  const angle = valueToAngle(value); // Current needle angle
  const radius = size / 2;           // Dial radius
  const needleLen = radius * 0.72;  // Needle length
  const isDanger = value > max * 0.8;

  return (
    <div style={{ width: size }} className="flex flex-col items-center">
      {/* Dial container */}
      <div
        ref={elRef}
        tabIndex={0}             // Make focusable for keyboard control
        role="slider"            // ARIA slider role for accessibility
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={handlePointerDown}
        onKeyDown={onKey}
        style={{ width: size, height: size, touchAction: "none", outline: "none" }}
        className="relative cursor-pointer select-none"
      >
        {/* Background circle */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle cx={radius} cy={radius} r={radius - 2} fill="#fff" stroke="#e5e7eb" strokeWidth={1} />
        </svg>

        {/* Needle */}
        <div
          className="absolute left-0 top-0 pointer-events-none"
          style={{
            width: size,
            height: size,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "50% 50%",
          }}
        >
          <div
      style={{
        width: 3,
        height: needleLen,
        borderRadius: 2,
        transformOrigin: "50% 90%",
        marginTop: size * 0.08,
        marginLeft: (size - 3) / 2,
    }}
    className={isDanger ? "bg-red-600" : "bg-blue-800"}
          />
        </div>
      </div>

      {label && <div className="text-xs mt-1">{label}: {value.toFixed(1)}</div>}
    </div>
  );
}
