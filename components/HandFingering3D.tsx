import React,{useEffect,useMemo,useRef,useState} from 'react';
import type {MidiNotePlaybackItem,KeyPosition} from '../types';
import type {FingeringPreferences,HandPose} from '../fingeringApi';
import {PIANO_KEYS_CONFIG} from '../constants';
import {box,limb,keyX,currentPose,smoothPose,keyboardMapper,SIZE_FACTORS,type Face,type Point} from './handScene';

interface Props {notes:MidiNotePlaybackItem[];poses:HandPose[];timeMs:number;handSize:FingeringPreferences['handSize'];leftHandColor:string;rightHandColor:string;preview?:boolean;overlay?:{keyPositions:KeyPosition[];width:number;whiteKeyHeight:number;blackKeyHeight:number};}
export function HandFingering3D({notes,poses,timeMs,handSize,leftHandColor,rightHandColor,preview=false,overlay}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);
 const live=useRef({timeMs,handSize,leftHandColor,rightHandColor});live.current={timeMs,handSize,leftHandColor,rightHandColor};
 const view=useRef({yaw:0,tilt:.95,drag:false,x:0,y:0});
 const [collapsed,setCollapsed]=useState(false);
 const byHand=useMemo(()=>({left:poses.filter(p=>p.hand==='left'),right:poses.filter(p=>p.hand==='right')}),[poses]);
 const mapKeyboard=useMemo(()=>{
  const definitions=new Map(PIANO_KEYS_CONFIG.map(k=>[k.name,k.midiNote]));
  return keyboardMapper((overlay?.keyPositions||[]).flatMap(k=>definitions.has(k.name)?[{midi:definitions.get(k.name)!,x:k.x,width:k.width}]:[]));
 },[overlay?.keyPositions]);
 const song=useMemo(()=>{
   const sorted=[...notes].sort((a,b)=>a.timeMs-b.timeMs);
   const ends=sorted.map(n=>n.timeMs+n.durationMs);
   for(let i=1;i<ends.length;i++)ends[i]=Math.max(ends[i],ends[i-1]);
   const pitches=notes.map(n=>n.midi);
   const bySide={
     left: sorted.filter(n=>n.hand==='left'),
     right: sorted.filter(n=>n.hand==='right')
   };
   return {sorted,ends,bySide,min:Math.max(21,Math.floor((pitches.reduce((v,p)=>Math.min(v,p),48)-4)/12)*12),max:Math.min(108,Math.ceil((pitches.reduce((v,p)=>Math.max(v,p),84)+4)/12)*12)};
 },[notes]);
 useEffect(()=>{
  if(collapsed)return;
  const c=canvas.current;if(!c)return;
  const ctx=c.getContext('2d');if(!ctx)return;
  let frame=0,last=0,start=performance.now();
  const draw=(now:number)=>{
   frame=requestAnimationFrame(draw);if(now-last<33)return;last=now;
   const width=c.clientWidth,height=c.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
   if(!width||!height)return;
   if(c.width!==Math.round(width*dpr)||c.height!==Math.round(height*dpr)){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
   const t=live.current.timeMs,f=SIZE_FACTORS[live.current.handSize];
   let low=0,high=song.sorted.length;
   while(low<high){const m=(low+high)>>>1;if(song.ends[m]<=t)low=m+1;else high=m;}
   const active:MidiNotePlaybackItem[]=[];
   for(let i=low;i<song.sorted.length&&song.sorted[i].timeMs<=t;i++){const n=song.sorted[i];if(n.timeMs+n.durationMs>t)active.push(n);}
   const demoFinger=1+Math.floor((now-start)/700)%5;
   const minX=keyX(song.min),maxX=keyX(song.max),center=(minX+maxX)/2;
   const worldWidth=maxX-minX+8;
   const scale=Math.min((width-24)/worldWidth,(height-45)/31);
   const project=(p:Point)=>{
    if(overlay)return {x:mapKeyboard(p[0]),y:overlay.whiteKeyHeight*.35-p[1]*(overlay.whiteKeyHeight/18)-p[2]*(overlay.whiteKeyHeight/30),depth:p[2]+p[1]*.2};
    const x=p[0]-center,y=p[1],z=p[2];const {yaw,tilt}=view.current;
    const a=x*Math.cos(yaw)-y*Math.sin(yaw),b=x*Math.sin(yaw)+y*Math.cos(yaw);
    const depth=b*Math.cos(tilt)-z*Math.sin(tilt),vertical=b*Math.sin(tilt)+z*Math.cos(tilt);
    const perspective=200/(200-depth);
    return {x:width/2+a*scale*perspective,y:height*.58-vertical*scale*perspective,depth};
   };
   const faces:Face[]=[];
   ctx.globalAlpha=overlay?.9:1;
   if(!overlay)for(let midi=song.min;midi<=song.max;midi++){
    const black=[1,3,6,8,10].includes(midi%12),pressed=active.some(n=>n.midi===midi);
    faces.push(...box(keyX(midi),black?3:0,pressed?-.22:0,black?1.25:2.26,black?8:14,black?1.7:.6,pressed?'#22d3ee':black?'#202b40':'#e2e8f0'));
   }
   const labels:{point:Point;text:string;color:string}[]=[];

   // Natural anatomical spacing relative to palm center (finger 3 = index 2)
   const fingerOffset = (fingerIdx: number, side: 'left' | 'right') =>
     (side === 'right' ? fingerIdx - 2 : 2 - fingerIdx) * 2.4 * f;

   const computeStateFromCluster = (side: 'left' | 'right', cluster: MidiNotePlaybackItem[]) => {
     const defaultBase = keyX(side === 'left' ? 53 : 72);
     if (!cluster.length) {
       return {
         palmX: defaultBase,
         fingerX: [0, 1, 2, 3, 4].map(i => defaultBase + fingerOffset(i, side))
       };
     }
     let impliedPalmSum = 0;
     let count = 0;
     for (const n of cluster) {
       const finger = n.finger || (side === 'right' ? 1 : 5);
       impliedPalmSum += keyX(n.midi) - fingerOffset(finger - 1, side);
       count++;
     }
     const palmX = count > 0 ? impliedPalmSum / count : defaultBase;
     const fingerX = [0, 1, 2, 3, 4].map(i => palmX + fingerOffset(i, side));

     for (const n of cluster) {
       const finger = n.finger || (side === 'right' ? 1 : 5);
       if (finger >= 1 && finger <= 5) {
         fingerX[finger - 1] = keyX(n.midi);
       }
     }

     const pressedIndices = cluster
       .map(n => (n.finger ? n.finger - 1 : side === 'right' ? 0 : 4))
       .filter(idx => idx >= 0 && idx <= 4);

     for (let i = 0; i < 5; i++) {
       if (!pressedIndices.includes(i)) {
         let lo = -1, hi = -1;
         for (const p of pressedIndices) {
           if (p < i && (lo === -1 || p > lo)) lo = p;
           if (p > i && (hi === -1 || p < hi)) hi = p;
         }
         if (lo !== -1 && hi !== -1) {
           const weight = (i - lo) / (hi - lo);
           fingerX[i] = fingerX[lo] + (fingerX[hi] - fingerX[lo]) * weight;
         }
       }
     }

     if (side === 'right') {
       for (let i = 1; i < 5; i++) fingerX[i] = Math.max(fingerX[i], fingerX[i - 1] + 1.2 * f);
       for (let i = 3; i >= 0; i--) fingerX[i] = Math.min(fingerX[i], fingerX[i + 1] - 1.2 * f);
     } else {
       for (let i = 1; i < 5; i++) fingerX[i] = Math.min(fingerX[i], fingerX[i - 1] - 1.2 * f);
       for (let i = 3; i >= 0; i--) fingerX[i] = Math.max(fingerX[i], fingerX[i + 1] + 1.2 * f);
     }

     return { palmX: fingerX[2], fingerX };
   };

   // Calculate smooth continuous positions for both hands
   const handStates = (['left', 'right'] as const).map(side => {
     const handColor = side === 'left' ? live.current.leftHandColor : live.current.rightHandColor;
     const sideNotes = active.filter(n => n.hand === side);
     const poseData = smoothPose(byHand[side], t) || (currentPose(byHand[side], t) ? { positions: currentPose(byHand[side], t)!.positions, jumpLift: 0 } : undefined);
     const defaultBase = keyX(side === 'left' ? 53 : 72);
     const handSongNotes = song.bySide[side];

     let fingerX: number[];
     let palmX: number;
     let jumpLift = 0;

     if (sideNotes.length > 0) {
       const activeState = computeStateFromCluster(side, sideNotes);
       palmX = activeState.palmX;
       fingerX = activeState.fingerX;
       jumpLift = 0;
     } else {
       let lo = 0, hi = handSongNotes.length;
       while (lo < hi) {
         const mid = (lo + hi) >>> 1;
         if (handSongNotes[mid].timeMs <= t) lo = mid + 1;
         else hi = mid;
       }
       const nextNote = handSongNotes[lo];
       const prevNote = lo > 0 ? handSongNotes[lo - 1] : undefined;

       if (nextNote) {
         const nextCluster = handSongNotes.filter(n => Math.abs(n.timeMs - nextNote.timeMs) < 30);
         const nextState = computeStateFromCluster(side, nextCluster);
         const prevState = prevNote
           ? computeStateFromCluster(side, handSongNotes.filter(n => Math.abs(n.timeMs - prevNote.timeMs) < 30))
           : { palmX: defaultBase, fingerX: [0, 1, 2, 3, 4].map(i => defaultBase + fingerOffset(i, side)) };

         const timeToNext = nextNote.timeMs - t;
         const windowMs = Math.min(420, prevNote ? Math.max(80, (nextNote.timeMs - (prevNote.timeMs + prevNote.durationMs)) * 0.85) : 420);

         if (timeToNext <= windowMs && timeToNext >= 0) {
           const progress = 1 - timeToNext / windowMs;
           const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
           const palmDist = Math.abs(nextState.palmX - prevState.palmX);
           jumpLift = Math.min(3.2, Math.max(0, palmDist * 0.12)) * Math.sin(progress * Math.PI);
           palmX = prevState.palmX + (nextState.palmX - prevState.palmX) * ease;
           fingerX = prevState.fingerX.map((v, i) => v + (nextState.fingerX[i] - v) * ease);
         } else if (prevNote) {
           if (poseData) {
             palmX = poseData.positions[2];
             fingerX = [...poseData.positions];
           } else {
             palmX = prevState.palmX;
             fingerX = [...prevState.fingerX];
           }
         } else {
           const timeToFirst = nextNote.timeMs - t;
           const introWindow = Math.min(800, Math.max(200, nextNote.timeMs));
           if (timeToFirst <= introWindow && timeToFirst >= 0) {
             const progress = 1 - timeToFirst / introWindow;
             const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
             palmX = defaultBase + (nextState.palmX - defaultBase) * ease;
             fingerX = [0, 1, 2, 3, 4].map(i => {
               const restX = defaultBase + fingerOffset(i, side);
               return restX + (nextState.fingerX[i] - restX) * ease;
             });
           } else {
             palmX = defaultBase;
             fingerX = [0, 1, 2, 3, 4].map(i => defaultBase + fingerOffset(i, side));
           }
         }
       } else if (prevNote) {
         const prevState = computeStateFromCluster(side, handSongNotes.filter(n => Math.abs(n.timeMs - prevNote.timeMs) < 30));
         palmX = poseData ? poseData.positions[2] : prevState.palmX;
         fingerX = poseData ? [...poseData.positions] : [...prevState.fingerX];
       } else {
         palmX = defaultBase;
         fingerX = [0, 1, 2, 3, 4].map(i => defaultBase + fingerOffset(i, side));
       }
     }

     if (poseData && poseData.jumpLift) {
       jumpLift = Math.max(jumpLift, poseData.jumpLift);
     }

     return { side, handColor, sideNotes, fingerX, palmX, jumpLift };
   });

   const [leftH,rightH]=handStates;

   // Detect Hand Crossing & collision avoidance:
   // Left hand is normally on the lower keyboard: leftH.palmX < rightH.palmX.
   // When Left hand crosses over Right hand into treble (dx <= 0), or approaches close proximity:
   const dx=rightH.palmX-leftH.palmX;
   let leftElevationZ=0,leftOffsetY=0;
   let rightElevationZ=0,rightOffsetY=0;
   const proximityThreshold=14*f;

   if(dx<0){
    // Direct Hand Cross: Left hand arches high over Right hand
    const crossDist=-dx;
    leftElevationZ=3.6+Math.min(3.0,crossDist*0.12);
    leftOffsetY=-1.8;
    rightElevationZ=-0.5;
    rightOffsetY=0.8;
   }else if(dx<proximityThreshold){
    // Approaching hand cross / close proximity clearance
    const prox=(proximityThreshold-dx)/proximityThreshold;
    const easeProx=prox*prox*(3-2*prox);
    leftElevationZ=easeProx*2.6;
    leftOffsetY=-easeProx*1.2;
    rightElevationZ=-easeProx*0.4;
    rightOffsetY=easeProx*0.6;
   }

   for(const h of handStates){
    const {side,handColor,sideNotes,fingerX,palmX,jumpLift}=h;
    const elevationZ=side==='left'?leftElevationZ:rightElevationZ;
    const offsetY=side==='left'?leftOffsetY:rightOffsetY;

    // Ergonomic human wrist and palm height
    const palmZ=3.3+jumpLift+elevationZ;
    const palmY=-9+offsetY;

    // 1. Palm body
    faces.push(...limb(palmX,palmY,palmZ,4.8*f,3.5*f,1.5*f,handColor));

    // 2. Wrist joint
    const wristX=palmX+(side==='left'?-1.8:1.8)*f;
    const wristY=palmY-4.2;
    const wristZ=palmZ+0.35;
    faces.push(...limb(wristX,wristY,wristZ,3.8*f,2.4*f,1.3*f,handColor));

    // 3. Forearm (depth towards player)
    const armX=palmX+(side==='left'?-4.2:4.2)*f;
    const armY=palmY-9.8;
    const armZ=palmZ+1.1;
    faces.push(...limb(armX,armY,armZ,3.4*f,4.6*f,1.4*f,handColor));

    // 4. Five fingers with natural strike dynamics
    const anyPressed=preview||sideNotes.length>0;
    for(let i=0;i<5;i++){
     const note=sideNotes.find(n=>n.finger===i+1);
     const pressed=preview?i+1===demoFinger:!!note;

     let z:number;
     let y:number;

     if(pressed){
      const noteProgressMs=note?Math.max(0,live.current.timeMs-note.timeMs):50;
      const strikeP=Math.min(1,noteProgressMs/40);
      const strikeEase=0.5-0.5*Math.cos(strikeP*Math.PI);
      const startZ=2.4+jumpLift*0.3+elevationZ*0.2;
      z=startZ-(startZ-1.15)*strikeEase;
      y=[-3.8,-2,-1.4,-2,-3.8][i];
     }else{
      const sympathy=anyPressed?0.25:0;
      z=2.7+jumpLift+elevationZ+sympathy;
      y=[-3.8,-2,-1.4,-2,-3.8][i]+offsetY*0.4;
     }

     faces.push(...limb(
      fingerX[i],
      y,
      z,
      [.8,.7,.75,.7,.6][i]*f,
      [2.5,3,3.1,3.05,2.5][i],
      .65*f,
      handColor
     ));

     labels.push({
      point:[fingerX[i],y+1,z+1],
      text:String(i+1),
      color:pressed?'#ffffff':handColor
     });
    }
   }
   const polygons=faces.map(face=>{
    const [a,b,d]=face.points,u=b.map((v,i)=>v-a[i]),v=d.map((v,i)=>v-a[i]);
    const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const length=Math.hypot(...normal)||1;
    const light=.65+.35*Math.abs((normal[0]*.3+normal[1]*.4+normal[2]*.85)/length);
    const rgb=[1,3,5].map(i=>Math.round(parseInt(face.color.slice(i,i+2),16)*light));
    return {color:`rgb(${rgb.join(',')})`,points:face.points.map(project)};
   });
   polygons.sort((a,b)=>a.points.reduce((v,p)=>v+p.depth,0)/a.points.length-b.points.reduce((v,p)=>v+p.depth,0)/b.points.length);
   for(const face of polygons){
    ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();
    ctx.strokeStyle='rgba(15,23,42,.18)';ctx.lineWidth=.45;ctx.stroke();
   }
   ctx.font='bold 11px system-ui';ctx.textAlign='center';
   for(const label of labels){const p=project(label.point);ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=label.color;ctx.fillText(label.text,p.x,p.y+4);}
   if(!overlay){ctx.textAlign='left';ctx.fillStyle='#94a3b8';ctx.font='11px system-ui';ctx.fillText(preview?'Finger movement preview':'Hand colors match note colors',12,height-9);}
  };
  frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[song,byHand,collapsed,preview,overlay?.whiteKeyHeight,overlay?.blackKeyHeight,mapKeyboard]);
 if(overlay)return <canvas ref={canvas} className="absolute top-0 left-0 pointer-events-none" style={{width:overlay.width,height:overlay.whiteKeyHeight,zIndex:35}} aria-label="3D hands show fingering on the lower piano keys"/>;
 return <div>
  <div className="flex justify-between items-center px-3 py-2 text-xs text-cyan-300"><span>3D Hands</span><div className="flex gap-3"><button type="button" onClick={()=>{view.current.yaw=0;view.current.tilt=.95;}} aria-label="Reset 3D hand angle">Reset angle</button>{!preview&&<button type="button" onClick={()=>setCollapsed(v=>!v)} aria-expanded={!collapsed}>{collapsed?'Show':'Collapse'}</button>}</div></div>
  {!collapsed&&<canvas ref={canvas} className="w-full h-[205px] touch-none cursor-grab" aria-label="3D model of both hands and the keyboard; numbers identify the fingers" onPointerDown={e=>{view.current={...view.current,drag:true,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const v=view.current;if(v.drag){v.yaw=Math.max(-.6,Math.min(.6,v.yaw+(e.clientX-v.x)*.005));v.tilt=Math.max(.5,Math.min(1.45,v.tilt+(e.clientY-v.y)*.005));v.x=e.clientX;v.y=e.clientY;}}} onPointerUp={()=>{view.current.drag=false;}} onPointerCancel={()=>{view.current.drag=false;}}/>}
 </div>;
}
