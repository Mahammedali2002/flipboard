'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ---------------- Config ---------------- */
// Grootte van het grid (LED matrix: 84 breed, 28 hoog)
const GRID_W = 84;
const GRID_H = 28;
// Grootte van één dot in pixels
const DOT = 6;
const CANVAS_W = GRID_W * DOT;
const CANVAS_H = GRID_H * DOT
// Percentage dat gevuld moet worden om te winnen
const WIN_PCT = 80  ;

/* ---------------- Characters font ---------------- */
// Letters in 5x5 pixelstijl, gebruikt voor teksten als "WELCOME TEAM"
const characters: Record<string, number[][]> = {
  "W":[[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,1,1,0]],
  "E":[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
  "L":[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  "C":[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],
  "O":[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  "M":[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  "T":[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  "A":[[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  "N":[[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1]],
  "I":[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  "S":[[0,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
  "G":[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,1,1],[1,0,0,0,1],[0,1,1,1,1]],
  "V":[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  "R":[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0]],
  " ":[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
};

/* ---------------- Buffer ---------------- */
// DotBuffer = virtuele LED-matrix (kan 1 of 0 per pixel opslaan)
class DotBuffer {
  w:number; h:number; data:Uint8Array;
  constructor(w:number,h:number){this.w=w;this.h=h;this.data=new Uint8Array(w*h);}
  clear(v=0){this.data.fill(v);} // alles leegmaken
  set(x:number,y:number,v=1){if(x>=0&&y>=0&&x<this.w&&y<this.h)this.data[y*this.w+x]=v?1:0;}
  get(x:number,y:number){return(x>=0&&y>=0&&x<this.w&&y<this.h)?this.data[y*this.w+x]:0;}
}

/* ---------------- Helpers ---------------- */
// Tekst renderen op de dot-matrix
function renderCustomText(text:string,align:'center'|'left'|'right',buf:DotBuffer,spacing=1){
  const charW=5,charH=5,totalW=text.length*(charW+spacing)-spacing;
  const startX=align==='center'?Math.floor((buf.w-totalW)/2):0;
  const startY=Math.floor((buf.h-charH)/2);
  for(let i=0;i<text.length;i++){
    const matrix=characters[text[i].toUpperCase()]||characters[" "];
    const offX=startX+i*(charW+spacing);
    for(let y=0;y<charH;y++)for(let x=0;x<charW;x++)if(matrix[y][x])buf.set(offX+x,startY+y,1);
  }
}

// Timer die ticks genereert (fps = 30)
function useTicker(fps=30){
  const[tick,setTick]=useState(0);
  useEffect(()=>{
    const iv=setInterval(()=>setTick(t=>t+1),1000/fps);
    return()=>clearInterval(iv)
  },[fps]);
  return tick;
}

// Tekenen van de buffer naar canvas
function drawBuffer(ctx:CanvasRenderingContext2D,buf:DotBuffer){
  ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
  ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  for(let y=0;y<buf.h;y++)for(let x=0;x<buf.w;x++){
    const on=buf.get(x,y);
    ctx.beginPath();
    ctx.arc(x*DOT+DOT/2,y*DOT+DOT/2,DOT/2.25,0,Math.PI*2);
    ctx.fillStyle=on?'white':'#111';
    ctx.fill();
  }
}

/* ---------------- Game utils ---------------- */
type Dir='UP'|'DOWN'|'LEFT'|'RIGHT'|null;
interface Enemy{x:number;y:number;vx:number;vy:number;}

// Check of coördinaten binnen het grid vallen
function inBounds(x:number,y:number){return x>=0&&y>=0&&x<GRID_W&&y<GRID_H;}

// Helper om een lege 2D-array te maken
function makeEmpty<T>(w:number,h:number,v:T):T[][]{return Array.from({length:h},()=>Array.from({length:w},()=>v));}

// Buren (4 richtingen)
function neighbors4(x:number,y:number){return[[x+1,y],[x-1,y],[x,y+1],[x,y-1]] as const;}

// Floodfill: bepaalt welke cellen bereikbaar blijven voor vijanden
function floodKeep(walls:boolean[][],enemies:Enemy[]){
  const keep=makeEmpty(GRID_W,GRID_H,false);
  const seen=makeEmpty(GRID_W,GRID_H,false);
  const q:[number,number][]=[];
  for(const e of enemies){
    const ex=Math.round(e.x),ey=Math.round(e.y);
    if(!inBounds(ex,ey)||walls[ey][ex])continue;
    q.push([ex,ey]);seen[ey][ex]=keep[ey][ex]=true;
  }
  while(q.length){
    const[cx,cy]=q.shift()!;
    for(const[nx,ny]of neighbors4(cx,cy)){
      if(!inBounds(nx,ny)||seen[ny][nx]||walls[ny][nx])continue;
      seen[ny][nx]=keep[ny][nx]=true;
      q.push([nx,ny]);
    }
  }
  return keep;
}

// Canvas ref hook
function useDotCanvas(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  return{canvasRef,getCtx:()=>canvasRef.current?.getContext('2d')??null} as const;
}

/* ---------------- Main component ---------------- */
export default function FlipdotGame(){
  // Scenes: welkom of paxcon spel
  const [scene,setScene]=useState<'WELCOME'|'PAXCON'>('WELCOME');
  const [playing,setPlaying]=useState(false);
  const [score,setScore]=useState(0);
  const [lives,setLives]=useState(3);
  const [gameOver,setGameOver]=useState(false);
  const [win,setWin]=useState(false);
  const [dir,setDir]=useState<Dir>(null);
  const [player,setPlayer]=useState({x:1,y:1});
  const [trail,setTrail]=useState<Set<string>>(new Set());
  // Walls met rand gevuld
  const [walls,setWalls]=useState<boolean[][]>(()=>{const w=makeEmpty(GRID_W,GRID_H,false);for(let x=0;x<GRID_W;x++){w[0][x]=w[GRID_H-1][x]=true;}for(let y=0;y<GRID_H;y++){w[y][0]=w[y][GRID_W-1]=true;}return w;});
  // Enemies met snelheid
  const [enemies,setEnemies]=useState<Enemy[]>([{x:GRID_W/2,y:GRID_H/2,vx:0.5,vy:0.37},{x:GRID_W/3,y:GRID_H/3,vx:-0.4,vy:0.45}]);

  const tick=useTicker(30);
  const {canvasRef,getCtx}=useDotCanvas();
  const buf=useMemo(()=>new DotBuffer(GRID_W,GRID_H),[]);

  /* keyboard controls */
  useEffect(()=>{
    function onKey(e:KeyboardEvent){
      if(scene!=='PAXCON')return;
      const k=e.key.toLowerCase();
      if(k==='arrowup')setDir('UP');
      if(k==='arrowdown')setDir('DOWN');
      if(k==='arrowleft')setDir('LEFT');
      if(k==='arrowright')setDir('RIGHT');
    }
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey)
  },[scene]);

  /* main game loop */
  useEffect(()=>{
    if(scene!=='PAXCON'||gameOver||win)return;

  setEnemies(prev => prev.map(e => {
  let nx = e.x + e.vx;
  let ny = e.y + e.vy;

  // check botsing horizontaal
  if (walls[Math.round(e.y)]?.[Math.round(nx)]) {
    e.vx *= -1;
    nx = e.x + e.vx;
  }

  // check botsing verticaal
  if (walls[Math.round(ny)]?.[Math.round(e.x)]) {
    e.vy *= -1;
    ny = e.y + e.vy;
  }

  return { ...e, x: nx, y: ny };
}));


    // Speler beweegt
    if(!playing||!dir)return;
    if(tick%2!==0)return; // trager bewegen (elke 2 ticks)

    setPlayer(p=>{
      let nx=p.x,ny=p.y;
      if(dir==='UP')ny--;
      if(dir==='DOWN')ny++;
      if(dir==='LEFT')nx--;
      if(dir==='RIGHT')nx++;
      if(!inBounds(nx,ny))return p;

      const onWall=walls[ny][nx];

      // Trail opslaan (ook zichtbaar maken als je van muur komt)
      setTrail(t=>{const nt=new Set(t);nt.add(`${nx},${ny}`);return nt;});

      // Check: enemy raakt je trail?
      const hit=enemies.some(e=>trail.has(`${Math.round(e.x)},${Math.round(e.y)}`));
      if(hit){
        setLives(L=>{const nl=L-1;if(nl<=0){setGameOver(true);setPlaying(false);}return Math.max(0,nl);});
        setTrail(new Set());
        return{x:1,y:1};
      }

      // Trail sluiten = gebied invullen
      if(onWall&&trail.size>0){
        setWalls(old=>{
          const temp=old.map(r=>r.slice());
          trail.forEach(s=>{const[sx,sy]=s.split(',').map(Number);temp[sy][sx]=true;});
          const keep=floodKeep(temp,enemies);
          let gained=0;
          for(let y=1;y<GRID_H-1;y++)for(let x=1;x<GRID_W-1;x++)if(!temp[y][x]&&!keep[y][x]){temp[y][x]=true;gained++;}
          setScore(s=>s+gained);
          return temp;
        });
        setTrail(new Set());
      }

      return{ x:nx,y:ny};
    });
  },[tick,playing,dir,scene,gameOver,win]);

  /* render */
  useEffect(()=>{
    const ctx=getCtx();if(!ctx)return;
    buf.clear(0);

    if(scene==='WELCOME'){renderCustomText('WELCOME TEAM','center',buf);}
    else if(scene==='PAXCON'){
      if(gameOver){renderCustomText('GAME OVER','center',buf);}
      else if(win){renderCustomText('Winner!','center',buf);}
      else {
        // muren
        for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++)if(walls[y][x])buf.set(x,y,1);
        // trai
        trail.forEach(s=>{const[tx,ty]=s.split(',').map(Number);buf.set(tx,ty,1);});
        // enemies
        enemies.forEach(e=>buf.set(Math.round(e.x),Math.round(e.y),1));
        // speler laten knipperen
        if(tick%20<10){buf.set(player.x,player.y,1);}else{buf.set(player.x,player.y,0);}
      }
    }

    drawBuffer(ctx,buf);
  },[tick,scene,walls,trail,enemies,player,buf,getCtx,gameOver,win]);

  /* start/reset */
  function startPaxcon(){
    setScene('PAXCON');setScore(0);setLives(3);setGameOver(false);setWin(false);
    setDir(null);setTrail(new Set());
    const w=makeEmpty<boolean>(GRID_W,GRID_H,false);
    for(let x=0;x<GRID_W;x++){w[0][x]=w[GRID_H-1][x]=true;}
    for(let y=0;y<GRID_H;y++){w[y][0]=w[y][GRID_W-1]=true;}
    setWalls(w);setPlayer({x:1,y:1});
    setEnemies([{x:GRID_W/2,y:GRID_H/2,vx:0.5,vy:0.37},{x:GRID_W/3,y:GRID_H/3,vx:-0.4,vy:0.45}]);
    setPlaying(true);
  }
  function backToWelcome(){setScene('WELCOME');setGameOver(false);setWin(false);setPlaying(false);}

  // Bereken percentage gevuld
  const capturedPct=(()=>{
    let filled=0;
    for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++)if(walls[y][x])filled++;
    const pct=Math.round((filled/(GRID_W*GRID_H))*100);
    if(scene==='PAXCON'&&!win&&!gameOver&&pct>=WIN_PCT){setWin(true);setPlaying(false);}
    return pct;
  })();

  /* UI */
  return(
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-black p-6">
      <h1 className="text-white text-xl">Flipdots Paxcon</h1>
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="block rounded-md border border-neutral-700"/>
      <div className="flex gap-2 flex-wrap justify-center">
        {scene==='WELCOME'&&<button onClick={startPaxcon} className="px-6 py-2 bg-emerald-600 text-white rounded shadow">Start Paxcon</button>}
        {scene==='PAXCON'&&!gameOver&&!win&&<>
          <button onClick={()=>setPlaying(p=>!p)} className="px-4 py-2 bg-indigo-600 text-white rounded">{playing?'Pauze':'Verder'}</button>
          <button onClick={startPaxcon} className="px-4 py-2 bg-yellow-600 text-white rounded">Herstart</button>
          <button onClick={backToWelcome} className="px-4 py-2 bg-gray-600 text-white rounded">Terug</button>
        </>}
        {scene==='PAXCON'&&(gameOver||win)&&<>
          <button onClick={startPaxcon} className="px-6 py-2 bg-red-600 text-white rounded">Herstart</button>
          <button onClick={backToWelcome} className="px-6 py-2 bg-gray-600 text-white rounded">Terug</button>
        </>}
      </div>
      {scene==='PAXCON'&&<div className="text-neutral-300">Score {score} • {capturedPct}% gevuld • Levens {lives}</div>}
    </main>
  );
}
