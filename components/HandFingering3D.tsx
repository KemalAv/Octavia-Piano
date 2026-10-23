import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { MidiNotePlaybackItem, KeyPosition, FingeringPreferences, HandPose } from '../types';
import { PIANO_KEYS_CONFIG } from '../constants';
import { keyX, keyboardMapper } from './handScene';

interface Props {
  notes: MidiNotePlaybackItem[];
  poses: HandPose[];
  timeMs: number;
  handSize?: FingeringPreferences['handSize'];
  leftHandColor: string;
  rightHandColor: string;
  preview?: boolean;
  overlay?: {
    keyPositions: KeyPosition[];
    width: number;
    whiteKeyHeight: number;
    blackKeyHeight: number;
  };
}

type Side = 'left' | 'right';

/** Animated 2D targets for one hand (screen pixels, x grows toward the pinky in local space). */
interface HandState {
  palm: number;
  rel: number[];
  tipY: number[];
  down: boolean[];
  lift: number;
}

const BLACK_KEYS = [1, 3, 6, 8, 10];
const isBlackKey = (midi: number) => BLACK_KEYS.includes(midi % 12);

// ---------------------------------------------------------------------------------------------
// Anatomy (all lengths in "white key widths", 1 key ~ 2.35 cm, so values match an adult hand)
// ---------------------------------------------------------------------------------------------
// Longer, larger, open adult pianist hand with natural adaptive spread (mekar)
const FINGER_TOTAL = [4.6, 5.0, 4.6, 4.2]; // index, middle, ring, pinky (longer reach across keys)
const FINGER_SPLIT = [0.47, 0.27, 0.26];
const FINGER_R = [0.34, 0.36, 0.34, 0.28]; // full, fleshy fingers
const KNUCKLE_X = [-1.35, -0.45, 0.45, 1.35]; // wide knuckle breadth across palm
const KNUCKLE_Y = [1.45, 1.62, 1.48, 1.28];
const FAN_X = [-0.45, 0.0, 0.40, 0.85]; // wide open fanning spread across keys (lebih renggang)

const THUMB_BASE = new THREE.Vector3(-1.15, 0.20, 0.05); // upper-mid thenar base
const THUMB_ROOT = THUMB_BASE;
const THUMB_LEN = [1.8, 1.4, 1.2]; // total = 4.4 kw
const THUMB_R = [0.42, 0.36, 0.30, 0.26];

const PALM_TO_REST_TIP = 4.1; // realistic palm-to-tip distance
const HAND_HOVER = 1.95; // elevated dorsal arch
const LEFT_HAND_EXTRA_LIFT = 0.35;
const BASE_WIDTH_SCALE = 1.26; // wider open hand span (tangan lebih besar dan renggang)
const HAND_SCALE = 0.94; // full adult hand size (besar panjang)

// // Skin and shadow textures
// ---------------------------------------------------------------------------------------------
function makeBumpTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 150 + Math.random() * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function makeShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(10,16,30,0.75)');
  grad.addColorStop(1, 'rgba(10,16,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------------------------
// Skeleton solver: 3-bone FABRIK with dynamic stretch so fingers 100% reach target keys
// ---------------------------------------------------------------------------------------------
function solveChain(pts: THREE.Vector3[], lens: number[], target: THREE.Vector3) {
  const root = pts[0];
  const baseTotal = lens.reduce((a, b) => a + b, 0);

  let dx = target.x - root.x;
  let dy = target.y - root.y;
  let dz = target.z - root.z;

  let d_xy = Math.sqrt(dx * dx + dy * dy);
  const ux = d_xy < 1e-4 ? 0 : dx / d_xy;
  const uy = d_xy < 1e-4 ? 1 : dy / d_xy;
  let dist = Math.sqrt(d_xy * d_xy + dz * dz);

  // Dynamic stretch when target is far (e.g. wide chord / mekar)
  // Ensures the fingertip reaches 100% of the target distance without short-changing!
  const maxReach = baseTotal * 0.96;
  const stretch = dist > maxReach ? dist / maxReach : 1.0;
  const curLens = stretch > 1.0 ? lens.map((l) => l * stretch) : lens;
  const total = baseTotal * stretch;

  const effectiveMax = total * 0.96;
  const minReach = total * 0.35;
  if (dist > effectiveMax) {
    const sc = effectiveMax / dist;
    d_xy *= sc;
    dz *= sc;
  } else if (dist < minReach) {
    const sc = minReach / dist;
    d_xy *= sc;
    dz *= sc;
  }

  // Smooth natural curvature (biasa aja, melengkung wajar tanpa nekuk aneh)
  const p0: [number, number] = [0.0, 0.0];
  const p3: [number, number] = [d_xy, dz];
  const p1: [number, number] = [d_xy * 0.38, Math.max(0.06 * total, dz * 0.15 + 0.12 * total)];
  const p2: [number, number] = [d_xy * 0.70, dz * 0.50];
  const chain: [number, number][] = [p0, p1, p2, p3];

  for (let it = 0; it < 8; it++) {
    chain[3] = [p3[0], p3[1]];
    for (let i = 2; i >= 0; i--) {
      const dr = chain[i][0] - chain[i + 1][0];
      const dz_i = chain[i][1] - chain[i + 1][1];
      const seg = Math.sqrt(dr * dr + dz_i * dz_i);
      if (seg > 1e-5) {
        chain[i][0] = chain[i + 1][0] + (dr / seg) * curLens[i];
        chain[i][1] = chain[i + 1][1] + (dz_i / seg) * curLens[i];
      }
    }
    chain[0] = [p0[0], p0[1]];
    for (let i = 0; i < 3; i++) {
      let dr = chain[i + 1][0] - chain[i][0];
      let dz_i = chain[i + 1][1] - chain[i][1];
      if (i === 0) dz_i = Math.max(dz_i, 0.06); // maintain natural dome arch
      dr = Math.max(dr, 0.05);
      const seg = Math.sqrt(dr * dr + dz_i * dz_i);
      if (seg > 1e-5) {
        chain[i + 1][0] = chain[i][0] + (dr / seg) * curLens[i];
        chain[i + 1][1] = chain[i][1] + (dz_i / seg) * curLens[i];
      }
    }
  }

  for (let i = 1; i <= 3; i++) {
    pts[i].set(root.x + chain[i][0] * ux, root.y + chain[i][0] * uy, root.z + chain[i][1]);
  }
}

// One fully modelled hand: palm, metacarpal ridges, knuckles, 3-phalanx fingers, thumb, nails,
// wrist, forearm. Built once in kw units, scaled to the keyboard and posed every frame.
// ---------------------------------------------------------------------------------------------
class Segment {
  group = new THREE.Group();
  mesh: THREE.Mesh;
  joint: THREE.Mesh;
  nail?: THREE.Mesh;
  crease?: THREE.Mesh;
  constructor(skin: THREE.Material, rStart: number, rEnd: number, thick: number, withNail: boolean, rNail = 0) {
    const geo = new THREE.CylinderGeometry(rEnd, rStart, 1, 24, 1, false);
    geo.translate(0, 0.5, 0);
    this.mesh = new THREE.Mesh(geo, skin);
    this.mesh.scale.set(1, 1, thick);
    this.joint = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin);
    this.joint.scale.set(rStart * 1.02, rStart * 1.02, rStart * 1.02 * thick);
    this.group.add(this.mesh, this.joint);
    if (withNail) {
      this.nail = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 14),
        new THREE.MeshPhysicalMaterial({ color: '#ba957d', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 })
      );
      this.nail.scale.set(rNail * 0.72, rNail * 0.95, rNail * 0.16);
      this.group.add(this.nail);
    }
  }
  pose(a: THREE.Vector3, b: THREE.Vector3, rEnd: number, thick: number) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    this.group.position.copy(a);
    this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.mesh.scale.y = len;
    if (this.nail) this.nail.position.set(0, len * 0.6, rEnd * 0.9 * thick);
  }
}

class HandRig {
  root = new THREE.Group();
  inner = new THREE.Group();
  cuffMat = new THREE.MeshStandardMaterial({ color: '#a000ff', roughness: 0.4, metalness: 0.1 });
  fingerPts: THREE.Vector3[][] = [];
  fingers: Segment[][] = [];
  thumb: Segment[] = [];
  thumbPts: THREE.Vector3[] = [];
  knuckleMeshes: THREE.Mesh[] = [];
  thenarMesh!: THREE.Mesh;
  rings: THREE.Mesh[] = [];

  constructor(skin: THREE.Material) {
    this.root.add(this.inner);
    const add = (m: THREE.Object3D) => this.inner.add(m);
    const ellip = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), skin);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      add(m);
      return m;
    };

    // Smooth, fleshy, healthy palm dorsum (no skeletal bone ridges)
    ellip(0.0, 0.15, 0.05, 1.45, 1.55, 0.50);
    ellip(0.0, 0.85, 0.12, 1.30, 0.65, 0.40); // smooth knuckle transition pad
    this.thenarMesh = ellip(-0.80, -0.15, -0.05, 0.75, 1.15, 0.48); // thenar
    ellip(0.95, -0.40, -0.05, 0.55, 1.05, 0.42); // hypothenar

    // Wrist and Forearm
    ellip(0.0, -1.50, -0.10, 0.95, 0.75, 0.55);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 6.0, 32), skin);
    arm.position.set(0.0, -4.5, -0.15);
    arm.scale.set(1, 1, 0.80);
    add(arm);

    // Smooth, fleshy knuckles embedded into the palm (ZERO exposed skeletal bones / tidak keliatan tulang!)
    for (let i = 0; i < 4; i++) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), skin);
      k.position.set(KNUCKLE_X[i], KNUCKLE_Y[i], 0.12);
      k.scale.set(FINGER_R[i] * 1.08, FINGER_R[i] * 1.08, FINGER_R[i] * 0.92);
      add(k);
      this.knuckleMeshes.push(k);
    }

    // coloured cuff to tell hands apart
    const cuffWrap = new THREE.Group();
    cuffWrap.position.set(0.0, -2.4, -0.12);
    cuffWrap.scale.set(1, 1, 0.80);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.09, 14, 40), this.cuffMat);
    cuff.rotation.x = Math.PI / 2;
    cuffWrap.add(cuff);
    add(cuffWrap);

    // fingers
    for (let i = 0; i < 4; i++) {
      const total = FINGER_TOTAL[i];
      const r0 = FINGER_R[i];
      const radii = [0, 1, 2, 3].map((j) => r0 * (1 - 0.26 * (j / 3)));
      const segs = [0, 1, 2].map((j) => {
        const s = new Segment(skin, radii[j], radii[j + 1], 0.88, j === 2, radii[2]);
        // Smooth continuous skin without fake black crease cuts (matching image_aa02f9.png)
        add(s.group);
        return s;
      });
      this.fingers.push(segs);
      const root = new THREE.Vector3(KNUCKLE_X[i], KNUCKLE_Y[i], 0.12);
      const lens = FINGER_SPLIT.map((f) => f * total);
      const pts = [root.clone()];
      for (let j = 0; j < 3; j++) pts.push(pts[j].clone().add(new THREE.Vector3(0, lens[j] * 0.9, j === 0 ? lens[j] * 0.4 : -0.05)));
      this.fingerPts.push(pts);
    }

    // thumb
    this.thumbPts = [THUMB_BASE.clone()];
    for (let j = 0; j < 3; j++) this.thumbPts.push(this.thumbPts[j].clone().add(new THREE.Vector3(-0.3, THUMB_LEN[j] * 0.9, 0.1)));
    for (let j = 0; j < 3; j++) {
      const s = new Segment(skin, THUMB_R[j], THUMB_R[j + 1], 0.9, j === 2, THUMB_R[3]);
      add(s.group);
      this.thumb.push(s);
    }
  }

  dispose() {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
    });
  }
}

export function HandFingering3D({
  notes,
  timeMs,
  leftHandColor,
  rightHandColor,
  preview = false,
  overlay,
}: Props) {
  const bgRef = useRef<HTMLCanvasElement>(null); // standalone keyboard
  const glRef = useRef<HTMLCanvasElement>(null); // WebGL hands
  const hudRef = useRef<HTMLCanvasElement>(null); // finger numbers
  const live = useRef({ timeMs, leftHandColor, rightHandColor });
  live.current = { timeMs, leftHandColor, rightHandColor };
  const [collapsed, setCollapsed] = useState(false);
  const smooth = useRef<Record<Side, HandState | null>>({ left: null, right: null });

  const toScreen = useMemo(() => {
    const defs = new Map(PIANO_KEYS_CONFIG.map((k) => [k.name, k.midiNote]));
    const list = (overlay?.keyPositions || []).flatMap((k) =>
      defs.has(k.name) ? [{ midi: defs.get(k.name)!, x: k.x, width: k.width }] : []
    );
    return keyboardMapper(list);
  }, [overlay?.keyPositions]);

  const keyPx = useMemo(() => {
    const all = overlay?.keyPositions || [];
    if (all.length < 2) return 26;
    const maxW = Math.max(...all.map((k) => k.width));
    const whites = all.filter((k) => k.width >= maxW * 0.8).sort((a, b) => a.x - b.x);
    return whites.length > 1 ? (whites[whites.length - 1].x - whites[0].x) / (whites.length - 1) : maxW;
  }, [overlay?.keyPositions]);

  const score = useMemo(() => {
    const sorted = [...notes].sort((a, b) => a.timeMs - b.timeMs);
    const reach = sorted.map((n) => n.timeMs + n.durationMs);
    for (let i = 1; i < reach.length; i++) reach[i] = Math.max(reach[i], reach[i - 1]);
    const lo = notes.reduce((v, n) => Math.min(v, n.midi), 48);
    const hi = notes.reduce((v, n) => Math.max(v, n.midi), 84);
    return {
      sorted,
      reach,
      byHand: {
        left: sorted.filter((n) => n.hand === 'left'),
        right: sorted.filter((n) => n.hand === 'right'),
      } as Record<Side, MidiNotePlaybackItem[]>,
      lo: Math.max(21, Math.floor((lo - 4) / 12) * 12),
      hi: Math.min(108, Math.ceil((hi + 4) / 12) * 12),
    };
  }, [notes]);

  useEffect(() => {
    if (collapsed) return;
    const gl = glRef.current;
    const hud = hudRef.current;
    if (!gl || !hud) return;
    const hctx = hud.getContext('2d');
    if (!hctx) return;

    // ---- three.js scene ------------------------------------------------------------------
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: gl, alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 4000);
    scene.add(new THREE.HemisphereLight(0xfff6f0, 0x8a6e60, 1.25));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(0, 450, 700); // centered from above so both hands are equally well-lit
    scene.add(sun);
    const fillLight = new THREE.DirectionalLight(0xffdfcb, 0.75);
    fillLight.position.set(-350, 150, 350);
    scene.add(fillLight);
    const fillRight = new THREE.DirectionalLight(0xffdfcb, 0.75);
    fillRight.position.set(350, 150, 350);
    scene.add(fillRight);

    const bump = makeBumpTexture();
    const skin = new THREE.MeshPhysicalMaterial({
      color: '#a88267', // Warm matte caramel skin matching image_aa02f9.png
      roughness: 0.72,
      bumpScale: 0.0, // Clean smooth skin without noise speckles
      sheen: 0.45,
      sheenColor: new THREE.Color('#cfa285'),
      sheenRoughness: 0.6,
    });
    const shadowTex = makeShadowTexture();

    const rigs: Record<Side, HandRig> = { left: new HandRig(skin), right: new HandRig(skin) };
    const blobs: Record<Side, THREE.Mesh> = {
      left: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })),
      right: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })),
    };
    (['left', 'right'] as Side[]).forEach((s) => {
      scene.add(blobs[s]);
      scene.add(rigs[s].root);
    });

    let raf = 0;
    let prev = performance.now();
    const t0 = prev;
    const tmpV = new THREE.Vector3();

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      const dt = Math.min(64, now - prev);
      if (dt < 15) return;
      prev = now;

      const W = gl.clientWidth;
      const H = gl.clientHeight;
      if (!W || !H) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      if (hud.width !== Math.round(W * dpr) || hud.height !== Math.round(H * dpr)) {
        hud.width = Math.round(W * dpr);
        hud.height = Math.round(H * dpr);
      }
      hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hctx.clearRect(0, 0, W, H);

      // Orthographic camera: 1:1 pixel exact, eliminates 100% of parallax distortion across all pitches!
      camera.left = 0;
      camera.right = W;
      camera.top = 0;
      camera.bottom = -H;
      camera.near = 0.1;
      camera.far = 4000;
      camera.position.set(0, 0, 1000);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      const kw = keyPx;
      const t = live.current.timeMs;
      const px = (midi: number) => {
        if (overlay) return toScreen(keyX(midi));
        const a = keyX(score.lo);
        const b = keyX(score.hi);
        const k = Math.min((W - 32) / (b - a + 8), (H - 30) / 30);
        return W / 2 + (keyX(midi) - (a + b) / 2) * k;
      };

      // standalone mini keyboard (2D underlay)
      const bg = bgRef.current;
      const bctx = bg?.getContext('2d');
      if (bg && bctx && !overlay) {
        if (bg.width !== Math.round(W * dpr) || bg.height !== Math.round(H * dpr)) {
          bg.width = Math.round(W * dpr);
          bg.height = Math.round(H * dpr);
        }
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        bctx.clearRect(0, 0, W, H);
        const top = H * 0.08;
        const kh = H * 0.75;
        bctx.fillStyle = '#f8fafc';
        bctx.fillRect(16, top, W - 32, kh);
        bctx.strokeStyle = '#cbd5e1';
        for (let m = score.lo; m <= score.hi; m++) if (!isBlackKey(m)) bctx.strokeRect(px(m) - kw / 2, top, kw, kh);
        bctx.fillStyle = '#1e293b';
        for (let m = score.lo; m <= score.hi; m++) if (isBlackKey(m)) bctx.fillRect(px(m) - kw * 0.28, top, kw * 0.56, kh * 0.62);
      }

      // notes currently sounding
      const sounding: MidiNotePlaybackItem[] = [];
      {
        let a = 0;
        let b = score.sorted.length;
        while (a < b) {
          const m = (a + b) >> 1;
          if (score.reach[m] <= t) a = m + 1;
          else b = m;
        }
        for (let i = a; i < score.sorted.length && score.sorted[i].timeMs <= t; i++) {
          const n = score.sorted[i];
          if (n.timeMs + n.durationMs > t) sounding.push(n);
        }
      }

      // ---- finger targets (same playing logic as before, in screen space) ----------------
      const restTip = H * 0.18; // reach deep into keys
      const restLen = [0, -0.08, 0, 0.08, 0.32].map((v) => v * kw);
      const knuckleOffsets = [-2.40, KNUCKLE_X[0] - 0.2, KNUCKLE_X[1], KNUCKLE_X[2] + 0.1, KNUCKLE_X[3] + 0.3];
      const spread = knuckleOffsets.map((x) => x * HAND_SCALE * BASE_WIDTH_SCALE * kw);
      const demo = 1 + (Math.floor((now - t0) / 750) % 5);
      const breathe = Math.sin((now - t0) / 500);

      const solve = (side: Side): HandState => {
        const right = side === 'right';
        const dir = right ? 1 : -1;
        const homeMidi = right ? 67 : 52;
        const mine = sounding.filter((n) => n.hand === side);
        const palmFor = (midi: number, finger: number) => px(midi) - dir * spread[Math.min(4, Math.max(0, finger - 1))];

        const down = [false, false, false, false, false];
        const rel = [...spread];
        const tipY = restLen.map((o) => restTip + o + breathe);
        let palm = palmFor(homeMidi, 3);

        const picks: { midi: number; finger: number }[] = [];
        for (let f = 1; f <= 5; f++) {
          if (preview && f === demo) picks.push({ midi: right ? 65 + f * 2 : 55 - (6 - f) * 2, finger: f });
          else {
            const n = mine.find((x) => x.finger === f);
            if (n) picks.push({ midi: n.midi, finger: f });
          }
        }

        if (picks.length) {
          const anchor = px(picks[picks.length - 1].midi);
          const usable = picks.filter((p) => Math.abs(px(p.midi) - anchor) <= kw * 11);
          if (usable.length) {
            palm = usable.reduce((s, p) => s + palmFor(p.midi, p.finger), 0) / usable.length;
            for (const p of usable) {
              const i = p.finger - 1;
              down[i] = true;
              rel[i] = dir * (px(p.midi) - palm);
              tipY[i] = restTip - kw * (isBlackKey(p.midi) ? 0.4 : 0.22);
            }
            const idx = [0, 1, 2, 3, 4].filter((i) => down[i]);
            for (let i = 0; i < 5; i++) {
              if (down[i]) continue;
              const a = [...idx].reverse().find((k) => k < i);
              const b = idx.find((k) => k > i);
              if (a !== undefined && b !== undefined) {
                rel[i] = rel[a] + ((rel[b] - rel[a]) * (i - a)) / (b - a);
              } else if (b !== undefined) {
                // Keep fingers spread out to the left of the active finger
                rel[i] = rel[b] - (spread[b] - spread[i]);
              } else if (a !== undefined) {
                // Keep fingers spread out to the right of the active finger
                rel[i] = rel[a] + (spread[i] - spread[a]);
              }
            }
          }
        } else {
          const list = score.byHand[side];
          let a = 0;
          let b = list.length;
          while (a < b) {
            const m = (a + b) >> 1;
            if (list[m].timeMs <= t) a = m + 1;
            else b = m;
          }
          const last = a > 0 ? list[a - 1] : undefined;
          const next = list[a];
          const lastPalm = last ? palmFor(last.midi, last.finger || 3) : palm;
          palm = lastPalm;
          if (next) {
            const wait = next.timeMs - t;
            if (wait >= 0 && wait <= 380) {
              const k = 0.5 - 0.5 * Math.cos((1 - wait / 380) * Math.PI);
              palm = lastPalm + (palmFor(next.midi, next.finger || (right ? 1 : 5)) - lastPalm) * k;
            }
          }
        }

        // Keep fingers relaxed and apart, but never move a pressed finger off its key:
        // only idle fingers are pushed away from their neighbours.
        const minGap = kw * 1.15; // fingers stay cleanly separated without clumping
        for (let pass = 0; pass < 6; pass++) {
          for (let i = 1; i < 5; i++) {
            const d = rel[i] - rel[i - 1];
            if (d >= minGap) continue;
            const need = minGap - d;
            if (down[i] && down[i - 1]) continue;
            if (down[i]) rel[i - 1] -= need;
            else if (down[i - 1]) rel[i] += need;
            else {
              rel[i] += need / 2;
              rel[i - 1] -= need / 2;
            }
          }
        }
        return { palm, rel, tipY, down, lift: 0 };
      };

      const sides: Side[] = ['left', 'right'];
      const k = 1 - Math.pow(1 - 0.28, dt / 16);
      const cur = sides.map((side) => {
        const target = solve(side);
        const s = smooth.current[side];
        if (!s) {
          smooth.current[side] = target;
          return target;
        }
        s.palm += (target.palm - s.palm) * k;
        for (let i = 0; i < 5; i++) {
          s.rel[i] += (target.rel[i] - s.rel[i]) * k;
          s.tipY[i] += (target.tipY[i] - s.tipY[i]) * (k * 1.2);
          s.down[i] = target.down[i];
        }
        return s;
      });

      const gap = cur[1].palm - cur[0].palm;
      cur[0].lift = gap < 0 ? Math.min(22, 10 + -gap * 0.15) : gap < 60 ? (1 - gap / 60) * 10 : 0;

      // ---- pose each rig -------------------------------------------------------------------
      const palmScreenY = restTip + PALM_TO_REST_TIP * kw * HAND_SCALE;
      sides.forEach((side, si) => {
        const s = cur[si];
        const rig = rigs[side];
        const left = side === 'left';
        const tintHex = left ? live.current.leftHandColor : live.current.rightHandColor;
        rig.cuffMat.color.set(tintHex || (left ? '#007dff' : '#a000ff'));

        // Dynamic width & mekar when playing wide intervals/chords
        const minRel = Math.min(...s.rel);
        const maxRel = Math.max(...s.rel);
        const spanKeys = (maxRel - minRel) / kw;
        const spreadFactor = Math.min(1.0, Math.max(0, (spanKeys - 3.5) / 4.5));
        const dynamicWidth = BASE_WIDTH_SCALE * (1.0 + spreadFactor * 0.18);

        const hoverZ = (HAND_HOVER + (left ? LEFT_HAND_EXTRA_LIFT : 0)) * kw * HAND_SCALE + s.lift;
        rig.root.position.set(s.palm, -palmScreenY, hoverZ);
        rig.root.scale.set(1, 1, 1);
        rig.inner.scale.set((left ? -1 : 1) * kw * HAND_SCALE * dynamicWidth, kw * HAND_SCALE, kw * HAND_SCALE);

        // Target derived directly from hand's actual position relative to note (sesuai posisi tangan sama notnya)
        const tipLocal = (i: number) => {
          const isAct = s.down[i];
          const isBlack = s.tipY[i] < restTip - 0.3 * kw;
          let wz = isBlack ? (isAct ? 0.38 : 0.55) : (isAct ? 0.05 : 0.22);

          let forward = (palmScreenY - s.tipY[i]) / (kw * HAND_SCALE);
          if (i === 0) forward -= 1.1; // thumb strikes slightly lower on the white key

          let targetX = 0;
          if (i === 0) {
            // Thumb: reaches note when active; natural open C-curve outside index finger when inactive
            if (isAct) {
              targetX = s.rel[0] / (kw * HAND_SCALE * dynamicWidth);
            } else {
              const targetX1 = s.rel[1] / (kw * HAND_SCALE * dynamicWidth);
              targetX = Math.min(-2.2, targetX1 - 1.4);
            }
          } else {
            // Fingers 2..5 (index..pinky):
            // Inactive fingers also follow interpolated s.rel[i] so the whole hand opens/mekar naturally!
            targetX = s.rel[i] / (kw * HAND_SCALE * dynamicWidth);
          }

          return new THREE.Vector3(
            targetX,
            forward,
            (wz * kw - hoverZ) / (kw * HAND_SCALE)
          );
        };

        // Pose fingers: index..pinky
        for (let f = 0; f < 4; f++) {
          const lens = FINGER_SPLIT.map((p) => p * FINGER_TOTAL[f]);
          const target = tipLocal(f + 1);

          // Dynamic knuckle abduction when fanning out wide
          const baseKnuckleX = KNUCKLE_X[f];
          let kx = baseKnuckleX;
          if (f === 3 && target.x > baseKnuckleX) {
            kx = baseKnuckleX + (target.x - baseKnuckleX) * 0.25;
          } else if (f === 0 && target.x < baseKnuckleX) {
            kx = baseKnuckleX + (target.x - baseKnuckleX) * 0.20;
          }
          const knucklePos = new THREE.Vector3(kx, KNUCKLE_Y[f], 0.12);
          rig.fingerPts[f][0].copy(knucklePos);
          if (rig.knuckleMeshes[f]) rig.knuckleMeshes[f].position.copy(knucklePos);

          const pts = rig.fingerPts[f];
          solveChain(pts, lens, target);
          const r0 = FINGER_R[f];
          const radii = [0, 1, 2, 3].map((j) => r0 * (1 - 0.26 * (j / 3)));
          rig.fingers[f].forEach((seg, j) => seg.pose(pts[j], pts[j + 1], radii[j + 1], 0.88));
        }

        // Pose thumb
        {
          const target = tipLocal(0);
          // Thumb abducts smoothly outward and forward towards its note
          const abductX = Math.min(0, (target.x - THUMB_BASE.x) * 0.32);
          const abductY = Math.max(-0.2, Math.min(0.5, (target.y - 3.0) * 0.22));
          const thumbRoot = new THREE.Vector3(THUMB_BASE.x + abductX, THUMB_BASE.y + abductY, THUMB_BASE.z);
          rig.thumbPts[0].copy(thumbRoot);
          if (rig.thenarMesh) {
            rig.thenarMesh.position.set(-0.80 + abductX * 0.35, -0.15 + abductY * 0.3, -0.05);
          }

          const pts = rig.thumbPts;
          solveChain(pts, THUMB_LEN, target);
          rig.thumb.forEach((seg, j) => seg.pose(pts[j], pts[j + 1], THUMB_R[j + 1], 0.9));
        }

        // soft contact shadow on the keys
        const blob = blobs[side];
        blob.position.set(s.palm, -(palmScreenY - 1.0 * kw), 0.5);
        blob.scale.set(kw * 5.6 * dynamicWidth, kw * 6.8, 1);
        (blob.material as THREE.MeshBasicMaterial).opacity = Math.max(0.15, 0.68 - s.lift * 0.02);
      });

      renderer.render(scene, camera);

      // ---- finger numbers (projected from the 3D fingertip positions) ---------------------
      sides.forEach((side, si) => {
        const s = cur[si];
        const rig = rigs[side];
        const left = side === 'left';
        const tint = left ? live.current.leftHandColor : live.current.rightHandColor;
        const r = Math.max(5.5, kw * 0.20);
        for (let i = 0; i < 5; i++) {
          const pts = i === 0 ? rig.thumbPts : rig.fingerPts[i - 1];
          tmpV.copy(pts[3]);
          tmpV.z += 0.1;
          rig.inner.localToWorld(tmpV);
          tmpV.project(camera);
          const bx = ((tmpV.x + 1) / 2) * W;
          const by = ((1 - tmpV.y) / 2) * H + kw * 0.25;
          hctx.beginPath();
          hctx.arc(bx, by, r, 0, Math.PI * 2);
          hctx.fillStyle = s.down[i] ? tint : 'rgba(15,23,42,0.82)';
          hctx.fill();
          hctx.lineWidth = 1.1;
          hctx.strokeStyle = s.down[i] ? '#fff' : 'rgba(255,255,255,0.45)';
          hctx.stroke();
          hctx.fillStyle = '#fff';
          hctx.font = `bold ${Math.round(r * 1.35)}px system-ui, sans-serif`;
          hctx.textAlign = 'center';
          hctx.textBaseline = 'middle';
          hctx.fillText(String(i + 1), bx, by + 0.5);
        }
      });

      if (!overlay) {
        hctx.textAlign = 'left';
        hctx.textBaseline = 'alphabetic';
        hctx.fillStyle = '#94a3b8';
        hctx.font = '11px system-ui';
        hctx.fillText(preview ? 'Finger movement preview' : '3D hands', 12, H - 9);
      }
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      rigs.left.dispose();
      rigs.right.dispose();
      skin.dispose();
      bump.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, [score, collapsed, preview, overlay?.whiteKeyHeight, overlay?.blackKeyHeight, toScreen, keyPx]);

  const layers = (
    <>
      {!overlay && <canvas ref={bgRef} className="absolute inset-0 w-full h-full" />}
      <canvas ref={glRef} className="absolute inset-0 w-full h-full" aria-label="3D hands showing fingering on the piano keys" />
      <canvas ref={hudRef} className="absolute inset-0 w-full h-full" />
    </>
  );

  if (overlay) {
    return (
      <div
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: overlay.width, height: overlay.whiteKeyHeight, zIndex: 35 }}
      >
        {layers}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center px-3 py-2 text-xs text-cyan-300">
        <span>3D Hands</span>
        <div className="flex gap-3">
          {!preview && (
            <button type="button" onClick={() => setCollapsed((v) => !v)} aria-expanded={!collapsed}>
              {collapsed ? 'Show' : 'Collapse'}
            </button>
          )}
        </div>
      </div>
      {!collapsed && <div className="relative w-full h-[205px] touch-none cursor-default">{layers}</div>}
    </div>
  );
}
