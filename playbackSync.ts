import {INITIAL_PLAYBACK_DELAY_MS} from './midiParser';
export const tempoRate=(rate:number)=>Math.max(.1,Math.min(4,Number.isFinite(rate)?rate:1));
// Song offset belongs to source time. User/device offsets are physical milliseconds.
export function backingPlayheadMs(songTimeMs:number,rate:number,songOffsetMs=0,userOffsetMs=0,outputLatencyMs=0){
 return songTimeMs-INITIAL_PLAYBACK_DELAY_MS+songOffsetMs+(userOffsetMs+outputLatencyMs)*tempoRate(rate);
}
export function noteInputOffsetMs(noteTimeMs:number,inputTimeMs:number,rate:number,noteOffsetMs:number){
 return (noteTimeMs-inputTimeMs)/tempoRate(rate)-noteOffsetMs;
}
export function measuredOutputLatencyMs(context:AudioContext|null,now=performance.now()):number{
 if(!context)return 0;
 const stamp=context.getOutputTimestamp?.();
 if(stamp?.contextTime && stamp.performanceTime && Math.abs(now-stamp.performanceTime)<1000){
  const audible=stamp.contextTime+(now-stamp.performanceTime)/1000;
  const delay=(context.currentTime-audible)*1000;
  if(Number.isFinite(delay)&&delay>=0&&delay<1000)return delay;
 }
 return Math.max(0,Math.min(1000,(context.outputLatency||context.baseLatency||0)*1000));
}
export function backingCorrection(actualSec:number,expectedSec:number,rate:number,lastCorrectionMs:number,nowMs:number){
 const r=tempoRate(rate),realDrift=(actualSec-expectedSec)/r;
 const absDrift=Math.abs(realDrift);

 // Avoid hard seeks unless drift is significant (> 1.2s) or track is stuck at zero while playback has progressed significantly.
 // This prevents the choppy/stuttering audio ("putus-putus") caused by repeated seeking during initial ramp-up.
 if((absDrift > 1.2 || (actualSec < 0.05 && expectedSec > 1.5)) && nowMs - lastCorrectionMs > 2000){
  return {seek:Math.max(0,expectedSec),rate:r};
 }

 // Smooth progressive speed steering without seeking for timing variations
 let speedMultiplier=1.0;
 if(absDrift > 0.25){
  // 250ms - 1.2s: 4% smooth tempo nudge
  speedMultiplier=realDrift>0?0.96:1.04;
 }else if(absDrift > 0.08){
  // 80ms - 250ms: 2% nudge
  speedMultiplier=realDrift>0?0.98:1.02;
 }else if(absDrift > 0.03){
  // 30ms - 80ms: 0.8% subtle nudge
  speedMultiplier=realDrift>0?0.992:1.008;
 }

 return {seek:undefined,rate:tempoRate(r*speedMultiplier)};
}
export function routeLocalBackingAudio(audio:HTMLAudioElement,context:AudioContext|null,nodes:WeakMap<HTMLAudioElement,MediaElementAudioSourceNode>,origin:string):boolean{
 if(!context)return false;
 if(nodes.has(audio))return true;
 const src=audio.currentSrc||audio.src;
 if(!src)return false;
 const url=new URL(src,origin);
 // Cross-origin media without CORS would become silent in a Web Audio graph.
 if(url.protocol!=='blob:'&&url.protocol!=='data:'&&url.origin!==new URL(origin).origin)return false;
 try {const node=context.createMediaElementSource(audio);node.connect(context.destination);nodes.set(audio,node);return true;} catch {return false;}
}
