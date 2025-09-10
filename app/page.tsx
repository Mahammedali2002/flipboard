'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';

// --- Display config (exact 84 × 28 dots) ---
const GRID_W = 84;
const GRID_H = 28;
const DOT = 6; // px per dot (canvas scale)
const CANVAS_W = GRID_W * DOT;
const CANVAS_H = GRID_H * DOT;

// --- Characters dot font (5x5 bitmaps) ---
const characters: Record<string, number[][]> = {
  "0":[[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]],
  "1":[[1,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  "2":[[1,1,1,1,0],[0,0,0,0,1],[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,1]],
  "3":[[1,1,1,1,0],[0,0,0,0,1],[1,1,1,1,1],[0,0,0,0,1],[1,1,1,1,1]],
  "4":[[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1]],
  "5":[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,1],[0,0,0,0,1],[1,1,1,1,0]],
  "6":[[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1]],
  "7":[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
  "8":[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[0,1,1,1,1]],
  "9":[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[0,0,0,0,1],[1,1,1,1,1]],
  "A":[[0,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  "B":[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1]],
  "C":[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  "D":[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
  "E":[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
  "F":[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  "G":[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,1,1],[1,0,0,0,1],[1,1,1,1,1]],
  "H":[[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  "I":[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  "J":[[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1]],
  "K":[[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  "L":[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  "M":[[0,1,1,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1]],
  "N":[[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  "O":[[0,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  "P":[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0]],
  "Q":[[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,0],[1,1,1,0,1]],
  "R":[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  "S":[[0,1,1,1,1],[1,0,0,0,0],[1,1,1,1,1],[0,0,0,0,1],[1,1,1,1,0]],
  "T":[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  "U":[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  "V":[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  "W":[[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,1,1,0]],
  "X":[[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  "Y":[[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0]],
  "Z":[[1,1,1,1,1],[0,0,0,0,1],[0,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
  " ":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  "!":[[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
  ".":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,0]],
  "-":[[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
};

// --- Low-level dot buffer ---
class DotBuffer {
  w: number; h: number; data: Uint8Array;
  constructor(w: number, h: number) { this.w = w; this.h = h; this.data = new Uint8Array(w * h); }
  clear(v = 0) { this.data.fill(v); }
  set(x: number, y: number, v = 1) { if (x>=0 && y>=0 && x<this.w && y<this.h) this.data[y*this.w + x] = v ? 1 : 0; }
  get(x: number, y: number) { return (x>=0 && y>=0 && x<this.w && y<this.h) ? this.data[y*this.w + x] : 0; }
}

// --- Render with characters font ---
function renderCustomText(text: string, align: 'center' | 'left' | 'right', buf: DotBuffer, spacing = 1) {
  const charW = 5, charH = 5;
  const totalW = text.length * (charW + spacing) - spacing;
  let startX = 0;
  if (align === 'center') startX = Math.floor((buf.w - totalW) / 2);
  if (align === 'right') startX = buf.w - totalW;
  const startY = Math.floor((buf.h - charH) / 2);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toUpperCase();
    const matrix = characters[ch] || characters[" "];
    const offX = startX + i * (charW + spacing);
    for (let y = 0; y < charH; y++) {
      for (let x = 0; x < charW; x++) {
        if (matrix[y][x]) buf.set(offX + x, startY + y, 1);
      }
    }
  }
}

function renderCustomScrolling(text: string, offsetX: number, buf: DotBuffer, spacing = 1) {
  const charW = 5, charH = 5;
  const totalW = text.length * (charW + spacing);
  const startY = Math.floor((buf.h - charH) / 2);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toUpperCase();
    const matrix = characters[ch] || characters[" "];
    const charX = i * (charW + spacing) - Math.floor(offsetX);
    for (let y = 0; y < charH; y++) {
      for (let x = 0; x < charW; x++) {
        const px = charX + x;
        if (px >= 0 && px < buf.w && matrix[y][x]) buf.set(px, startY + y, 1);
      }
    }
  }
}

// --- Utils ---
function useTicker(fps = 30) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000 / fps);
    return () => clearInterval(iv);
  }, [fps]);
  return tick;
}

function drawBuffer(ctx: CanvasRenderingContext2D, buf: DotBuffer) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (let y = 0; y < buf.h; y++) {
    for (let x = 0; x < buf.w; x++) {
      const on = buf.get(x, y);
      ctx.beginPath();
      ctx.arc(x * DOT + DOT / 2, y * DOT + DOT / 2, DOT / 2.25, 0, Math.PI * 2);
      ctx.fillStyle = on ? 'white' : '#111';
      ctx.shadowColor = on ? 'rgba(255,255,255,0.35)' : 'transparent';
      ctx.shadowBlur = on ? 2 : 0;
      ctx.fill();
    }
  }
}

// --- Scenes ---
type SceneId = 'WELCOME' | 'PROJECT' | 'COUNTER' | 'MILESTONES' | 'QUOTES';

const MILESTONES = [
  'STEF ROCKT 3 JAAR BIJ OWOW!',
  'AICHA 1 JAAR IN HET TEAM!',
  'Q3 TARGET GEHAALD!'
];
const QUOTES = [
  'SMALL STEPS BIG IMPACT',
  'BUILD SHIP LEARN REPEAT',
  'MAKE IT SIMPLE POWERFUL'
];

function useDotCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;
  return { canvasRef, getCtx } as const;
}

export default function TeamSparkFlipdots() {
  const [scene, setScene] = useState<SceneId>('WELCOME');
  const [impact, setImpact] = useState<number>(1024512);
  const [pendingProject, setPendingProject] = useState<string | null>(null);
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const tick = useTicker(30);

  const { canvasRef, getCtx } = useDotCanvas();
  const buf = useMemo(() => new DotBuffer(GRID_W, GRID_H), []);

  // Timers
  useEffect(() => {
    const seq = ['WELCOME','COUNTER','MILESTONES','QUOTES'] as SceneId[];
    let i = 0;
    const durations: Record<SceneId, number> = {
      WELCOME: 4000, PROJECT: 3000, COUNTER: 4000, MILESTONES: 6000, QUOTES: 4000,
    };
    let timer: any;
    function advance() {
      if (pendingProject) { setScene('PROJECT'); timer = setTimeout(advance, durations.PROJECT); setPendingProject(null); return; }
      i = (i + 1) % seq.length; setScene(seq[i]); timer = setTimeout(advance, durations[seq[i]]);
    }
    setScene(seq[i]);
    timer = setTimeout(advance, durations[seq[i]]);
    return () => clearTimeout(timer);
  }, [pendingProject]);

  // Render
  useEffect(() => {
    const ctx = getCtx(); if (!ctx) return;
    buf.clear(0);

    if (scene === 'WELCOME') {
      renderCustomText('WELCOME TEAM!', 'center', buf);
      for (let i = 0; i < 60; i++) {
        const x = Math.floor(Math.random() * GRID_W);
        const y = Math.floor(Math.random() * GRID_H);
        if (Math.random() < 0.15) buf.set(x, y, 1);
      }
    }
    else if (scene === 'PROJECT') {
      renderCustomText('NEW PROJECT LIVE!', 'center', buf);
      for (let c = 0; c < 18; c++) {
        const col = Math.floor(Math.random() * GRID_W);
        for (let y = 0; y < GRID_H; y++) if (Math.random() < 0.6) buf.set(col, y, 1);
      }
    }
    else if (scene === 'COUNTER') {
      renderCustomText(impact.toString(), 'center', buf);
      const sub = new DotBuffer(GRID_W, GRID_H);
      renderCustomText('PEOPLE REACHED', 'center', sub);
      for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) if (sub.get(x, y)) buf.set(x, y+8, 1);
    }
    else if (scene === 'MILESTONES') {
      const text = MILESTONES[milestoneIndex % MILESTONES.length];
      const speed = 0.8;
      const offset = (tick * speed) % (GRID_W * 3);
      renderCustomScrolling(text + '   •   ', GRID_W * 2 - offset, buf);
      if (tick % 240 === 0) setMilestoneIndex(i => i + 1);
    }
    else if (scene === 'QUOTES') {
      const text = QUOTES[quoteIndex % QUOTES.length];
      renderCustomText(text, 'center', buf);
      if (tick % 120 === 0) setQuoteIndex(i => i + 1);
    }

    drawBuffer(ctx, buf);
  }, [tick, scene, impact, milestoneIndex, quoteIndex]);

  const triggerProject = () => setPendingProject('New Project');
  const nudgeImpact = (delta = 1234) => setImpact(v => v + delta);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-black p-6">
      <h1 className="text-white text-xl">Flipdots-projecties: Team Spark</h1>
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block rounded-md border border-neutral-700 shadow-md shadow-black/30" />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={triggerProject} className="h-10 px-4 rounded-md bg-neutral-700 text-white hover:bg-neutral-600">Nieuw project flash</button>
        <button onClick={() => nudgeImpact(5000)} className="h-10 px-4 rounded-md bg-neutral-700 text-white hover:bg-neutral-600">+5k impact</button>
        <button onClick={() => setScene('WELCOME')} className="h-10 px-4 rounded-md bg-neutral-800 text-white hover:bg-neutral-700">Welcome</button>
        <button onClick={() => setScene('COUNTER')} className="h-10 px-4 rounded-md bg-neutral-800 text-white hover:bg-neutral-700">Counter</button>
        <button onClick={() => setScene('MILESTONES')} className="h-10 px-4 rounded-md bg-neutral-800 text-white hover:bg-neutral-700">Milestones</button>
        <button onClick={() => setScene('QUOTES')} className="h-10 px-4 rounded-md bg-neutral-800 text-white hover:bg-neutral-700">Quotes</button>
      </div>
      <p className="text-neutral-400 text-sm text-center max-w-xl">
        Scenes lopen automatisch in een lus. Klik op <em>Nieuw project flash</em> om tussendoor de confetti-animatie te triggeren.
      </p>
    </main>
  );
}
