import React from 'react';
import { Gear } from './RoboticsArt';

/**
 * The lab, drawn light: mechanics (gears, bolts), electronics (traces, chips, resistors, LEDs) and
 * programming (code). Used by the public page next to the notebook doodles of Decor.tsx.
 * Movement stays small (slow gears, blinking LEDs, signals along traces) and stops for reduced motion.
 */

const CRIMSON = '#c11e3d';
const INK = '#2b1a20';
const GOLD = '#e2a52c';

// ---------- small parts (doodles, ribbon separators) ----------

/** An integrated circuit with its pins */
export const ChipDoodle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={className} aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 12h3M2.5 15h3M18.5 9h3M18.5 12h3M18.5 15h3" />
  </svg>
);

/** A resistor between two wires */
export const ResistorDoodle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M1 8h6l2-5 3 10 3-10 3 10 3-10 2 5h8" />
  </svg>
);

/** An LED with its two legs; the bulb blinks */
export const LedDoodle: React.FC<{ className?: string; color?: string }> = ({ className, color = CRIMSON }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M7 11a5 5 0 0 1 10 0v5H7z" fill={color} className="led-blink" />
    <path d="M7 11a5 5 0 0 1 10 0v5H7z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5.5 16h13M10 16v6M14 16v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Code brackets */
export const CodeDoodle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" />
  </svg>
);

/** A hex nut */
export const BoltDoodle: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />
    <circle cx="12" cy="12" r="3.6" />
  </svg>
);

/** A cross-head screw, for the corners of "device" panels */
export const Screw: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`grid place-items-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-white to-[#e7d7db] ring-1 ring-[#cdb5bb] ${className}`} aria-hidden="true">
    <svg viewBox="0 0 10 10" className="w-2 h-2 text-[#9c8189]">
      <path d="M2 5h6M5 2v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  </span>
);

/** Four screws, one in each corner of a panel (the panel must be `relative`) */
export const PanelScrews: React.FC = () => (
  <>
    <Screw className="absolute top-3 start-3" />
    <Screw className="absolute top-3 end-3" />
    <Screw className="absolute bottom-3 start-3" />
    <Screw className="absolute bottom-3 end-3" />
  </>
);

// ---------- circuit traces behind a section ----------

/**
 * Printed-circuit traces coming in from the sides (the middle stays clear for the text),
 * with pads, a chip, a resistor and signals running along some traces.
 * `sides="end"` keeps only the traces of the end side (for a section whose text starts at the start side);
 * the drawing is mirrored on Arabic pages so "end" stays the end.
 */
export const CircuitTraces: React.FC<{ light?: boolean; sides?: 'both' | 'end'; className?: string }> = ({ light = false, sides = 'both', className = '' }) => {
  const both = sides === 'both';
  const line = light ? 'rgba(255,255,255,0.28)' : 'rgba(193,30,61,0.16)';
  const pad = light ? 'rgba(255,255,255,0.45)' : 'rgba(193,30,61,0.3)';
  const signal = light ? '#ffd27a' : CRIMSON;
  const traces = [
    'M0 90 H120 L160 130 H250',
    'M0 210 H70 L110 250 V330 L150 370 H210',
    'M0 470 H150 L190 430 H260',
    'M1200 120 H1080 L1040 160 H960',
    'M1200 300 H1110 L1070 260 H990',
    'M1200 460 H1060 L1020 500 V560'
  ];
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 w-full h-full rtl:-scale-x-100 ${className}`} aria-hidden="true">
      <g fill="none" stroke={line} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {traces.map((d, i) => (both || i >= 3 ? <path key={d} d={d} /> : null))}
      </g>
      {/* signals (two of the traces) */}
      <g fill="none" stroke={signal} strokeWidth="3" strokeLinecap="round">
        {both && <path d={traces[1]} pathLength={100} className="pcb-signal" />}
        <path d={traces[4]} pathLength={100} className="pcb-signal" style={{ animationDelay: '-2.5s' }} />
      </g>
      {/* pads at the ends */}
      <g fill={light ? 'transparent' : '#fffaf4'} stroke={pad} strokeWidth="2.5">
        {[
          [250, 130],
          [210, 370],
          [260, 430],
          [960, 160],
          [990, 260],
          [1020, 560]
        ]
          .filter(([x]) => both || x > 600)
          .map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="6" />
          ))}
      </g>
      {/* a chip on the left, a resistor on the right */}
      {both && (
        <g transform="translate(88 520)" stroke={line} strokeWidth="2.5" fill="none">
          <rect x="-26" y="-18" width="52" height="36" rx="5" />
          {[-14, 0, 14].map((x) => (
            <path key={x} d={`M${x} -18 v-9 M${x} 18 v9`} />
          ))}
        </g>
      )}
      <path d="M1120 40 h12 l5 -10 l8 20 l8 -20 l8 20 l5 -10 h14" stroke={line} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    </svg>
  );
};

// ---------- the four steps ----------

const panel = 'relative h-full w-full';

/** Build: three gears turning together */
export const MechanicsArt: React.FC = () => (
  <div className={panel}>
    <Gear size={78} teeth={14} duration={14} color={CRIMSON} windows={4} className="absolute left-[calc(50%-74px)] top-[14px]" />
    <Gear size={52} teeth={10} duration={10} reverse color={INK} windows={3} className="absolute left-[calc(50%+2px)] top-[8px]" />
    <Gear size={38} teeth={8} duration={8} color={GOLD} windows={0} className="absolute left-[calc(50%+34px)] top-[56px]" />
  </div>
);

/** Wire: a battery, a resistor and an LED that blinks, with the current running round */
export const ElectronicsArt: React.FC = () => (
  <svg viewBox="0 0 200 100" className={panel} aria-hidden="true">
    <path d="M40 30 H160 V75 H40 Z" fill="none" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" opacity="0.75" />
    <path d="M40 30 H160 V75 H40 Z" fill="none" stroke={CRIMSON} strokeWidth="3" strokeLinecap="round" pathLength={100} className="pcb-signal" />
    {/* battery */}
    <rect x="28" y="40" width="24" height="26" rx="4" fill="#fffaf4" stroke={INK} strokeWidth="2.5" />
    <path d="M36 47h8M40 43v8M36 60h8" stroke={CRIMSON} strokeWidth="2.2" strokeLinecap="round" />
    {/* resistor */}
    <rect x="82" y="24" width="36" height="12" rx="6" fill="#f3e4c9" stroke={INK} strokeWidth="2" />
    <path d="M91 24v12M99 24v12M107 24v12" stroke={CRIMSON} strokeWidth="2.5" />
    {/* LED */}
    <circle cx="160" cy="52" r="15" fill={CRIMSON} className="led-glow" opacity="0.9" />
    <path d="M150 58a10 10 0 0 1 20 0v6h-20z" fill="#fffaf4" stroke={INK} strokeWidth="2" />
    <circle cx="160" cy="52" r="7" fill="#ff8aa0" className="led-blink" />
  </svg>
);

/** Code: a little light editor with a blinking cursor */
export const CodeArt: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`${panel} rounded-xl bg-white/90 ring-1 ring-black/5 px-3 py-2 text-start font-mono text-[11px] leading-[1.55] ${className}`} dir="ltr">
    <div className="flex gap-1 mb-1.5" aria-hidden="true">
      <span className="w-2 h-2 rounded-full bg-[#ff6b81]" />
      <span className="w-2 h-2 rounded-full bg-[#ffd27a]" />
      <span className="w-2 h-2 rounded-full bg-[#7bd88f]" />
    </div>
    <div>
      <span className="text-[#a1172f]">void</span> <span className="text-[#2563eb]">loop</span>() {'{'}
    </div>
    <div className="ps-3">
      <span className="text-[#a1172f]">if</span> (distance() &lt; <span className="text-[#b45309]">20</span>)
    </div>
    <div className="ps-6">
      <span className="text-[#2563eb]">turnLeft</span>();
    </div>
    <div className="ps-3">
      <span className="text-[#a1172f]">else</span> <span className="text-[#2563eb]">forward</span>(<span className="text-[#b45309]">255</span>);
      <span className="inline-block w-[7px] h-[13px] -mb-0.5 ms-0.5 bg-brand led-blink" aria-hidden="true" />
    </div>
    <div>{'}'}</div>
  </div>
);

/** Compete: a podium with the trophy on top */
export const CompeteArt: React.FC = () => (
  <svg viewBox="0 0 200 100" className={panel} aria-hidden="true">
    <rect x="45" y="62" width="36" height="30" rx="4" fill="#fffaf4" stroke={INK} strokeWidth="2.2" />
    <rect x="82" y="46" width="36" height="46" rx="4" fill={CRIMSON} />
    <rect x="119" y="70" width="36" height="22" rx="4" fill="#fffaf4" stroke={INK} strokeWidth="2.2" />
    <text x="63" y="82" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK} fontFamily="monospace">2</text>
    <text x="100" y="74" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="monospace">1</text>
    <text x="137" y="86" textAnchor="middle" fontSize="12" fontWeight="700" fill={INK} fontFamily="monospace">3</text>
    {/* trophy */}
    <path d="M90 14h20v10a10 10 0 0 1-20 0z" fill={GOLD} />
    <path d="M90 17h-6a6 6 0 0 0 6 8M110 17h6a6 6 0 0 1-6 8" fill="none" stroke={GOLD} strokeWidth="2.5" />
    <rect x="97" y="33" width="6" height="7" fill={GOLD} />
    <rect x="92" y="39" width="16" height="4" rx="1.5" fill={INK} />
    <path d="M60 30l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z M146 22l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill={GOLD} className="led-blink" />
  </svg>
);

// ---------- the mascot ----------

/** The club robot (the one of the default class picture), waving */
export const RobotMascot: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="-130 -160 260 300" className={className} aria-hidden="true">
    <line x1="0" y1="-128" x2="0" y2="-98" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
    <circle cx="0" cy="-134" r="12" fill="#e2a52c" className="led-blink" />
    <rect x="-90" y="-100" width="180" height="130" rx="34" fill="#fff" />
    <rect x="-66" y="-76" width="132" height="70" rx="22" fill="#191919" />
    <g className="robot-blink">
      <circle cx="-30" cy="-41" r="14" fill="#5eead4" />
      <circle cx="30" cy="-41" r="14" fill="#5eead4" />
    </g>
    <path d="M-20 4 q20 14 40 0" stroke="#c11e3d" strokeWidth="7" strokeLinecap="round" fill="none" />
    <rect x="-110" y="-60" width="20" height="50" rx="10" fill="#fff" opacity="0.9" />
    {/* the waving arm */}
    <g className="robot-wave">
      <rect x="90" y="-92" width="20" height="58" rx="10" fill="#fff" opacity="0.95" />
    </g>
    <rect x="-70" y="40" width="140" height="70" rx="22" fill="#fff" opacity="0.92" />
    <circle cx="-40" cy="122" r="18" fill="#191919" />
    <circle cx="40" cy="122" r="18" fill="#191919" />
    <circle cx="-40" cy="122" r="7" fill="#e2a52c" />
    <circle cx="40" cy="122" r="7" fill="#e2a52c" />
  </svg>
);
