import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, Bot, ChevronUp, Lock, Play, Repeat, RotateCcw, RotateCw, Square, Star, Trash2, UserPlus, X, Zap } from 'lucide-react';
import { useT } from '../../i18n';
import { gameMessages } from '../../i18n/messages/game';
import {
  LEVELS,
  cellKey,
  countBlocks,
  parseLevel,
  starsFor,
  stepRobot,
  unroll,
  type Block,
  type BlockKind,
  type Outcome,
  type Robot
} from './robotGame';

const STEP_MS = 420;
// Space between the squares (Tailwind gap-1); the robot is placed with it in mind
const GAP_PX = 4;
const cellSize = (count: number) => `((100% - ${GAP_PX * (count - 1)}px) / ${count})`;
const SAVE_KEY = 'discovery.robotGame.v1';

const BLOCK_STYLE: Record<BlockKind, { icon: React.ElementType; cls: string }> = {
  fwd: { icon: ArrowUp, cls: 'bg-[#c11e3d] text-white border-b-[#861529]' },
  left: { icon: RotateCcw, cls: 'bg-[#191919] text-white border-b-black' },
  right: { icon: RotateCw, cls: 'bg-[#191919] text-white border-b-black' },
  repeat: { icon: Repeat, cls: 'bg-amber-400 text-amber-950 border-b-amber-600' }
};

type Progress = { unlocked: number; stars: number[] };
const loadProgress = (): Progress => {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE_KEY) || '');
    if (typeof p?.unlocked === 'number' && Array.isArray(p.stars)) return p;
  } catch {
    // First visit, or storage blocked
  }
  return { unlocked: 0, stars: [] };
};

/** Landing page mini game: kids put blocks together and watch the robot run their program. */
export const CodeRobotGame: React.FC<{ onRegister: () => void }> = ({ onRegister }) => {
  const t = useT(gameMessages);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [levelIdx, setLevelIdx] = useState(() => Math.min(loadProgress().unlocked, LEVELS.length - 1));
  const level = LEVELS[levelIdx];
  const board = useMemo(() => parseLevel(level), [level]);
  const start: Robot = { ...board.start, dir: level.startDir };

  const [program, setProgram] = useState<Block[]>([]);
  // Where tapped blocks go: the program itself, or inside a loop
  const [target, setTarget] = useState<'root' | string>('root');
  const [robot, setRobot] = useState<Robot>(start);
  const [picked, setPicked] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [bump, setBump] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);

  const used = countBlocks(program);
  const full = level.maxBlocks !== undefined && used >= level.maxBlocks;

  const resetRun = () => {
    window.clearTimeout(timer.current);
    setRunning(false);
    setRobot({ ...board.start, dir: level.startDir });
    setPicked([]);
    setActiveIds([]);
    setOutcome(null);
  };

  // A new level starts with an empty program
  useEffect(() => {
    setProgram([]);
    setTarget('root');
    resetRun();
  }, [levelIdx]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const saveProgress = (p: Progress) => {
    setProgress(p);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(p));
    } catch {
      // Progress just won't be remembered
    }
  };

  const edit = (fn: (p: Block[]) => Block[]) => {
    if (running) return;
    resetRun();
    setProgram(fn);
  };

  const addBlock = (kind: BlockKind, into: 'root' | string = target) => {
    if (full || running) return;
    const id = `b${nextId.current++}`;
    const block: Block = kind === 'repeat' ? { id, kind, times: 3, body: [] } : { id, kind };
    // A loop can't go inside a loop: it goes after it instead
    if (into !== 'root' && kind !== 'repeat') {
      edit((p) => p.map((b) => (b.id === into && b.kind === 'repeat' ? { ...b, body: [...b.body, block] } : b)));
    } else {
      edit((p) => [...p, block]);
    }
    if (kind === 'repeat') setTarget(id);
  };

  const removeBlock = (id: string) => {
    edit((p) => p.filter((b) => b.id !== id).map((b) => (b.kind === 'repeat' ? { ...b, body: b.body.filter((x) => x.id !== id) } : b)));
    if (target === id) setTarget('root');
  };

  const setTimes = (id: string, times: number) =>
    edit((p) => p.map((b) => (b.id === id && b.kind === 'repeat' ? { ...b, times: Math.min(9, Math.max(2, times)) } : b)));

  const run = () => {
    if (running) return resetRun();
    resetRun();
    const steps = unroll(program);
    if (!steps.length) return;
    setRunning(true);
    let r: Robot = { ...board.start, dir: level.startDir };
    const got = new Set<string>();
    const finish = (o: Outcome) => {
      setRunning(false);
      setActiveIds([]);
      setOutcome(o);
      if (o === 'crash') setBump((n) => n + 1);
      if (o === 'won') {
        const stars = [...progress.stars];
        stars[levelIdx] = Math.max(stars[levelIdx] || 0, starsFor(level, used));
        saveProgress({ unlocked: Math.max(progress.unlocked, Math.min(levelIdx + 1, LEVELS.length - 1)), stars });
      }
    };
    const tick = (i: number) => {
      if (i >= steps.length) {
        const onGoal = r.x === board.goal.x && r.y === board.goal.y;
        return finish(onGoal ? 'batteries' : 'short');
      }
      setActiveIds(steps[i].ids);
      const next = stepRobot(board, r, steps[i].action);
      if (next.crash) return finish('crash');
      r = next.robot;
      setRobot(r);
      const here = cellKey(r.x, r.y);
      if (board.batteries.includes(here) && !got.has(here)) {
        got.add(here);
        setPicked([...got]);
      }
      if (r.x === board.goal.x && r.y === board.goal.y && got.size === board.batteries.length) {
        timer.current = window.setTimeout(() => finish('won'), STEP_MS);
        return;
      }
      timer.current = window.setTimeout(() => tick(i + 1), STEP_MS);
    };
    timer.current = window.setTimeout(() => tick(0), 150);
  };

  const goNext = () => {
    if (levelIdx === LEVELS.length - 1) setAllDone(true);
    else setLevelIdx(levelIdx + 1);
  };

  // ---------- drag & drop (mouse); tapping works everywhere ----------
  const onDragStart = (kind: BlockKind) => (e: React.DragEvent) => e.dataTransfer.setData('text/plain', kind);
  const dropInto = (into: 'root' | string) => ({
    onDragOver: (e: React.DragEvent) => e.preventDefault(),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const kind = e.dataTransfer.getData('text/plain') as BlockKind;
      if (level.blocks.includes(kind)) addBlock(kind, into);
    }
  });

  const label = (k: BlockKind) => t(`b_${k}` as const);
  const chip = (b: Block) => {
    const { icon: Icon, cls } = BLOCK_STYLE[b.kind];
    const lit = activeIds.includes(b.id);
    return (
      <motion.div
        key={b.id}
        layout
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: lit ? 1.06 : 1, opacity: 1 }}
        className={`group inline-flex items-center gap-1.5 ps-2.5 pe-1 py-1.5 rounded-xl border-b-4 text-xs font-black ${cls} ${lit ? 'ring-4 ring-amber-300' : ''}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {label(b.kind)}
        <button type="button" onClick={() => removeBlock(b.id)} disabled={running} aria-label={t('remove')} className="ms-0.5 w-5 h-5 grid place-items-center rounded-md hover:bg-white/20 cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </motion.div>
    );
  };

  const stars = (n: number, size = 'w-4 h-4') => (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <Star key={i} className={`${size} ${i < n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </span>
  );

  const message =
    outcome === 'won'
      ? t('won')
      : outcome === 'crash'
        ? t('crash')
        : outcome === 'short'
          ? t('short')
          : outcome === 'batteries'
            ? t('batteries')
            : t(`l${levelIdx + 1}Hint` as 'l1Hint');

  if (allDone) {
    return (
      <div className="duo-card hover:transform-none! bg-white p-8 sm:p-12 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#c11e3d] text-white grid place-items-center shadow-lg">
          <Bot className="w-10 h-10" />
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900">{t('doneTitle')}</h3>
        <div className="flex justify-center">{stars(Math.round(progress.stars.reduce((a, b) => a + (b || 0), 0) / LEVELS.length), 'w-7 h-7')}</div>
        <p className="text-slate-600 font-medium max-w-md mx-auto">{t('doneText')}</p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <button type="button" onClick={onRegister} className="px-6 py-3 btn-duo-green text-sm font-black inline-flex items-center gap-2 cursor-pointer">
            <UserPlus className="w-4 h-4" /> {t('doneRegister')}
          </button>
          <button type="button" onClick={() => { setAllDone(false); setLevelIdx(0); }} className="px-6 py-3 btn-duo-secondary text-sm font-black cursor-pointer">
            {t('playAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="duo-card hover:transform-none! bg-white p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6">
      {/* Board */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wide text-[#c11e3d]">{t('level', { n: levelIdx + 1, total: LEVELS.length })}</div>
            <h3 className="text-lg font-black text-slate-900">{t(`l${levelIdx + 1}Title` as 'l1Title')}</h3>
          </div>
          {/* Levels: done ones show their stars, later ones stay locked */}
          <div className="flex gap-1">
            {LEVELS.map((_, i) => {
              const locked = i > progress.unlocked;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={locked || running}
                  onClick={() => setLevelIdx(i)}
                  aria-label={t('level', { n: i + 1, total: LEVELS.length })}
                  className={`w-8 h-8 rounded-lg text-xs font-black grid place-items-center cursor-pointer disabled:cursor-not-allowed ${
                    i === levelIdx ? 'bg-[#191919] text-white' : progress.stars[i] ? 'bg-amber-100 text-amber-800' : locked ? 'bg-slate-100 text-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {locked ? <Lock className="w-3 h-3" /> : i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <motion.div
          key={bump}
          animate={bump ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
          transition={{ duration: 0.4 }}
          dir="ltr"
          className="relative rounded-2xl bg-[#191919] p-2 shadow-inner"
        >
          <div className="relative grid gap-1" style={{ gridTemplateColumns: `repeat(${board.w}, minmax(0, 1fr))` }}>
            {Array.from({ length: board.w * board.h }, (_, i) => {
              const x = i % board.w;
              const y = Math.floor(i / board.w);
              const key = cellKey(x, y);
              const rock = board.rocks.has(key);
              const goal = board.goal.x === x && board.goal.y === y;
              const battery = board.batteries.includes(key) && !picked.includes(key);
              return (
                <div key={key} className={`aspect-square rounded-lg grid place-items-center ${rock ? 'bg-[#3d3d3d] shadow-[inset_0_-4px_0_rgba(0,0,0,0.35)]' : 'bg-white/[0.06] border border-white/[0.06]'}`}>
                  {goal && (
                    <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} aria-label={t('goalAlt')}>
                      <Star className="w-6 h-6 sm:w-8 sm:h-8 fill-amber-400 text-amber-400 drop-shadow" />
                    </motion.span>
                  )}
                  <AnimatePresence>
                    {battery && (
                      <motion.span exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.3 }} className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-green-400/20 grid place-items-center">
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-green-300 text-green-300" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Robot */}
            <div
              className="absolute p-0.5 pointer-events-none transition-[left,top] duration-300 ease-out"
              style={{
                width: `calc${cellSize(board.w)}`,
                height: `calc${cellSize(board.h)}`,
                left: `calc(${cellSize(board.w)} * ${robot.x} + ${GAP_PX * robot.x}px)`,
                top: `calc(${cellSize(board.h)} * ${robot.y} + ${GAP_PX * robot.y}px)`
              }}
              aria-label={t('robotAlt')}
            >
              <div className="relative w-full h-full grid place-items-center">
                <div className="absolute inset-0 grid transition-transform duration-300" style={{ transform: `rotate(${robot.dir * 90}deg)` }}>
                  <ChevronUp className="justify-self-center -mt-1 w-5 h-5 text-amber-300 drop-shadow" strokeWidth={3.5} />
                </div>
                <div className={`w-[70%] h-[70%] rounded-xl bg-[#c11e3d] grid place-items-center shadow-lg ${outcome === 'won' ? 'ring-4 ring-amber-300' : ''}`}>
                  <Bot className="w-[65%] h-[65%] text-white" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* What happened / what to do */}
        <div
          className={`flex items-start gap-3 p-3 rounded-2xl text-sm font-bold ${
            outcome === 'won' ? 'bg-[#dcf5e4] text-[#14532d]' : outcome ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600'
          }`}
        >
          <div className="flex-1 space-y-1">
            <p>{message}</p>
            {outcome === 'won' && starsFor(level, used) < 3 && <p className="text-xs font-semibold opacity-80">{t('wonStars')}</p>}
          </div>
          {outcome === 'won' && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              {stars(starsFor(level, used), 'w-5 h-5')}
              <button type="button" onClick={goNext} className="px-3 py-1.5 btn-duo-green text-xs font-black cursor-pointer">
                {t('next')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Blocks and program */}
      <div className="flex flex-col gap-4 min-w-0">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">{t('palette')}</h4>
            <span className="text-[11px] font-semibold text-slate-400">{t('paletteHint')}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {level.blocks.map((k) => {
              const { icon: Icon, cls } = BLOCK_STYLE[k];
              return (
                <button
                  key={k}
                  type="button"
                  draggable={!full && !running}
                  onDragStart={onDragStart(k)}
                  onClick={() => addBlock(k)}
                  disabled={full || running}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-b-4 text-xs font-black cursor-grab active:cursor-grabbing active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
                >
                  <Icon className="w-4 h-4" />
                  {label(k)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-500">{t('program')}</h4>
            <span className={`text-[11px] font-black ${full ? 'text-[#c11e3d]' : 'text-slate-400'}`}>
              {level.maxBlocks !== undefined ? t('blocksMax', { n: used, max: level.maxBlocks }) : t('blocksUsed', { n: used })}
            </span>
          </div>
          <div
            {...dropInto('root')}
            onClick={() => setTarget('root')}
            className={`flex-1 min-h-40 p-3 rounded-2xl border-2 border-dashed flex flex-wrap content-start items-start gap-2 transition-colors ${
              target === 'root' ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'
            }`}
          >
            {program.length === 0 && <p className="w-full py-8 text-center text-xs font-semibold text-slate-400">{t('emptyProgram')}</p>}
            {program.map((b) =>
              b.kind === 'repeat' ? (
                <motion.div
                  key={b.id}
                  layout
                  {...dropInto(b.id)}
                  onClick={(e) => { e.stopPropagation(); setTarget(b.id); }}
                  className={`w-full rounded-2xl border-2 bg-amber-50 p-2 space-y-2 cursor-pointer ${activeIds.includes(b.id) ? 'border-amber-500' : target === b.id ? 'border-amber-400 ring-4 ring-amber-200' : 'border-amber-200'}`}
                >
                  <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                    <Repeat className="w-4 h-4" />
                    {label('repeat')}
                    <span className="inline-flex items-center rounded-lg bg-white border-2 border-amber-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => setTimes(b.id, b.times - 1)} disabled={running || b.times <= 2} className="w-6 h-6 hover:bg-amber-100 disabled:opacity-30 cursor-pointer">−</button>
                      <span className="w-6 text-center font-mono">{b.times}</span>
                      <button type="button" onClick={() => setTimes(b.id, b.times + 1)} disabled={running || b.times >= 9} className="w-6 h-6 hover:bg-amber-100 disabled:opacity-30 cursor-pointer">+</button>
                    </span>
                    {t('times')}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }} disabled={running} aria-label={t('remove')} className="ms-auto w-6 h-6 grid place-items-center rounded-md hover:bg-amber-200 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="ms-3 ps-3 border-s-4 border-amber-300 flex flex-wrap gap-2 min-h-9 items-center">
                    {b.body.length === 0 && <span className="text-[11px] font-semibold text-amber-700/70">{t('emptyLoop')}</span>}
                    {b.body.map((x) => chip(x))}
                  </div>
                  {target === b.id && !running && (
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-amber-800">
                      <span>{t('inLoop')}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setTarget('root'); }} className="px-2 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 cursor-pointer">
                        {t('closeLoop')}
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                chip(b)
              )
            )}
          </div>
          {full && <p className="text-[11px] font-bold text-[#c11e3d]">{t('tooMany', { max: level.maxBlocks ?? 0 })}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={run}
            disabled={!program.length}
            className="flex-1 py-3 btn-duo-green text-sm font-black inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {running ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current rtl:-scale-x-100" />}
            {running ? t('stop') : outcome && outcome !== 'won' ? t('retry') : t('run')}
          </button>
          <button type="button" onClick={() => { edit(() => []); setTarget('root'); }} disabled={running || !program.length} className="px-4 py-3 btn-duo-secondary text-sm font-black inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
            <Trash2 className="w-4 h-4" /> {t('clear')}
          </button>
        </div>
      </div>
    </div>
  );
};
