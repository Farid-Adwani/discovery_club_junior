/**
 * "Program the robot" mini game on the landing page: levels, programs and how the robot moves.
 * Pure functions, so the screen (CodeRobotGame.tsx) only animates the steps.
 */

export type Dir = 0 | 1 | 2 | 3; // north, east, south, west
export type BlockKind = 'fwd' | 'left' | 'right' | 'repeat';
export type Block = { id: string; kind: 'fwd' | 'left' | 'right' } | { id: string; kind: 'repeat'; times: number; body: Block[] };

export interface Level {
  /** Rows top to bottom: S start, G goal, # rock, B battery to pick up, . empty */
  map: string[];
  startDir: Dir;
  blocks: BlockKind[];
  /** Fewest blocks of a good solution (3 stars at or under it) */
  optimal: number;
  /** Most blocks allowed, to make the loop necessary */
  maxBlocks?: number;
}

export const LEVELS: Level[] = [
  { map: ['......', '......', 'S...G.', '......', '......'], startDir: 1, blocks: ['fwd'], optimal: 4 },
  { map: ['......', '...G..', '......', '......', 'S.....'], startDir: 1, blocks: ['fwd', 'left', 'right'], optimal: 7 },
  { map: ['######', '......', 'S....G', '......', '######'], startDir: 1, blocks: ['fwd', 'left', 'right', 'repeat'], optimal: 2, maxBlocks: 2 },
  { map: ['######', '###G##', '##..##', '#..###', 'S.####'], startDir: 1, blocks: ['fwd', 'left', 'right', 'repeat'], optimal: 5, maxBlocks: 5 },
  { map: ['B...B.', '.###..', '.###..', '.###..', 'S...G.'], startDir: 0, blocks: ['fwd', 'left', 'right', 'repeat'], optimal: 8 },
  { map: ['S....B', '#####.', 'B.....', '.#####', '.....G'], startDir: 1, blocks: ['fwd', 'left', 'right', 'repeat'], optimal: 14 }
];

export interface Board {
  w: number;
  h: number;
  start: { x: number; y: number };
  goal: { x: number; y: number };
  rocks: Set<string>;
  batteries: string[];
}

export const cellKey = (x: number, y: number) => `${x},${y}`;

export function parseLevel(level: Level): Board {
  const board: Board = { w: level.map[0].length, h: level.map.length, start: { x: 0, y: 0 }, goal: { x: 0, y: 0 }, rocks: new Set(), batteries: [] };
  level.map.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === 'S') board.start = { x, y };
      else if (c === 'G') board.goal = { x, y };
      else if (c === '#') board.rocks.add(cellKey(x, y));
      else if (c === 'B') board.batteries.push(cellKey(x, y));
    })
  );
  return board;
}

/** Blocks used, the loop counting as one */
export const countBlocks = (program: Block[]): number =>
  program.reduce((n, b) => n + 1 + (b.kind === 'repeat' ? countBlocks(b.body) : 0), 0);

export interface Step {
  action: 'fwd' | 'left' | 'right';
  /** Blocks to light up while it runs (the loop and the block inside it) */
  ids: string[];
}

/** The program as the list of moves the robot makes, loops unrolled (capped so it can't run for ever) */
export function unroll(program: Block[], parents: string[] = [], limit = 200): Step[] {
  const out: Step[] = [];
  for (const b of program) {
    if (b.kind === 'repeat') {
      for (let i = 0; i < b.times && out.length < limit; i++) out.push(...unroll(b.body, [...parents, b.id], limit - out.length));
    } else out.push({ action: b.kind, ids: [...parents, b.id] });
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

export interface Robot {
  x: number;
  y: number;
  dir: Dir;
}

const MOVES: Record<Dir, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };

/** One move. `crash` when the robot would leave the board or hit a rock (it stays where it is). */
export function stepRobot(board: Board, robot: Robot, action: Step['action']): { robot: Robot; crash: boolean } {
  if (action === 'left') return { robot: { ...robot, dir: ((robot.dir + 3) % 4) as Dir }, crash: false };
  if (action === 'right') return { robot: { ...robot, dir: ((robot.dir + 1) % 4) as Dir }, crash: false };
  const [dx, dy] = MOVES[robot.dir];
  const x = robot.x + dx;
  const y = robot.y + dy;
  if (x < 0 || y < 0 || x >= board.w || y >= board.h || board.rocks.has(cellKey(x, y))) return { robot, crash: true };
  return { robot: { ...robot, x, y }, crash: false };
}

export type Outcome = 'won' | 'crash' | 'short' | 'batteries';

/** Plays the whole program at once (used to check the levels and the result) */
export function simulate(level: Level, program: Block[]): { outcome: Outcome; robot: Robot } {
  const board = parseLevel(level);
  let robot: Robot = { ...board.start, dir: level.startDir };
  const picked = new Set<string>();
  for (const step of unroll(program)) {
    const next = stepRobot(board, robot, step.action);
    if (next.crash) return { outcome: 'crash', robot };
    robot = next.robot;
    if (board.batteries.includes(cellKey(robot.x, robot.y))) picked.add(cellKey(robot.x, robot.y));
    if (robot.x === board.goal.x && robot.y === board.goal.y && picked.size === board.batteries.length) return { outcome: 'won', robot };
  }
  const onGoal = robot.x === board.goal.x && robot.y === board.goal.y;
  return { outcome: onGoal ? 'batteries' : 'short', robot };
}

/** 3 stars at the best length, 2 a little over, 1 otherwise */
export const starsFor = (level: Level, used: number) => (used <= level.optimal ? 3 : used <= level.optimal + 2 ? 2 : 1);
