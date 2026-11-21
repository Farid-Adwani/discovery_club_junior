/**
 * The Legacy Museum: a 3D gallery hall (plain three.js, no React in the render loop).
 *
 * One room per year, entered through an arch with the year on it. Each album of the photo timeline
 * hangs on the walls as a framed picture (gold frame for a podium) with up to two smaller photos and
 * a museum label. Visitors walk with the wheel, a swipe or the arrow keys, look around by dragging,
 * and click a picture to step up to it; ← → (or the side buttons) go from one stop to the next.
 * Ctrl + wheel, a pinch or + − zoom in (towards the pointer), up to 4×.
 * A guided tour goes from stop to stop on its own.
 */
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface MuseumPhoto {
  src: string;
  thumb: string;
  w: number;
  h: number;
}

export interface MuseumAlbum {
  id: string;
  year: number;
  room: number;
  title: string;
  result?: string;
  kind: string;
  cover: MuseumPhoto;
  photos: MuseumPhoto[];
}

export interface MuseumRoom {
  year: number;
  tagline: string;
  albums: MuseumAlbum[];
}

export type MuseumStop = { kind: 'gate'; room: number } | { kind: 'album'; album: MuseumAlbum } | { kind: 'end' };

export interface MuseumOptions {
  rooms: MuseumRoom[];
  rtl: boolean;
  font: string;
  logo: string;
  reducedMotion: boolean;
  texts: {
    entranceTitle: string;
    entranceSub: string;
    endTitle: string;
    endSub: string;
    photos: (n: number) => string;
  };
  on: {
    progress: (loaded: number, total: number) => void;
    ready: () => void;
    room: (room: number) => void;
    stop: (stop: MuseumStop | null) => void;
    along: (p: number) => void;
    end: (atEnd: boolean) => void;
    tour: (on: boolean) => void;
    interact: () => void;
    exit: () => void;
    openAlbum: (album: MuseumAlbum) => void;
    zoom: (zoom: number) => void;
  };
}

export interface MuseumApi {
  next: () => void;
  prev: () => void;
  goToRoom: (room: number) => void;
  goToStart: () => void;
  back: () => void;
  setTour: (on: boolean) => void;
  setPaused: (paused: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  dispose: () => void;
}

// ---------- dimensions (metres) ----------
const W = 9; // hall width
const HALF = W / 2;
const H = 5.2; // ceiling
const EYE = 1.62;
const LINTEL = 3.9; // underside of the arches
const ARCH_D = 0.9;
const MAIN_Y = 2.3; // centre of the big frames
const FRAME = 0.075;
const MAT = 0.11;
const GAP = 1.7; // between two groups on a wall
const ROOM_PAD = 2.6;
const RIGHT_OFFSET = 1.7; // the right wall starts a bit later, so the groups alternate
const START_Z = 9.5;
const ENTRANCE_Z = 3;
const FIRST_ROOM_Z = -4;
const GATE_VIEW = 6.5; // where you stand to look at an arch
const MAX_SPEED = 38;
const WHEEL_STEP = 0.028; // metres per pixel of wheel
const KEY_WALK = 7; // metres per second while ↑ or ↓ is held (twice with Shift)
const MAX_ZOOM = 4;

const BG = 0x0b0b0d;
const CRIMSON = 0xe23a5a;
const GOLD = '#d9b45a';

interface Cluster {
  album: MuseumAlbum;
  side: -1 | 1; // -1 left wall, 1 right wall
  zMain: number;
  zCenter: number;
  width: number;
  outerW: number;
  outerH: number;
  extrasW: number;
  placardY: number;
  group: THREE.Group;
  mainMat: THREE.MeshBasicMaterial;
  extraMats: { mat: THREE.MeshBasicMaterial; photo: MuseumPhoto }[];
  wash: THREE.Mesh;
  hover: number;
  hiRes?: boolean;
}

interface Stop {
  stop: MuseumStop;
  z: number; // where the walker is when at this stop
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

function fit(p: MuseumPhoto, maxH: number, maxW: number) {
  let h = maxH;
  let w = (h * p.w) / p.h;
  if (w > maxW) {
    w = maxW;
    h = (w * p.h) / p.w;
  }
  return { w, h };
}

export function createMuseum(container: HTMLElement, opts: MuseumOptions): MuseumApi {
  const { rooms, texts, on } = opts;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  // ---------- renderer, scene, camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
  canvas.tabIndex = -1;
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 13, 60);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 75);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => (disposables.push(x), x);

  // ---------- textures ----------
  const manager = new THREE.LoadingManager();
  const loader = new THREE.TextureLoader(manager);
  const textureCache = new Map<string, THREE.Texture>();
  const photoTexture = (url: string) => {
    let tex = textureCache.get(url);
    if (!tex) {
      tex = keep(loader.load(url));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      textureCache.set(url, tex);
    }
    return tex;
  };

  /** Draws on a w×h canvas (coordinates), stored at `scale` of that size */
  const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, scale = 1) => {
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.direction = opts.rtl ? 'rtl' : 'ltr';
    draw(ctx);
    const tex = keep(new THREE.CanvasTexture(c));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  };
  const font = (weight: number, size: number) => `${weight} ${size}px ${opts.font}`;
  const wrap = (ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    }
    return lines;
  };

  // Soft light pool for the wall behind each picture
  const washTex = canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 110, 4, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,232,200,1)');
    g.addColorStop(0.45, 'rgba(255,214,170,0.45)');
    g.addColorStop(1, 'rgba(255,200,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });
  // Light beam: bright at the lamp, fading towards the picture
  const beamTex = canvasTexture(4, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(0.08, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
  });
  // Polished stone floor tiles (one tile = 2 m)
  const tileTex = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#161618';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const a = Math.random() * 0.05;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, 509, 509);
  });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  // Wall panels (3 m wide), very subtle
  const wallTex = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#2b2b30';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, 3, 512);
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;

  // ---------- shared materials ----------
  const mats = {
    wall: keep(new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92, metalness: 0 })),
    ceiling: keep(new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 1 })),
    arch: keep(new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.55, metalness: 0.2, envMap: envTex, envMapIntensity: 0.35 })),
    gold: keep(new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.3, metalness: 1, envMap: envTex, envMapIntensity: 1.2 })),
    black: keep(new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.4, metalness: 0.35, envMap: envTex, envMapIntensity: 0.8 })),
    mat: keep(new THREE.MeshBasicMaterial({ color: 0xe6e1d8 })),
    led: keep(new THREE.MeshBasicMaterial({ color: CRIMSON })),
    strip: keep(new THREE.MeshBasicMaterial({ color: 0xfff1dc })),
    metal: keep(new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.35, metalness: 0.9, envMap: envTex })),
    lens: keep(new THREE.MeshBasicMaterial({ color: 0xfff3dd })),
    wash: keep(
      new THREE.MeshBasicMaterial({ map: washTex, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    ),
    beam: keep(
      new THREE.MeshBasicMaterial({
        map: beamTex,
        color: 0xffe6c4,
        transparent: true,
        opacity: 0.055,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
  };
  const geo = {
    box: keep(new THREE.BoxGeometry(1, 1, 1)),
    plane: keep(new THREE.PlaneGeometry(1, 1)),
    lamp: keep(new THREE.CylinderGeometry(0.075, 0.06, 0.26, 20)),
    lens: keep(new THREE.CircleGeometry(0.058, 20)),
    beam: keep(new THREE.CylinderGeometry(0.06, 1, 1, 28, 1, true))
  };
  const box = (mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo.box, mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  // ---------- layout: rooms and the groups of pictures on their walls ----------
  const clusters: Cluster[] = [];
  const archZ: number[] = [];
  let z = FIRST_ROOM_Z;
  for (const room of rooms) {
    archZ.push(z);
    const cursor = { [-1]: 0, [1]: RIGHT_OFFSET } as Record<-1 | 1, number>;
    room.albums.forEach((album, i) => {
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      const big = i === 0 || !!album.result;
      const main = fit(album.cover, big ? 1.75 : 1.4, big ? 2.6 : 2.1);
      const outerW = main.w + 2 * (MAT + FRAME);
      const outerH = main.h + 2 * (MAT + FRAME);
      const extras = album.photos.filter((p) => p !== album.cover).slice(0, outerH > 1.9 ? 2 : 1);
      const extraSizes = extras.map((p) => fit(p, 0.66, 0.95));
      const extrasW = extras.length ? 0.34 + Math.max(...extraSizes.map((s) => s.w + 0.19)) : 0;
      const width = outerW + extrasW;
      const center = cursor[side] + width / 2;
      cursor[side] += width + GAP;
      const zCenter = z - ROOM_PAD - center;
      const c = extrasW / 2;
      const zMain = side < 0 ? zCenter + c : zCenter - c;
      const placardY = MAIN_Y - outerH / 2 - 0.4;
      const group = new THREE.Group();
      group.position.set(side * (HALF - 0.01), MAIN_Y, zMain);
      group.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(group);

      // big picture: frame, passe-partout, photo
      const frameMat = album.result ? mats.gold : mats.black;
      const frame = new THREE.Mesh(geo.box, frameMat);
      frame.scale.set(outerW, outerH, 0.07);
      frame.position.z = 0.035;
      const matBoard = new THREE.Mesh(geo.plane, mats.mat);
      matBoard.scale.set(main.w + 2 * MAT, main.h + 2 * MAT, 1);
      matBoard.position.z = 0.0715;
      const mainMat = keep(new THREE.MeshBasicMaterial({ map: photoTexture(album.cover.thumb), toneMapped: false }));
      const photo = new THREE.Mesh(geo.plane, mainMat);
      photo.scale.set(main.w, main.h, 1);
      photo.position.z = 0.073;
      group.add(frame, matBoard, photo);

      // light pool on the wall
      const wash = new THREE.Mesh(geo.plane, mats.wash.clone());
      keep(wash.material as THREE.Material);
      wash.scale.set(outerW * 1.9 + extrasW, outerH * 1.75, 1);
      wash.position.set(extrasW / 2, 0.25, 0.008);
      wash.userData.noPick = true;
      group.add(wash);

      // smaller photos beside it
      const stackH = extraSizes.reduce((t, s) => t + s.h + 0.19, 0) + 0.2 * (extraSizes.length - 1);
      const extraMats: Cluster['extraMats'] = [];
      let y = stackH / 2 - (extraSizes[0] ? (extraSizes[0].h + 0.19) / 2 : 0);
      extras.forEach((p, k) => {
        const s = extraSizes[k];
        const x = outerW / 2 + 0.34 + (extrasW - 0.34) / 2;
        const f = new THREE.Mesh(geo.box, mats.black);
        f.scale.set(s.w + 0.19, s.h + 0.19, 0.05);
        f.position.set(x, y, 0.025);
        const m = new THREE.Mesh(geo.plane, mats.mat);
        m.scale.set(s.w + 0.1, s.h + 0.1, 1);
        m.position.set(x, y, 0.0515);
        const extraMat = keep(new THREE.MeshBasicMaterial({ map: photoTexture(p.thumb), toneMapped: false }));
        extraMats.push({ mat: extraMat, photo: p });
        const ph = new THREE.Mesh(geo.plane, extraMat);
        ph.scale.set(s.w, s.h, 1);
        ph.position.set(x, y, 0.053);
        group.add(f, m, ph);
        y -= (s.h + 0.19) / 2 + 0.2 + (extraSizes[k + 1] ? (extraSizes[k + 1].h + 0.19) / 2 : 0);
      });

      // museum label under the picture
      const placard = new THREE.Mesh(geo.plane, keep(new THREE.MeshBasicMaterial({ map: labelTexture(album, room), toneMapped: false })));
      placard.scale.set(1.2, 0.44, 1);
      placard.position.set(0, placardY - MAIN_Y, 0.012);
      const plinth = new THREE.Mesh(geo.box, mats.black);
      plinth.scale.set(1.24, 0.48, 0.02);
      plinth.position.set(0, placardY - MAIN_Y, 0.0);
      group.add(plinth, placard);

      const cluster: Cluster = { album, side, zMain, zCenter, width, outerW, outerH, extrasW, placardY, group, mainMat, extraMats, wash, hover: 0 };
      group.traverse((o) => (o.userData.cluster = cluster));
      clusters.push(cluster);

      // ceiling spotlight aimed at the picture, with a faint beam
      const lampPos = new THREE.Vector3(side * (HALF - 1.35), H - 0.42, zMain);
      const target = new THREE.Vector3(side * HALF, MAIN_Y + 0.2, zMain);
      const dir = target.clone().sub(lampPos).normalize();
      const lamp = new THREE.Mesh(geo.lamp, mats.metal);
      lamp.position.copy(lampPos);
      lamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      const lens = new THREE.Mesh(geo.lens, mats.lens);
      lens.position.copy(lampPos).addScaledVector(dir, 0.131);
      lens.lookAt(lens.position.clone().add(dir));
      const len = lampPos.distanceTo(target);
      const beam = new THREE.Mesh(geo.beam, mats.beam);
      beam.scale.set(Math.max(0.9, outerW * 0.45), len, Math.max(0.9, outerW * 0.45));
      beam.position.copy(lampPos).addScaledVector(dir, len / 2);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      scene.add(lamp, lens, beam);
    });
    const roomLen = ROOM_PAD + Math.max(cursor[-1], cursor[1]) - GAP + ROOM_PAD;
    z -= Math.max(roomLen, 12);
  }
  const END_Z = z - 4;
  const BACK_Z = START_Z + 4;
  const hallLen = BACK_Z - END_Z;
  const hallMid = (BACK_Z + END_Z) / 2;

  function labelTexture(album: MuseumAlbum, room: MuseumRoom) {
    return canvasTexture(1024, 376, (ctx) => {
      const pad = 64;
      const x = opts.rtl ? 1024 - pad : pad;
      ctx.textAlign = opts.rtl ? 'right' : 'left';
      ctx.fillStyle = '#f3efe7';
      ctx.fillRect(0, 0, 1024, 376);
      ctx.fillStyle = '#b3173a';
      ctx.font = font(800, 30);
      ctx.fillText(`${room.year}  ·  ${album.kind.toUpperCase()}`, x, 74);
      ctx.fillStyle = '#16161a';
      ctx.font = font(900, 54);
      const lines = wrap(ctx, album.title, 1024 - pad * 2, 2);
      lines.forEach((l, i) => ctx.fillText(l, x, 146 + i * 62));
      let y = 146 + lines.length * 62 + 6;
      if (album.result) {
        ctx.font = font(800, 36);
        ctx.fillStyle = '#9a7414';
        ctx.fillText(`★  ${album.result}`, x, y + 10);
        y += 52;
      }
      ctx.font = font(600, 30);
      ctx.fillStyle = '#6b6b72';
      ctx.fillText(texts.photos(album.photos.length), x, Math.max(y + 18, 330));
    }, 0.62);
  }

  // ---------- architecture ----------
  // Floor: a mirror under a semi-transparent polished stone layer (phones get the stone only)
  let reflector: Reflector | null = null;
  if (!coarse) {
    reflector = new Reflector(new THREE.PlaneGeometry(W, hallLen), {
      clipBias: 0.003,
      textureWidth: 1024,
      textureHeight: 1024,
      color: 0x8a8a90
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.set(0, 0, hallMid);
    scene.add(reflector);
    disposables.push(reflector.geometry, reflector.material as THREE.Material, reflector.getRenderTarget());
  }
  tileTex.repeat.set(W / 2, hallLen / 2);
  const floor = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(W, hallLen)),
    keep(
      new THREE.MeshStandardMaterial({
        map: tileTex,
        transparent: !!reflector,
        opacity: reflector ? 0.8 : 1,
        roughness: reflector ? 0.45 : 0.3,
        metalness: 0.1,
        envMap: envTex,
        envMapIntensity: reflector ? 0.25 : 0.5
      })
    )
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.004, hallMid);
  scene.add(floor);

  wallTex.repeat.set(hallLen / 3, 1);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(keep(new THREE.PlaneGeometry(hallLen, H)), mats.wall);
    wall.position.set(side * HALF, H / 2, hallMid);
    wall.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(wall);
    box(mats.led, 0.02, 0.025, hallLen, side * (HALF - 0.012), 0.09, hallMid); // crimson skirting light
    box(mats.metal, 0.05, 0.05, hallLen, side * (HALF - 1.35), H - 0.27, hallMid); // lighting track
  }
  const ceiling = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, hallLen)), mats.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, hallMid);
  scene.add(ceiling);
  for (const x of [-1.05, 1.05]) box(mats.strip, 0.14, 0.03, hallLen, x, H - 0.02, hallMid);
  // closing walls
  const backWall = new THREE.Mesh(geo.plane, mats.wall);
  backWall.scale.set(W, H, 1);
  backWall.position.set(0, H / 2, BACK_Z);
  backWall.rotation.y = Math.PI;
  scene.add(backWall);

  // Arches: the museum entrance, then one per year
  const lintelTexture = (big: string, small: string, color: string) =>
    canvasTexture(2048, 250, (ctx) => {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = font(900, 132);
      const g = ctx.createLinearGradient(0, 30, 0, 160);
      g.addColorStop(0, color === 'gold' ? '#f6dc96' : '#ffffff');
      g.addColorStop(1, color === 'gold' ? '#c08f2a' : '#d9d9de');
      ctx.fillStyle = g;
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
      ctx.fillText(big, 1024, 150);
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
      ctx.font = font(600, 46);
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillText(small, 1024, 222, 1900);
    });
  const arch = (zPos: number, big: string, small: string, color: string) => {
    for (const side of [-1, 1]) {
      box(mats.arch, 0.7, LINTEL, ARCH_D, side * (HALF - 0.35), LINTEL / 2, zPos);
      box(mats.led, 0.03, LINTEL - 0.1, 0.03, side * (HALF - 0.715), LINTEL / 2, zPos + ARCH_D / 2 - 0.05);
    }
    box(mats.arch, W, H - LINTEL, ARCH_D, 0, (H + LINTEL) / 2, zPos);
    box(mats.led, W - 1.4, 0.03, 0.03, 0, LINTEL - 0.015, zPos + ARCH_D / 2 - 0.05);
    const text = new THREE.Mesh(geo.plane, keep(new THREE.MeshBasicMaterial({ map: lintelTexture(big, small, color), transparent: true, alphaTest: 0.02, toneMapped: false })));
    text.scale.set(W - 0.6, (W - 0.6) * (250 / 2048), 1);
    text.position.set(0, (H + LINTEL) / 2, zPos + ARCH_D / 2 + 0.004);
    scene.add(text);
    box(mats.strip, W - 1.6, 0.03, 0.14, 0, H - 0.02, zPos - ARCH_D);
  };
  arch(ENTRANCE_Z, texts.entranceTitle, texts.entranceSub, 'white');
  rooms.forEach((room, i) => arch(archZ[i], String(room.year), room.tagline, 'gold'));

  // End wall: the club logo and "to be continued"
  const endTex = canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, 1024, 1024);
  });
  const endWall = new THREE.Mesh(geo.plane, keep(new THREE.MeshStandardMaterial({ map: endTex, roughness: 0.9 })));
  endWall.scale.set(W, H, 1);
  endWall.position.set(0, H / 2, END_Z);
  scene.add(endWall);
  const logoImg = new Image();
  const logoTex = keep(new THREE.Texture());
  logoTex.colorSpace = THREE.SRGBColorSpace;
  manager.itemStart(opts.logo);
  logoImg.onload = logoImg.onerror = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (logoImg.naturalWidth) ctx.drawImage(logoImg, 40, 40, 432, 432);
    ctx.restore();
    ctx.lineWidth = 12;
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    logoTex.image = c;
    logoTex.needsUpdate = true;
    manager.itemEnd(opts.logo);
  };
  logoImg.src = opts.logo;
  const logo = new THREE.Mesh(geo.plane, keep(new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, alphaTest: 0.02, toneMapped: false })));
  logo.scale.set(1.7, 1.7, 1);
  logo.position.set(0, 2.85, END_Z + 0.02);
  const endText = new THREE.Mesh(
    geo.plane,
    keep(new THREE.MeshBasicMaterial({ map: lintelTexture(texts.endTitle, texts.endSub, 'gold'), transparent: true, alphaTest: 0.02, toneMapped: false }))
  );
  endText.scale.set(W - 1, (W - 1) * (250 / 2048), 1);
  endText.position.set(0, 1.45, END_Z + 0.02);
  const endWash = new THREE.Mesh(geo.plane, mats.wash);
  endWash.scale.set(6.5, 4.6, 1);
  endWash.position.set(0, 2.5, END_Z + 0.01);
  scene.add(logo, endText, endWash);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xfff1e2, 0x0a0a0b, 0.55));
  const walker = new THREE.PointLight(0xffe0bd, 26, 15, 1.35);
  scene.add(walker);
  const endLight = new THREE.PointLight(0xffd6a8, 30, 12, 1.4);
  endLight.position.set(0, 3.8, END_Z + 4);
  scene.add(endLight);

  // ---------- stops: arch, its pictures, …, the end ----------
  const stops: Stop[] = [];
  rooms.forEach((_, r) => {
    stops.push({ stop: { kind: 'gate', room: r }, z: archZ[r] + GATE_VIEW });
    clusters
      .filter((c) => c.album.room === r)
      .sort((a, b) => b.zCenter - a.zCenter)
      .forEach((c) => stops.push({ stop: { kind: 'album', album: c.album }, z: c.zCenter + 3.5 }));
  });
  const END_STOP = END_Z + 7.5;
  stops.push({ stop: { kind: 'end' }, z: END_STOP });
  const clusterOf = (album: MuseumAlbum) => clusters.find((c) => c.album === album)!;

  // ---------- camera state ----------
  let mode: 'free' | 'focus' = 'free';
  let walkZ = START_Z;
  let walkTarget = START_Z;
  let walkV = 0;
  const camPos = new THREE.Vector3(0, opts.reducedMotion ? EYE : 3.4, opts.reducedMotion ? START_Z : START_Z + 7);
  let yaw = 0;
  let pitch = opts.reducedMotion ? 0.02 : -0.2;
  let userYaw = 0;
  let userPitch = 0;
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  const focus = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, cluster: null as Cluster | null };
  let stopIndex = -1;
  let sinceMode = 10;
  let intro = opts.reducedMotion ? 0 : 2.6;
  let tour = false;
  let tourTimer = 0;
  let paused = false;
  let ready = false;
  let interacted = false;
  let lastRoom = -2;
  let lastEnd = false;
  let lastAlong = -1;
  const MIN_Z = END_STOP;
  const MAX_Z = START_Z;
  let baseFov = 60;
  let zoom = 1;
  let zoomTarget = 1;
  let zoomYaw = 0; // where the zoom points, relative to the normal view
  let zoomPitch = 0;

  const desired = new THREE.Vector3();

  function interact() {
    if (!interacted) {
      interacted = true;
      on.interact();
    }
  }

  function setMode(m: 'free' | 'focus') {
    if (m !== mode) sinceMode = 0;
    mode = m;
  }

  /** Zoom (1 to 4×), keeping what is under the pointer (ndc, centre by default) where it is */
  function setZoom(z: number, nx = 0, ny = 0) {
    const next = clamp(z, 1, MAX_ZOOM);
    if (Math.abs(next - zoomTarget) < 0.001) return;
    if (next <= 1.001) {
      zoomYaw = zoomPitch = 0;
    } else if (next > zoomTarget) {
      const tanV = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
      const tanH = tanV * camera.aspect;
      zoomYaw = clamp(zoomYaw - (Math.atan((nx * tanH) / zoomTarget) - Math.atan((nx * tanH) / next)), -0.9, 0.9);
      zoomPitch = clamp(zoomPitch + (Math.atan((ny * tanV) / zoomTarget) - Math.atan((ny * tanV) / next)), -0.6, 0.6);
    } else {
      // zooming out brings the view back towards the middle
      const k = (next - 1) / (zoomTarget - 1);
      zoomYaw *= k;
      zoomPitch *= k;
    }
    zoomTarget = next;
    on.zoom(Math.round(next * 100) / 100);
  }
  const ndcAt = (clientX: number, clientY: number): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1];
  };
  const sharpen = (mat: THREE.MeshBasicMaterial, url: string) =>
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      keep(tex);
      mat.map = tex;
    });

  function focusCluster(c: Cluster) {
    const tanV = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
    const tanH = tanV * camera.aspect;
    const top = MAIN_Y + c.outerH / 2;
    const bottom = c.placardY - 0.24;
    const height = top - bottom;
    const wide = camera.aspect > 1.1;
    const width = wide ? c.width : c.outerW;
    const along = wide ? c.extrasW / 2 : 0; // centre of what is framed, along the wall
    // The picture and its label take about half of the screen height, in the upper part:
    // the bottom of the screen is for the information card
    const d = clamp(Math.max(height / (0.54 * 2 * tanV), width / (0.82 * 2 * tanH)), 2.4, W - 0.9);
    const normalX = -c.side;
    const cx = c.side * HALF;
    const cz = c.side < 0 ? c.zMain - along : c.zMain + along;
    const cy = (top + bottom) / 2;
    const lookY = cy - 0.14 * 2 * d * tanV;
    focus.pos.set(cx + normalX * d, Math.max(EYE, lookY), cz);
    focus.yaw = c.side < 0 ? Math.PI / 2 : -Math.PI / 2;
    focus.pitch = Math.atan2(lookY - focus.pos.y, d);
    focus.cluster = c;
    setMode('focus');
    // full-size photos once you are close to them (for zooming in)
    if (!c.hiRes) {
      c.hiRes = true;
      sharpen(c.mainMat, c.album.cover.src);
      c.extraMats.forEach(({ mat, photo }) => sharpen(mat, photo.src));
    }
  }

  function goTo(i: number) {
    if (i < 0) return;
    setZoom(1);
    i = clamp(i, 0, stops.length - 1);
    stopIndex = i;
    const s = stops[i];
    if (s.stop.kind === 'album') {
      focusCluster(clusterOf(s.stop.album));
    } else {
      if (mode === 'focus') {
        // walk on from where the camera stands
        walkZ = camPos.z;
        walkV = 0;
      }
      setMode('free');
      focus.cluster = null;
      userYaw = 0;
      userPitch = 0;
    }
    walkTarget = s.z;
    on.stop(s.stop.kind === 'gate' ? null : s.stop);
  }

  /** Back to walking, from where the camera is */
  function leaveFocus() {
    setZoom(1);
    if (mode !== 'focus') return;
    const c = focus.cluster;
    walkZ = camPos.z;
    walkTarget = c ? c.zCenter + 3.5 : camPos.z;
    walkV = 0;
    userYaw = 0;
    focus.cluster = null;
    setMode('free');
    on.stop(null);
  }

  /** In free walking, the next stop ahead (or behind) of where you are */
  function nextFrom(dirn: 1 | -1) {
    if (mode === 'focus') return goTo(stopIndex + dirn);
    const zNow = walkTarget;
    if (dirn > 0) {
      const i = stops.findIndex((s) => s.z < zNow - 0.6);
      goTo(i < 0 ? stops.length - 1 : i);
    } else {
      let i = -1;
      stops.forEach((s, k) => s.z > zNow + 0.6 && (i = k));
      if (i < 0) {
        setMode('free');
        walkTarget = START_Z;
        stopIndex = -1;
        on.stop(null);
      } else goTo(i);
    }
  }

  function setTour(v: boolean) {
    if (v === tour) return;
    tour = v;
    on.tour(v);
    if (v) {
      tourTimer = 0.2;
      if (stopIndex >= stops.length - 1) stopIndex = -1;
    }
  }

  // ---------- input ----------
  const pointer = { down: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, moved: false, touch: false, vy: 0, t: 0 };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickables: THREE.Object3D[] = [];
  clusters.forEach((c) => c.group.traverse((o) => o instanceof THREE.Mesh && !o.userData.noPick && pickables.push(o)));
  let hovered: Cluster | null = null;

  function pick(clientX: number, clientY: number): Cluster | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit && hit.distance < 22 ? (hit.object.userData.cluster as Cluster) : null;
  }

  // The wheel walks along the hall, wherever the pointer is (the museum fills the screen)
  const onWheel = (e: WheelEvent) => {
    if (paused || !ready) return;
    e.preventDefault();
    interact();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? container.clientHeight : 1;
    if (e.ctrlKey) {
      // Ctrl + wheel, or a trackpad pinch (browsers report it as Ctrl + wheel): zoom, not the page
      setTour(false);
      setZoom(zoomTarget * Math.exp(-e.deltaY * unit * 0.004), ...ndcAt(e.clientX, e.clientY));
      return;
    }
    setTour(false);
    leaveFocus();
    walkTarget = clamp(walkTarget - e.deltaY * unit * WHEEL_STEP, MIN_Z, MAX_Z);
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) userYaw = clamp(userYaw - e.deltaX * unit * 0.002, -1.2, 1.2);
  };

  // Fingers on the screen: one drags, two pinch to zoom
  const touches = new Map<number, { x: number; y: number }>();
  const pinch = { active: false, dist: 1, zoom: 1 };
  const fingerGap = () => {
    const [a, b] = [...touches.values()];
    return { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  const onPointerDown = (e: PointerEvent) => {
    if (paused || !ready) return;
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType !== 'mouse') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        pinch.active = true;
        pinch.dist = fingerGap().d;
        pinch.zoom = zoomTarget;
        pointer.moved = true; // a pinch is never a tap
        interact();
        setTour(false);
        return;
      }
      if (touches.size > 2) return;
    }
    Object.assign(pointer, { down: true, id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, touch: e.pointerType !== 'mouse', vy: 0, t: performance.now() });
  };
  const onPointerMove = (e: PointerEvent) => {
    if (paused || !ready) return;
    const r = canvas.getBoundingClientRect();
    if (touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.active && touches.size >= 2) {
        const g = fingerGap();
        setZoom(pinch.zoom * (g.d / pinch.dist), ...ndcAt(g.x, g.y));
        return;
      }
    }
    if (pointer.down && e.pointerId !== pointer.id) return;
    if (!pointer.down) {
      if (e.pointerType === 'mouse') {
        parallax.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        parallax.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        const c = pick(e.clientX, e.clientY);
        if (c !== hovered) {
          hovered = c;
          canvas.style.cursor = c ? 'pointer' : 'grab';
        }
      }
      return;
    }
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    const now = performance.now();
    const zoomed = zoomTarget > 1.02;
    if (!pointer.moved && Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy) > 7) {
      pointer.moved = true;
      interact();
      setTour(false);
      if (!zoomed) leaveFocus(); // zoomed in on a picture, dragging looks around it
      canvas.style.cursor = 'grabbing';
    }
    if (pointer.moved) {
      const k = (pointer.touch ? 0.005 : 0.0042) / zoom; // slower when zoomed, so it follows the hand
      if (zoomed && mode === 'focus') {
        zoomYaw = clamp(zoomYaw + dx * k, -0.9, 0.9);
        zoomPitch = clamp(zoomPitch + dy * k * 0.7, -0.6, 0.6);
      } else {
        userYaw = clamp(userYaw + dx * k, -1.25, 1.25);
        if (pointer.touch && !zoomed) {
          walkTarget = clamp(walkTarget + dy * 0.035, MIN_Z, MAX_Z);
          pointer.vy = (dy / Math.max(1, now - pointer.t)) * 16;
        } else userPitch = clamp(userPitch + dy * k * 0.6, -0.35, 0.35);
      }
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.t = now;
  };
  const onPointerUp = (e: PointerEvent) => {
    // The browser took the gesture over: never a tap
    if (e.type === 'pointercancel' && !pinch.active) {
      touches.delete(e.pointerId);
      if (e.pointerId === pointer.id) pointer.down = false;
      return;
    }
    if (e.pointerType !== 'mouse') {
      touches.delete(e.pointerId);
      if (pinch.active) {
        if (touches.size < 2) pinch.active = false;
        // the finger still on the screen carries on dragging from where it is
        const rest = [...touches.entries()][0];
        if (rest) {
          Object.assign(pointer, { id: rest[0], x: rest[1].x, y: rest[1].y, vy: 0, t: performance.now() });
          return;
        }
      } else if (touches.size > 0) return;
    }
    if (!pointer.down) return;
    pointer.down = false;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    if (paused || !ready) return;
    if (pointer.moved) {
      // a flick keeps you walking a little
      if (pointer.touch && zoomTarget <= 1.02) walkTarget = clamp(walkTarget + pointer.vy * 0.45, MIN_Z, MAX_Z);
      return;
    }
    interact();
    const c = pick(e.clientX, e.clientY);
    if (c) {
      setTour(false);
      if (mode === 'focus' && focus.cluster === c) on.openAlbum(c.album);
      else goTo(stops.findIndex((s) => s.stop.kind === 'album' && s.stop.album === c.album));
    } else if (mode === 'focus') {
      setTour(false);
      leaveFocus();
    }
  };
  const onLeave = () => {
    parallax.tx = parallax.ty = 0;
  };

  // Safari on a Mac sends trackpad pinches as gesture events
  let gestureZoom = 1;
  type Gesture = Event & { scale: number; clientX: number; clientY: number };
  const onGestureStart = (e: Event) => {
    e.preventDefault();
    gestureZoom = zoomTarget;
  };
  const onGestureChange = (e: Event) => {
    e.preventDefault();
    if (paused || !ready) return;
    const g = e as Gesture;
    setTour(false);
    setZoom(gestureZoom * g.scale, ...ndcAt(g.clientX, g.clientY));
  };

  // ↑ ↓ (and W S) walk like the wheel for as long as they are held; ← → go from stop to stop
  const WALK_CODES: Record<string, 1 | -1> = { ArrowUp: 1, KeyW: 1, ArrowDown: -1, KeyS: -1 };
  const walkKeys = new Set<string>();
  let walkFast = false;
  const walkDir = () => {
    let d = 0;
    walkKeys.forEach((c) => (d += WALK_CODES[c]));
    return Math.sign(d);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    walkKeys.delete(e.code);
    walkFast = e.shiftKey;
  };
  const onBlur = () => walkKeys.clear();

  const onKey = (e: KeyboardEvent) => {
    if (paused || !ready || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target as HTMLElement | null;
    const onControl = !!el?.closest?.('button, a, input, select, textarea');
    const fwd = opts.rtl ? ['ArrowLeft', 'PageDown'] : ['ArrowRight', 'PageDown'];
    const bwd = opts.rtl ? ['ArrowRight', 'PageUp'] : ['ArrowLeft', 'PageUp'];
    const k = e.key;
    let handled = true;
    if (k === 'Escape') {
      setTour(false);
      if (mode === 'focus') leaveFocus();
      else if (zoomTarget > 1.001) setZoom(1);
      else on.exit();
    } else if (e.code in WALK_CODES) {
      walkFast = e.shiftKey;
      if (!walkKeys.has(e.code)) {
        walkKeys.add(e.code);
        setTour(false);
        leaveFocus();
        setZoom(1);
      }
    } else if (k === '+' || k === '=') {
      setTour(false);
      setZoom(zoomTarget * 1.4);
    } else if (k === '-' || k === '_') {
      setZoom(zoomTarget / 1.4);
    } else if (k === '0') {
      setZoom(1);
    } else if (fwd.includes(k)) {
      setTour(false);
      nextFrom(1);
    } else if (bwd.includes(k)) {
      setTour(false);
      nextFrom(-1);
    } else if (k === 'Home') {
      setTour(false);
      api.goToStart();
    } else if (k === 'End') {
      setTour(false);
      goTo(stops.length - 1);
    } else if ((k === 'Enter' || k === ' ') && !onControl) {
      if (mode === 'focus' && focus.cluster) on.openAlbum(focus.cluster.album);
      else nextFrom(1);
    } else handled = false;
    if (handled) {
      e.preventDefault();
      interact();
    }
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onLeave);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  if (!coarse) {
    window.addEventListener('gesturestart', onGestureStart);
    window.addEventListener('gesturechange', onGestureChange);
  }
  canvas.style.cursor = 'grab';

  // ---------- size ----------
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    baseFov = camera.aspect < 0.8 ? 74 : camera.aspect < 1.25 ? 66 : 58;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) / zoom));
    camera.updateProjectionMatrix();
    if (reflector) {
      const pr = renderer.getPixelRatio() * 0.6;
      reflector.getRenderTarget().setSize(Math.round(w * pr), Math.round(h * pr));
    }
    if (mode === 'focus' && focus.cluster) focusCluster(focus.cluster);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  // ---------- loop ----------
  const timer = new THREE.Timer();
  let raf = 0;
  const frame = (time: number) => {
    raf = requestAnimationFrame(frame);
    timer.update(time);
    const dt = Math.min(0.05, timer.getDelta());
    if (!ready || paused) return;
    update(dt);
    renderer.render(scene, camera);
  };

  function update(dt: number) {
    sinceMode += dt;
    if (intro > 0) intro -= dt;

    if (tour) {
      tourTimer -= dt;
      if (tourTimer <= 0) {
        if (stopIndex >= stops.length - 1) {
          setTour(false);
        } else {
          goTo(stopIndex + 1);
          const k = stops[stopIndex].stop.kind;
          tourTimer = k === 'album' ? 4.6 : k === 'gate' ? 3.2 : 1;
        }
      }
    }

    parallax.x += (parallax.tx - parallax.x) * damp(3, dt);
    parallax.y += (parallax.ty - parallax.y) * damp(3, dt);

    zoom += (zoomTarget - zoom) * damp(opts.reducedMotion ? 30 : 7, dt);
    const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) / zoom));
    if (Math.abs(camera.fov - fov) > 0.005) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const calm = 1 / zoom;

    let kPos: number;
    let kRot: number;
    let dYaw: number;
    let dPitch: number;
    const held = paused ? 0 : walkDir();
    if (held && mode === 'free') walkTarget = clamp(walkTarget - held * KEY_WALK * (walkFast ? 2 : 1) * dt, MIN_Z, MAX_Z);
    if (mode === 'free') {
      const wanted = clamp((walkTarget - walkZ) * 3, -MAX_SPEED, MAX_SPEED);
      walkV += (wanted - walkV) * damp(opts.reducedMotion ? 20 : 4.5, dt);
      walkZ += walkV * dt;
      if (Math.abs(walkV) > 1.2 && !pointer.down && !held) {
        userYaw *= Math.exp(-dt * 1.6);
        userPitch *= Math.exp(-dt * 1.6);
      }
      const bob = opts.reducedMotion ? 0 : Math.sin(walkZ * 2.1) * Math.min(1, Math.abs(walkV) / 4) * 0.018;
      desired.set(parallax.x * 0.22, EYE + bob, walkZ);
      dYaw = userYaw + zoomYaw - parallax.x * 0.09 * calm;
      dPitch = 0.03 + userPitch + zoomPitch - parallax.y * 0.05 * calm;
      const blend = Math.min(1, sinceMode / 1.3);
      kPos = intro > 0 ? 1.5 : 2.4 + blend * 7;
      kRot = intro > 0 ? 1.6 : 2.6 + blend * 5;
    } else {
      desired.copy(focus.pos);
      dYaw = focus.yaw + zoomYaw - parallax.x * 0.04 * calm;
      dPitch = focus.pitch + zoomPitch - parallax.y * 0.03 * calm;
      kPos = 2.5;
      kRot = 3;
    }
    if (opts.reducedMotion) {
      kPos *= 3;
      kRot *= 3;
    }
    camPos.lerp(desired, damp(kPos, dt));
    yaw += (dYaw - yaw) * damp(kRot, dt);
    pitch += (dPitch - pitch) * damp(kRot, dt);
    camera.position.copy(camPos);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    walker.position.set(camPos.x * 0.5, 3.4, camPos.z - 2.2);

    // hover: the picture leans out a little, its light gets warmer
    for (const c of clusters) {
      const target = c === hovered || c === focus.cluster ? 1 : 0;
      if (Math.abs(c.hover - target) < 0.001) continue;
      c.hover += (target - c.hover) * damp(8, dt);
      const s = 1 + c.hover * 0.02;
      c.group.scale.set(s, s, 1 + c.hover * 2);
      (c.wash.material as THREE.MeshBasicMaterial).opacity = 0.3 + c.hover * 0.22;
    }

    // what the page around shows: room, place along the hall, end reached
    const zRef = mode === 'focus' && focus.cluster ? focus.cluster.zCenter : camPos.z;
    let room = -1;
    archZ.forEach((a, i) => zRef < a + GATE_VIEW + 1 && (room = i));
    if (room !== lastRoom) {
      lastRoom = room;
      on.room(room);
    }
    // Place along the hall, one equal segment per year (so it lines up with the year bar)
    let along = 0;
    archZ.forEach((a, r) => {
      if (camPos.z >= a) return;
      const end = r + 1 < archZ.length ? archZ[r + 1] : END_STOP;
      along = (r + clamp((a - camPos.z) / (a - end), 0, 1)) / archZ.length;
    });
    if (Math.abs(along - lastAlong) > 0.001) {
      lastAlong = along;
      on.along(along);
    }
    const atEnd = mode === 'free' && camPos.z < END_STOP + 3;
    if (atEnd !== lastEnd) {
      lastEnd = atEnd;
      on.end(atEnd);
    }
    // keep the stop counter in step when walking freely
    if (mode === 'free' && !tour) {
      let i = -1;
      stops.forEach((s, k) => s.z >= walkZ - 0.5 && (i = k));
      stopIndex = i;
    }
  }

  manager.onProgress = (_url, loaded, total) => on.progress(loaded, total);
  manager.onLoad = () => {
    if (ready) return;
    ready = true;
    on.ready();
  };
  raf = requestAnimationFrame(frame);

  const api: MuseumApi = {
    next: () => {
      interact();
      setTour(false);
      nextFrom(1);
    },
    prev: () => {
      interact();
      setTour(false);
      nextFrom(-1);
    },
    goToRoom: (r) => {
      interact();
      setTour(false);
      goTo(stops.findIndex((s) => s.stop.kind === 'gate' && s.stop.room === r));
    },
    goToStart: () => {
      setTour(false);
      leaveFocus();
      stopIndex = -1;
      walkTarget = START_Z;
      on.stop(null);
    },
    back: () => {
      setTour(false);
      leaveFocus();
    },
    setTour: (v) => {
      interact();
      setTour(v);
    },
    zoomIn: () => {
      interact();
      setTour(false);
      setZoom(zoomTarget * 1.4);
    },
    zoomOut: () => setZoom(zoomTarget / 1.4),
    zoomReset: () => setZoom(1),
    setPaused: (p) => {
      paused = p;
      walkKeys.clear();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      timer.dispose();
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('gesturestart', onGestureStart);
      window.removeEventListener('gesturechange', onGestureChange);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh && o.geometry !== geo.box && o.geometry !== geo.plane) o.geometry.dispose();
      });
      for (const d of disposables) d.dispose();
      envTex.dispose();
      renderer.dispose();
      canvas.remove();
    }
  };
  return api;
}
