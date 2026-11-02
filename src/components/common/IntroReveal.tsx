import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CLUB_PHOTOS } from '../../data/initialData';
import { Gear, Oscilloscope } from '../visitor/RoboticsArt';
import { useT } from '../../i18n';
import { commonMessages } from '../../i18n/messages/common';
import { siteMessages } from '../../i18n/messages/site';

// Start-up "boot sequence" in scenes: mechanics → electronics → coding → robotics,
// then the logo assembles and the screen splits open like two doors.
// About 2.5 s, once per browser session; skipped with a click, the Skip button or Escape,
// and never shown to visitors who ask their device for reduced motion.

const CRIMSON = '#c11e3d';

/** Scene timeline, in seconds from page load. */
const T = {
  mechanics: 0.15,
  electronics: 0.55,
  coding: 0.95,
  robotics: 1.35,
  logo: 1.75,
  open: 2.5,
  done: 3.1
};

const MODULES = [
  { key: 'mechanics', label: 'modMechanics' },
  { key: 'electronics', label: 'modElectronics' },
  { key: 'coding', label: 'modCoding' },
  { key: 'robotics', label: 'modRobotics' }
] as const;

type ModuleKey = (typeof MODULES)[number]['key'];
type Phase = 'boot' | ModuleKey | 'logo' | 'open';

function shouldPlayIntro(): boolean {
  try {
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

const SEEN_KEY = 'dcj-intro-seen';
const seenThisSession = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

// Plays once per visit (browser session) when it starts on the home page (App only mounts it there);
// coming back, refreshing or opening another page of the site doesn't replay it
const PLAY = typeof window !== 'undefined' && shouldPlayIntro() && !seenThisSession();

let alreadyPlayed = false;

// The doors have opened (or will never play): the page can run its own entrance animations
let opened = !PLAY;
const openListeners = new Set<() => void>();
const markOpened = () => {
  if (opened) return;
  opened = true;
  openListeners.forEach((fn) => fn());
};

/**
 * True once the intro is out of the way. Pages wait for it before their entrance animations,
 * so skipping the intro shows the page straight away instead of after the full timeline.
 */
export function useIntroOpened(): boolean {
  const [isOpen, setIsOpen] = useState(opened);
  useEffect(() => {
    if (opened) {
      setIsOpen(true);
      return;
    }
    const fn = () => setIsOpen(true);
    openListeners.add(fn);
    return () => {
      openListeners.delete(fn);
    };
  }, []);
  return isOpen;
}

const TRACES = [
  'M0 120 H260 L330 190 H600',
  'M1200 160 H930 L870 220 H600',
  'M0 520 H220 L300 440 H520 L600 360',
  'M1200 470 H1000 L920 390 H700 L600 360',
  'M600 0 V120 L560 160 V300',
  'M600 720 V600 L640 560 V420',
  'M0 300 H140 L180 340 H330',
  'M1200 600 H1060 L1020 640 H860'
];

const NAME = 'DISCOVERY CLUB JUNIOR';

/* ---------------- 3D helpers ---------------- */

const sceneMotion = {
  initial: { opacity: 0, scale: 0.6, filter: 'blur(12px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 1.25, filter: 'blur(10px)' },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
};

const preserve3d: React.CSSProperties = { transformStyle: 'preserve-3d' };

/**
 * Gives flat artwork real thickness: renders it several times, each copy pushed further back.
 * `render(k)` gets 0 for the front face and higher numbers for the deeper layers.
 */
const Extrude: React.FC<{ depth?: number; layers?: number; render: (k: number) => React.ReactNode; className?: string }> = ({
  depth = 16,
  layers = 7,
  render,
  className
}) => (
  <div className={`relative ${className || ''}`} style={preserve3d}>
    {Array.from({ length: layers }).map((_, i) => {
      const k = layers - 1 - i; // draw back layers first
      return (
        <div
          key={k}
          className={k === 0 ? 'relative' : 'absolute inset-0'}
          style={{ transform: `translateZ(${(-k * depth) / (layers - 1)}px)` }}
        >
          {render(k)}
        </div>
      );
    })}
  </div>
);

/** A solid block (chip, capacitor base…) standing on a 3D surface. */
const Block: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  height: number;
  side?: string;
  top?: React.ReactNode;
  topClass?: string;
  round?: boolean;
}> = ({ x, y, w, h, height, side = '#0b0b0b', top, topClass = '', round }) => (
  <div className="absolute" style={{ left: x, top: y, width: w, height: h, ...preserve3d }}>
    {Array.from({ length: Math.max(2, Math.round(height / 2)) }).map((_, i) => (
      <div
        key={i}
        className={`absolute inset-0 ${round ? 'rounded-full' : 'rounded-[4px]'}`}
        style={{ background: side, transform: `translateZ(${i * 2}px)` }}
      />
    ))}
    <div
      className={`absolute inset-0 flex items-center justify-center ${round ? 'rounded-full' : 'rounded-[4px]'} ${topClass}`}
      style={{ transform: `translateZ(${height}px)` }}
    >
      {top}
    </div>
  </div>
);

/* ---------------- scenes ---------------- */

/** Thick 3D gears turning in space, driving a crank and piston. */
const MechanicsScene = () => {
  const gears = [
    { size: 170, teeth: 20, duration: 2, reverse: false, front: CRIMSON, back: '#5a0c1b', left: 20, top: 34, windows: 5 },
    { size: 108, teeth: 12, duration: 1.2, reverse: true, front: '#e7e7e7', back: '#6d6d6d', left: 172, top: 10, windows: 4 },
    { size: 76, teeth: 8, duration: 0.8, reverse: false, front: '#5a5a5a', back: '#222', left: 176, top: 126, windows: 3 }
  ];
  return (
    <div style={{ perspective: '900px' }}>
      <motion.div
        className="relative w-[340px] h-[240px]"
        style={preserve3d}
        initial={{ rotateY: -40, rotateX: 25 }}
        animate={{ rotateY: [-40, 22], rotateX: [25, 12] }}
        transition={{ duration: 1.1, ease: 'easeInOut' }}
      >
        {gears.map((g) => (
          <div key={g.teeth} className="absolute" style={{ left: g.left, top: g.top, ...preserve3d }}>
            <Extrude
              depth={18}
              layers={8}
              render={(k) => (
                <Gear
                  size={g.size}
                  teeth={g.teeth}
                  duration={g.duration}
                  reverse={g.reverse}
                  windows={g.windows}
                  color={k === 0 ? g.front : g.back}
                  className={k === 0 && g.front === CRIMSON ? 'drop-shadow-[0_0_24px_rgba(193,30,61,0.55)]' : ''}
                />
              )}
            />
          </div>
        ))}
        {/* crank + piston driven by the small gear */}
        <svg className="absolute left-[236px] top-[120px] w-[110px] h-[100px]" viewBox="0 0 110 100" aria-hidden="true" style={{ transform: 'translateZ(20px)' }}>
          <rect x="62" y="10" width="34" height="80" rx="6" fill="rgba(20,20,20,0.6)" stroke="#5a5a5a" strokeWidth="3" />
          <motion.rect x="66" width="26" height="22" rx="4" fill={CRIMSON} initial={{ y: 14 }} animate={{ y: [14, 64, 14] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.line x1="18" y1="44" x2="79" stroke="#b0b0b0" strokeWidth="4" strokeLinecap="round" initial={{ y2: 25 }} animate={{ y2: [25, 75, 25] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} />
        </svg>
      </motion.div>
    </div>
  );
};

/** Tilted 3D circuit board: raised ESP32 chip, standing LEDs and capacitors, signals on the traces. */
const ElectronicsScene = () => {
  const traces = [
    'M130 95 H40 L20 75', 'M130 125 H60 L40 145 H10', 'M210 95 H290 L320 65', 'M210 125 H300 L320 145',
    'M150 80 V40 L170 20 H230', 'M190 140 V185 L210 205', 'M40 75 V30', 'M300 145 V195'
  ];
  const leds = [
    [32, 22], [92, 22], [300, 192], [240, 192], [12, 150], [322, 58]
  ];
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-2">
      <div style={{ perspective: '1000px' }} className="w-[380px] h-[280px] flex items-center justify-center">
        <motion.div
          className="relative w-[340px] h-[220px]"
          style={preserve3d}
          initial={{ rotateX: 62, rotateZ: -52, scale: 0.8 }}
          animate={{ rotateX: [62, 54], rotateZ: [-52, -30], scale: [0.8, 1] }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        >
          {/* board thickness */}
          {Array.from({ length: 6 }).map((_, k) => (
            <div key={k} className="absolute inset-0 rounded-xl" style={{ background: k === 5 ? '#3a0912' : '#0b0b0b', transform: `translateZ(${-(k + 1) * 2}px)` }} />
          ))}
          {/* board surface */}
          <div className="absolute inset-0 rounded-xl bg-[#1a1a1a] border border-sky-900/60 shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden">
            <svg viewBox="0 0 340 220" className="w-full h-full" aria-hidden="true">
              <pattern id="board-dots" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.8" fill="rgba(255,255,255,0.08)" />
              </pattern>
              <rect width="340" height="220" fill="url(#board-dots)" />
              {traces.map((d, i) => (
                <g key={i}>
                  <path d={d} fill="none" stroke="rgba(193,30,61,0.35)" strokeWidth="3" />
                  <path
                    d={d}
                    pathLength={100}
                    fill="none"
                    stroke="#ff6f8a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="pcb-signal"
                    style={{ animationDuration: '0.9s', animationDelay: `${i * 0.11}s`, filter: 'drop-shadow(0 0 5px #ff5a78)' }}
                  />
                </g>
              ))}
              {/* chip pins */}
              {Array.from({ length: 7 }).map((_, k) => (
                <g key={k} fill="#9a9a9a">
                  <rect x={140 + k * 10} y="74" width="4" height="10" />
                  <rect x={140 + k * 10} y="136" width="4" height="10" />
                </g>
              ))}
              {/* solder pads */}
              {[[20, 75], [10, 145], [320, 65], [320, 145], [230, 20], [210, 205], [40, 30], [300, 195]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="5" fill="#c9a227" opacity="0.85" />
              ))}
            </svg>
          </div>
          {/* raised chip */}
          <Block
            x={130}
            y={82}
            w={80}
            h={56}
            height={16}
            side="#080808"
            topClass="bg-[#141414] border border-white/15"
            top={
              <motion.span
                className="font-mono text-[13px] font-black text-white/85"
                animate={{ textShadow: ['0 0 0px #ff5a78', '0 0 10px #ff5a78', '0 0 0px #ff5a78'] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                ESP32
              </motion.span>
            }
          />
          {/* capacitors */}
          <Block x={250} y={30} w={26} h={26} height={30} round side="#1f3b6b" topClass="bg-[#c9c9c9]" />
          <Block x={60} y={160} w={22} h={22} height={24} round side="#1f3b6b" topClass="bg-[#c9c9c9]" />
          {/* LEDs standing on the board */}
          {leds.map(([x, y], i) => (
            <Block
              key={i}
              x={x - 7}
              y={y - 7}
              w={14}
              h={14}
              height={14}
              round
              side="#5a0c1b"
              topClass="bg-sky-500 led-chase shadow-[0_0_16px_6px_rgba(255,90,120,0.8)]"
              top={<span className="sr-only">led</span>}
            />
          ))}
        </motion.div>
      </div>
      {/* floating oscilloscope */}
      <div style={{ perspective: '800px' }}>
        <motion.div
          initial={{ rotateY: -50, x: 60, opacity: 0 }}
          animate={{ rotateY: -22, x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-2xl p-2 bg-[#222] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(193,30,61,0.25)]"
        >
          <Oscilloscope className="w-[230px] h-[92px] block" />
          <div className="flex justify-between px-1 pt-1.5 font-mono text-[9px] text-white/45">
            <span>CH1 · 5V/div</span>
            <span className="text-sky-500">● LIVE</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/** Terminal angled in 3D, with code symbols floating at different depths. */
const CODE_LINES: { t: string; c: string }[][] = [
  [{ t: '#include ', c: 'text-sky-400' }, { t: '<Servo.h>', c: 'text-amber-300' }],
  [{ t: 'void ', c: 'text-sky-400' }, { t: 'loop', c: 'text-white' }, { t: '() {', c: 'text-white/70' }],
  [{ t: '  int ', c: 'text-sky-400' }, { t: 'dist = sonar.', c: 'text-white' }, { t: 'read', c: 'text-amber-300' }, { t: '();', c: 'text-white/70' }],
  [
    { t: '  if ', c: 'text-sky-400' },
    { t: '(dist < ', c: 'text-white' },
    { t: '20', c: 'text-amber-300' },
    { t: ') arm.', c: 'text-white' },
    { t: 'grab', c: 'text-amber-300' },
    { t: '();', c: 'text-white/70' }
  ],
  [{ t: '  motors.', c: 'text-white' }, { t: 'forward', c: 'text-amber-300' }, { t: '(', c: 'text-white/70' }, { t: '255', c: 'text-amber-300' }, { t: ');', c: 'text-white/70' }],
  [{ t: '}', c: 'text-white/70' }]
];

const FLOATING_GLYPHS = [
  { g: '{ }', x: -70, y: -40, z: 140, size: 'text-4xl' },
  { g: '</>', x: 380, y: -20, z: 90, size: 'text-3xl' },
  { g: '01', x: -40, y: 190, z: 60, size: 'text-2xl' },
  { g: ';', x: 410, y: 170, z: 160, size: 'text-5xl' },
  { g: '()', x: 180, y: -70, z: 200, size: 'text-3xl' }
];

const CodingScene = () => {
  let charIndex = 0;
  return (
    <div dir="ltr" style={{ perspective: '1000px' }}>
      <motion.div
        className="relative"
        style={preserve3d}
        initial={{ rotateY: 40, rotateX: 18 }}
        animate={{ rotateY: [40, -16], rotateX: [18, 6] }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      >
        {/* window thickness */}
        <div className="absolute inset-0 rounded-2xl bg-sky-950" style={{ transform: 'translateZ(-14px)' }} />
        <div className="absolute inset-0 rounded-2xl bg-[#050505]" style={{ transform: 'translateZ(-7px)' }} />
        <div className="relative w-[400px] rounded-2xl bg-[#0b0b0b] border border-white/10 shadow-[0_0_60px_rgba(193,30,61,0.35)] overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/30" />
            <span className="ml-3 text-[10px] font-mono text-white/40">rover.ino</span>
          </div>
          <div className="p-4 font-mono text-[13px] leading-6">
            {CODE_LINES.map((line, li) => (
              <div key={li} className="whitespace-pre">
                {line.map((tok, ti) => (
                  <span key={ti} className={tok.c}>
                    {tok.t.split('').map((ch, ci) => {
                      const delay = 0.15 + charIndex++ * 0.0085;
                      return (
                        <motion.span key={ci} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.01 }}>
                          {ch}
                        </motion.span>
                      );
                    })}
                  </span>
                ))}
              </div>
            ))}
            <span className="inline-block w-2 h-4 bg-sky-500 animate-pulse align-middle" />
          </div>
        </div>
        {FLOATING_GLYPHS.map((f, i) => (
          <motion.span
            key={f.g}
            className={`absolute font-mono font-black text-sky-500 ${f.size} drop-shadow-[0_0_14px_rgba(193,30,61,0.9)]`}
            style={{ left: f.x, top: f.y, z: f.z }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1], y: [10, -8, 10] }}
            transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeInOut' }}
          >
            {f.g}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};

/** A small robot rover drives in, blinks and waves, swaying in 3D above its shadow. */
const RoboticsScene = () => (
  <div style={{ perspective: '900px' }} className="relative">
    {/* shadow on the floor */}
    <motion.div
      className="absolute left-1/2 bottom-[6px] -translate-x-1/2 w-[220px] h-[34px] rounded-[50%] bg-black/70 blur-md"
      initial={{ opacity: 0, scaleX: 0.4 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.5 }}
    />
    <motion.div
      style={preserve3d}
      initial={{ rotateY: 55, x: -260 }}
      animate={{ rotateY: [55, -18, 12], x: [-260, 0, 0] }}
      transition={{ duration: 1.1, times: [0, 0.5, 1], ease: 'easeOut' }}
    >
      {/* back plate gives the robot some depth */}
      <svg width="320" height="260" viewBox="0 0 320 260" className="absolute inset-0" style={{ transform: 'translateZ(-16px)' }} aria-hidden="true">
        <rect x="110" y="40" width="100" height="66" rx="18" fill="#6d6d6d" />
        <rect x="96" y="112" width="128" height="80" rx="16" fill="#1f1f1f" />
      </svg>
      <svg width="320" height="260" viewBox="0 0 320 260" className="relative" aria-hidden="true">
        {/* antenna */}
        <line x1="160" y1="40" x2="160" y2="14" stroke="#b0b0b0" strokeWidth="4" />
        <circle cx="160" cy="12" r="7" fill={CRIMSON} className="led-blink" style={{ animationDuration: '0.4s' }} />
        {/* head */}
        <rect x="110" y="40" width="100" height="66" rx="18" fill="#e7e7e7" />
        <rect x="122" y="52" width="76" height="40" rx="12" fill="#141414" />
        <motion.g animate={{ scaleY: [1, 1, 0.1, 1] }} transition={{ duration: 1, times: [0, 0.6, 0.7, 0.8], repeat: Infinity }} style={{ originX: 0.5, originY: 0.5 }}>
          <circle cx="142" cy="72" r="8" fill={CRIMSON} style={{ filter: 'drop-shadow(0 0 6px #ff5a78)' }} />
          <circle cx="178" cy="72" r="8" fill={CRIMSON} style={{ filter: 'drop-shadow(0 0 6px #ff5a78)' }} />
        </motion.g>
        {/* body */}
        <rect x="96" y="112" width="128" height="80" rx="16" fill="#3d3d3d" />
        <rect x="118" y="128" width="84" height="12" rx="6" fill={CRIMSON} />
        {[0, 1, 2].map((k) => (
          <circle key={k} cx={134 + k * 26} cy="164" r="7" fill="#141414" stroke="#888" strokeWidth="2" className="led-chase" style={{ animationDuration: '0.6s', animationDelay: `${k * 0.2}s` }} />
        ))}
        {/* waving arm */}
        <motion.g animate={{ rotate: [0, -38, 0, -38, 0] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }} style={{ originX: 0, originY: 0.5 }}>
          <rect x="224" y="118" width="58" height="14" rx="7" fill="#b0b0b0" />
          <path d="M282 112 l14 -8 M282 138 l14 8" stroke="#e7e7e7" strokeWidth="5" strokeLinecap="round" />
        </motion.g>
        <rect x="44" y="118" width="54" height="14" rx="7" fill="#b0b0b0" />
        {/* wheels */}
        {[124, 196].map((cx) => (
          <motion.g key={cx} animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }} style={{ originX: 0.5, originY: 0.5 }}>
            <circle cx={cx} cy="214" r="26" fill="#141414" stroke="#4f4f4f" strokeWidth="6" />
            <path d={`M${cx - 18} 214 H${cx + 18} M${cx} 196 V232`} stroke={CRIMSON} strokeWidth="4" />
          </motion.g>
        ))}
        {/* speed lines */}
        {[0, 1, 2].map((k) => (
          <motion.line
            key={k}
            y1={150 + k * 22}
            y2={150 + k * 22}
            stroke="rgba(193,30,61,0.7)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ x1: 40, x2: 80 }}
            animate={{ x1: [40, 0], x2: [80, 30], opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, delay: k * 0.12 }}
          />
        ))}
      </svg>
    </motion.div>
  </div>
);

const SCENES: Record<ModuleKey, React.FC> = {
  mechanics: MechanicsScene,
  electronics: ElectronicsScene,
  coding: CodingScene,
  robotics: RoboticsScene
};

/* ---------------- intro ---------------- */

export const IntroReveal: React.FC = () => {
  const t = useT(commonMessages);
  const ts = useT(siteMessages);
  const [visible, setVisible] = useState(PLAY && !alreadyPlayed);
  const [phase, setPhase] = useState<Phase>('boot');
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!visible) return;
    alreadyPlayed = true;
    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // storage blocked: it may play again on the next load
    }
    const timers = [
      setTimeout(() => setPhase('mechanics'), T.mechanics * 1000),
      setTimeout(() => setPhase('electronics'), T.electronics * 1000),
      setTimeout(() => setPhase('coding'), T.coding * 1000),
      setTimeout(() => setPhase('robotics'), T.robotics * 1000),
      setTimeout(() => setPhase('logo'), T.logo * 1000),
      setTimeout(() => setPhase('open'), T.open * 1000),
      setTimeout(() => setVisible(false), T.done * 1000)
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const p = Math.max(0, Math.min(100, Math.round(((now - start) / (T.open * 1000)) * 100)));
      setPercent(p);
      if (p < 100) frame = requestAnimationFrame(tick);
    });
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      markOpened(); // left the home page mid-intro: never keep the page waiting
    };
  }, []);

  useEffect(() => {
    if (phase === 'open') markOpened();
  }, [phase]);

  function skip() {
    setPhase('open');
    setTimeout(() => setVisible(false), 600);
  }

  const opening = phase === 'open';
  const sceneIndex = MODULES.findIndex((m) => m.key === phase);
  const loadedCount = phase === 'logo' || opening ? MODULES.length : Math.max(0, sceneIndex);
  const Scene = sceneIndex >= 0 ? SCENES[MODULES[sceneIndex].key] : null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div key="intro" className="fixed inset-0 z-[100] cursor-pointer select-none" onClick={skip} exit={{ opacity: 0 }}>
          {/* the two doors */}
          {(['top', 'bottom'] as const).map((side) => (
            <motion.div
              key={side}
              aria-hidden="true"
              className={`absolute left-0 right-0 h-1/2 bg-[#141414] ${side === 'top' ? 'top-0' : 'bottom-0'}`}
              animate={opening ? { y: side === 'top' ? '-100%' : '100%' } : { y: 0 }}
              transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
            >
              <motion.div
                className={`absolute left-0 right-0 h-[2px] bg-sky-600 shadow-[0_0_18px_4px_rgba(193,30,61,0.7)] ${side === 'top' ? 'bottom-0' : 'top-0'}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: phase === 'logo' || opening ? 1 : 0 }}
                transition={{ delay: phase === 'logo' ? 0.45 : 0, duration: 0.3, ease: 'easeOut' }}
              />
            </motion.div>
          ))}

          <motion.div
            className="absolute inset-0 overflow-hidden"
            aria-hidden="true"
            animate={opening ? { opacity: 0, scale: 1.08 } : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* circuit traces drawing in from the edges */}
            <svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice">
              {TRACES.map((d, i) => (
                <g key={i}>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke="rgba(193,30,61,0.55)"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: i * 0.07, ease: 'easeInOut' }}
                  />
                  <path
                    d={d}
                    pathLength={100}
                    fill="none"
                    stroke="#ff8aa0"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="pcb-signal"
                    style={{
                      animationDuration: `${1.4 + (i % 3) * 0.4}s`,
                      animationDelay: `${0.8 + i * 0.15}s`,
                      filter: 'drop-shadow(0 0 6px rgba(193,30,61,0.9))'
                    }}
                  />
                </g>
              ))}
            </svg>

            {/* 3D grid floor racing toward the viewer, with a glowing horizon */}
            <div className="absolute left-[-50%] w-[200%] bottom-0 h-[34%] grid-floor pointer-events-none" />
            <div className="absolute left-0 right-0 bottom-[34%] h-[2px] bg-gradient-to-r from-transparent via-sky-600/80 to-transparent shadow-[0_0_40px_8px_rgba(193,30,61,0.35)] pointer-events-none" />

            {/* HUD corners */}
            <div className="absolute top-5 start-6 font-mono text-[10px] sm:text-xs text-white/40 tracking-widest">DCJ-OS v26 · ROBOTICS LAB</div>
            <div className="absolute top-5 end-6 font-mono text-[10px] sm:text-xs text-sky-500 tracking-widest">{percent}%</div>

            {/* stage */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence>
                {Scene && (
                  <motion.div key={phase} className="absolute flex flex-col items-center gap-6" {...sceneMotion}>
                    {/* giant outlined word drifting behind the scene */}
                    <motion.div
                      className="absolute -z-10 top-1/2 -translate-y-1/2 text-[18vw] sm:text-[12vw] font-black tracking-tighter text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.1)] whitespace-nowrap"
                      initial={{ x: 80 }}
                      animate={{ x: -80 }}
                      transition={{ duration: 1.3, ease: 'linear' }}
                    >
                      {t(MODULES[sceneIndex].label).toUpperCase()}
                    </motion.div>
                    <div className="scale-[0.6] sm:scale-100">
                      <Scene />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-black text-sky-500">0{sceneIndex + 1}</span>
                      <span className="w-8 h-px bg-white/30" />
                      <motion.span
                        className="text-xl sm:text-3xl font-black text-white"
                        initial={{ letterSpacing: '0.6em', opacity: 0 }}
                        animate={{ letterSpacing: '0.25em', opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        {t(MODULES[sceneIndex].label).toUpperCase()}
                      </motion.span>
                    </div>
                  </motion.div>
                )}

                {(phase === 'logo' || opening) && (
                  <motion.div key="logo" className="absolute flex flex-col items-center gap-6" {...sceneMotion}>
                    <div className="relative w-44 h-44 sm:w-56 sm:h-56">
                      <motion.div
                        className="absolute inset-0"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Gear teeth={24} duration={5} color="#2a2a2a" windows={0} className="w-full h-full" />
                      </motion.div>
                      <div className="absolute inset-[16%]" style={{ perspective: '700px' }}>
                        <motion.div
                          className="relative w-full h-full"
                          style={preserve3d}
                          initial={{ rotateY: -540, scale: 0 }}
                          animate={{ rotateY: 0, scale: 1 }}
                          transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                        >
                          {/* coin edge */}
                          {Array.from({ length: 8 }).map((_, k) => (
                            <div
                              key={k}
                              className="absolute inset-0 rounded-full"
                              style={{ background: k % 2 ? '#a1172f' : '#861529', transform: `translateZ(${-(k + 1) * 1.5}px)` }}
                            />
                          ))}
                          <div className="absolute inset-0 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-[0_0_0_5px_rgba(193,30,61,0.35),0_0_70px_rgba(193,30,61,0.6)]">
                            <img src={CLUB_PHOTOS.clubLogo} alt="" className="w-[90%] h-[90%] object-contain" />
                          </div>
                        </motion.div>
                      </div>
                      {/* the four modules snapping into the logo */}
                      {MODULES.map((m, i) => {
                        const a = (i / MODULES.length) * Math.PI * 2 - Math.PI / 4;
                        return (
                          <motion.span
                            key={m.key}
                            className="absolute left-1/2 top-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-sky-500 shadow-[0_0_12px_#ff5a78]"
                            initial={{ x: Math.cos(a) * 260, y: Math.sin(a) * 260, opacity: 1 }}
                            animate={{ x: 0, y: 0, opacity: 0 }}
                            transition={{ duration: 0.4, delay: i * 0.04, ease: 'easeIn' }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex text-white text-lg sm:text-3xl font-black tracking-[0.3em]">
                      {NAME.split('').map((ch, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.015, duration: 0.2 }}
                          className={ch === ' ' ? 'w-3' : ''}
                        >
                          {ch}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* module loader */}
            <div className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 w-[min(560px,88vw)] space-y-2.5">
              <div className="flex justify-between gap-2">
                {MODULES.map((m, i) => {
                  const loaded = i < loadedCount;
                  const active = i === sceneIndex;
                  return (
                    <span
                      key={m.key}
                      className={`font-mono text-[9px] sm:text-[11px] tracking-widest transition-colors duration-300 ${
                        active ? 'text-white' : loaded ? 'text-sky-500' : 'text-white/25'
                      }`}
                    >
                      {loaded ? '✓ ' : active ? '▸ ' : '· '}
                      {t(m.label).toUpperCase()}
                    </span>
                  );
                })}
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-sky-600 shadow-[0_0_10px_rgba(193,30,61,0.9)]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          </motion.div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              skip();
            }}
            aria-label={ts('skipIntro')}
            className={`absolute bottom-5 end-6 font-mono text-[10px] sm:text-xs text-white/70 hover:text-white tracking-widest border border-white/25 hover:border-white/50 rounded-full px-3 py-1.5 cursor-pointer transition-opacity ${opening ? 'opacity-0' : ''}`}
          >
            {t('skip')} <span className="inline-block rtl:rotate-180" aria-hidden="true">›</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
