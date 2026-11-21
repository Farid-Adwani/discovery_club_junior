import React, { useEffect, useId, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useT } from '../../i18n';
import { visitorMessages } from '../../i18n/messages/visitor';

// Animated robotics / electronics / mechanics illustrations for the landing page.
// Brand colors come from the logo: crimson #c11e3d, maroon #6a0d1f, charcoal #191919.

const CRIMSON = '#c11e3d';
const MAROON = '#6a0d1f';

/** SVG path for a spur gear with `teeth` teeth, a centre hole and round windows. */
function gearPath(teeth: number, outer: number, depth: number, hole: number, windows = 0) {
  const inner = outer - depth;
  const step = (Math.PI * 2) / teeth;
  const pt = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    d += `${i === 0 ? 'M' : 'L'}${pt(inner, a)} L${pt(outer, a + step * 0.2)} L${pt(outer, a + step * 0.5)} L${pt(inner, a + step * 0.7)} `;
  }
  d += 'Z ';
  const circle = (cx: number, cy: number, r: number) =>
    `M${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} Z `;
  d += circle(0, 0, hole);
  const winR = (inner + hole) / 2;
  const winSize = (inner - hole) * 0.28;
  for (let i = 0; i < windows; i++) {
    const a = (i / windows) * Math.PI * 2;
    d += circle(winR * Math.cos(a), winR * Math.sin(a), winSize);
  }
  return d;
}

/** A spinning gear. Meshing gears should use durations proportional to their tooth count. */
export const Gear: React.FC<{
  /** pixel size; omit to size the gear with className */
  size?: number;
  teeth: number;
  duration: number;
  reverse?: boolean;
  color?: string;
  windows?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ size, teeth, duration, reverse, color = CRIMSON, windows = 5, className, style }) => {
  const reduce = useReducedMotion();
  const r = 50;
  return (
    <motion.svg
      viewBox="-52 -52 104 104"
      width={size}
      height={size}
      className={className}
      style={style}
      animate={reduce ? undefined : { rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      aria-hidden="true"
    >
      <path d={gearPath(teeth, r, 7, 9, windows)} fill={color} fillRule="evenodd" />
      <circle r={4} fill="rgba(255,255,255,0.35)" />
    </motion.svg>
  );
};

/** Dark printed-circuit-board background with crimson signals racing along the traces. */
export const CircuitBackground: React.FC<{ className?: string }> = ({ className }) => {
  const traces = [
    'M0 80 H180 L220 120 H420 L460 80 H640',
    'M0 300 H120 L170 250 H360 L400 290 H560 L600 250 H760',
    'M1200 140 H1020 L980 180 H820 L780 140 H700',
    'M1200 420 H1060 L1010 470 H860 L820 430 H640 L600 470 H480',
    'M260 600 V520 L300 480 V380 L340 340 H480',
    'M900 0 V60 L940 100 V220 L980 260 H1100',
    'M60 600 V500 L100 460 H220',
    'M1140 600 V540 L1100 500 H960 L920 540 H820',
    'M520 0 V40 L560 80 H700 L740 40 H880'
  ];
  const vias = [
    [640, 80], [760, 250], [700, 140], [480, 470], [480, 340], [1100, 260], [220, 460], [820, 540], [880, 40],
    [180, 80], [420, 120], [360, 250], [980, 180], [860, 470], [300, 480], [940, 100]
  ];
  return (
    <svg className={className} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="pcb-dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.06)" />
        </pattern>
        <filter id="pcb-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="1200" height="600" fill="url(#pcb-dots)" />

      {/* copper traces */}
      {traces.map((d, i) => (
        <path key={`t${i}`} d={d} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      ))}
      {/* signals */}
      {traces.map((d, i) => (
        <path
          key={`p${i}`}
          d={d}
          pathLength={100}
          fill="none"
          stroke={i % 3 === 0 ? '#f6c4cd' : CRIMSON}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="pcb-signal"
          filter="url(#pcb-glow)"
          style={{ animationDuration: `${4 + (i % 4) * 1.3}s`, animationDelay: `${(i * 0.7) % 4}s` }}
        />
      ))}
      {/* vias / solder pads */}
      {vias.map(([x, y], i) => (
        <g key={`v${i}`}>
          <circle cx={x} cy={y} r="6" fill="#191919" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          <circle cx={x} cy={y} r="2" fill={i % 4 === 0 ? CRIMSON : 'rgba(255,255,255,0.25)'} className={i % 4 === 0 ? 'led-blink' : ''} style={{ animationDelay: `${i * 0.3}s` }} />
        </g>
      ))}
      {/* a few IC chips */}
      {[
        [520, 300, 90, 54],
        [1010, 330, 70, 44],
        [120, 160, 64, 40]
      ].map(([x, y, w, h], i) => (
        <g key={`c${i}`} opacity="0.55">
          {Array.from({ length: 6 }).map((_, k) => (
            <g key={k}>
              <rect x={x + 8 + k * ((w - 16) / 5) - 2} y={y - 8} width="4" height="8" fill="rgba(255,255,255,0.18)" />
              <rect x={x + 8 + k * ((w - 16) / 5) - 2} y={y + h} width="4" height="8" fill="rgba(255,255,255,0.18)" />
            </g>
          ))}
          <rect x={x} y={y} width={w} height={h} rx="4" fill="#111" stroke="rgba(255,255,255,0.12)" />
          <circle cx={x + 8} cy={y + 8} r="2.5" fill="rgba(255,255,255,0.2)" />
        </g>
      ))}
    </svg>
  );
};

/** The club logo mounted in a gear train with electronic parts orbiting around it. */
export const LogoMechanism: React.FC<{ logoSrc: string }> = ({ logoSrc }) => {
  const reduce = useReducedMotion();
  const t = useT(visitorMessages);
  return (
    <div className="relative mx-auto w-[300px] h-[300px] sm:w-[420px] sm:h-[420px]">
      {/* big ring gear (36 teeth) behind the logo */}
      <Gear teeth={36} duration={36} color="#2a2a2a" windows={0} className="absolute inset-0 w-full h-full" />
      {/* meshing gears: durations proportional to tooth count so the teeth stay in step */}
      <Gear
        teeth={14}
        duration={14}
        reverse
        color={CRIMSON}
        className="absolute -top-[6%] -right-[8%] w-[34%] h-[34%] drop-shadow-[0_0_18px_rgba(193,30,61,0.45)]"
      />
      <Gear
        teeth={10}
        duration={10}
        reverse
        color={MAROON}
        windows={4}
        className="absolute -bottom-[4%] -left-[6%] w-[25%] h-[25%]"
      />

      {/* orbit with electronic components (each part counter-rotates to stay upright) */}
      <motion.div
        className="absolute inset-[6%] rounded-full border border-dashed border-white/15"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {[
          { angle: 30, el: <LedPart /> },
          { angle: 150, el: <ResistorPart /> },
          { angle: 270, el: <ChipPart /> }
        ].map(({ angle, el }) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <motion.div
              key={angle}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + 50 * Math.cos(rad)}%`, top: `${50 + 50 * Math.sin(rad)}%` }}
              animate={reduce ? undefined : { rotate: -360 }}
              transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            >
              {el}
            </motion.div>
          );
        })}
      </motion.div>

      {/* the logo */}
      <div className="absolute inset-[22%] rounded-full bg-white shadow-[0_0_0_6px_rgba(193,30,61,0.25),0_0_60px_rgba(193,30,61,0.35)] overflow-hidden flex items-center justify-center">
        <motion.img
          src={logoSrc}
          alt={t('logoAlt')}
          className="w-[92%] h-[92%] object-contain"
          animate={reduce ? undefined : { scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <span className="absolute inset-[22%] rounded-full ring-2 ring-sky-500/60 animate-ping-slow pointer-events-none" />
    </div>
  );
};

const LedPart = () => (
  <svg width="34" height="48" viewBox="0 0 34 48" aria-hidden="true">
    <rect x="11" y="30" width="2.5" height="18" fill="#b0b0b0" />
    <rect x="20.5" y="30" width="2.5" height="14" fill="#b0b0b0" />
    <path d="M5 30 V15 a12 12 0 0 1 24 0 V30 Z" fill={CRIMSON} className="led-glow" />
    <rect x="3" y="28" width="28" height="4" rx="1" fill={MAROON} />
  </svg>
);

const ResistorPart = () => (
  <svg width="64" height="20" viewBox="0 0 64 20" aria-hidden="true">
    <rect x="0" y="9" width="64" height="2.5" fill="#b0b0b0" />
    <rect x="14" y="3" width="36" height="14" rx="6" fill="#e8d3b0" />
    <rect x="20" y="3" width="3.5" height="14" fill={CRIMSON} />
    <rect x="27" y="3" width="3.5" height="14" fill="#191919" />
    <rect x="34" y="3" width="3.5" height="14" fill={MAROON} />
    <rect x="42" y="3" width="3" height="14" fill="#c9a227" />
  </svg>
);

const ChipPart = () => (
  <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
    {[10, 18, 26, 34].map((p) => (
      <g key={p} fill="#b0b0b0">
        <rect x={p} y="0" width="3" height="7" />
        <rect x={p} y="39" width="3" height="7" />
        <rect x="0" y={p} width="7" height="3" />
        <rect x="39" y={p} width="7" height="3" />
      </g>
    ))}
    <rect x="6" y="6" width="34" height="34" rx="4" fill="#191919" stroke="#3d3d3d" />
    <circle cx="13" cy="13" r="2.5" fill={CRIMSON} className="led-blink" />
    <text x="23" y="29" textAnchor="middle" fontSize="8" fontWeight="800" fill="#888" fontFamily="monospace">
      MCU
    </text>
  </svg>
);

/** Oscilloscope screen with a scrolling waveform. */
export const Oscilloscope: React.FC<{ className?: string }> = ({ className }) => {
  const clipId = `osc-${useId().replace(/:/g, '')}`;
  // one period = 100 units; draw 10 periods and slide by one period forever (clipped to the screen)
  let d = 'M0 60';
  for (let x = 0; x <= 1000; x += 5) {
    const y = 60 - 26 * Math.sin((x / 100) * Math.PI * 2) - 8 * Math.sin((x / 25) * Math.PI * 2);
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return (
    <svg viewBox="0 0 300 120" className={className} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect width="300" height="120" rx="12" />
        </clipPath>
      </defs>
      <rect width="300" height="120" rx="12" fill="#0f0f0f" />
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="120" stroke="rgba(255,255,255,0.06)" />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 30} x2="300" y2={i * 30} stroke="rgba(255,255,255,0.06)" />
      ))}
      <g clipPath={`url(#${clipId})`}>
      <g className="osc-wave">
        <path d={d} fill="none" stroke={CRIMSON} strokeWidth="3" strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#f6c4cd" strokeWidth="1" strokeLinejoin="round" opacity="0.8" />
      </g>
      </g>
    </svg>
  );
};

/** Little terminal that types Arduino code line by line, then starts again. */
export const CodeTyper: React.FC<{ className?: string }> = ({ className }) => {
  const lines = ['void loop() {', '  int d = sonar.read();', '  if (d < 20) turnLeft();', '  else forward(255);', '}'];
  const [shown, setShown] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setShown(lines.length);
      return;
    }
    const t = setInterval(() => setShown((n) => (n >= lines.length + 2 ? 0 : n + 1)), 700);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div dir="ltr" className={`rounded-xl bg-[#0f0f0f] p-3 font-mono text-[11px] leading-relaxed text-slate-300 ${className || ''}`}>
      <div className="flex gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-sky-600" />
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="w-2 h-2 rounded-full bg-slate-500" />
      </div>
      {lines.map((l, i) => (
        <div key={i} className={i < shown ? 'opacity-100' : 'opacity-0'} style={{ transition: 'opacity .2s' }}>
          <span className="whitespace-pre">{l}</span>
          {i === Math.min(shown, lines.length) - 1 && <span className="inline-block w-1.5 h-3 bg-sky-500 ml-0.5 align-middle animate-pulse" />}
        </div>
      ))}
    </div>
  );
};

/** Counts up from 0 when it scrolls into view. */
export const CountUp: React.FC<{ to: number; suffix?: string; duration?: number; delay?: number }> = ({
  to,
  suffix = '',
  duration = 1.6,
  delay = 0
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / (duration * 1000)));
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration, delay]);
  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
};

/** Fades and slides its content in when scrolled into view. */
export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; y?: number }> = ({
  children,
  delay = 0,
  className,
  y = 40
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);
