import type {HandPose} from '../types';
import {INITIAL_PLAYBACK_DELAY_MS} from '../midiParser';
export const SIZE_FACTORS={XXS:.33,XS:.46,S:.64,M:.82,L:1,XL:1.1,XXL:1.2};
export const keyX=(pitch:number)=>16.5*(Math.floor(pitch/12)-1)+[.5,1,1.5,2,2.5,3.5,4,4.5,5,5.5,6,6.5][pitch%12]*(16.5/7);
export function currentPose(poses:HandPose[],timeMs:number):HandPose|undefined {
  const t=(timeMs-INITIAL_PLAYBACK_DELAY_MS)/1000;
  let lo=0,hi=poses.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(poses[mid].onsetSeconds<=t)lo=mid+1;else hi=mid;}
  return poses[lo-1];
}
export function smoothPose(poses: HandPose[], timeMs: number): { positions: number[]; jumpLift: number } | undefined {
  if (!poses || !poses.length) return undefined;
  const t = (timeMs - INITIAL_PLAYBACK_DELAY_MS) / 1000;
  let lo = 0, hi = poses.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (poses[mid].onsetSeconds <= t) lo = mid + 1; else hi = mid;
  }
  const curr = poses[lo - 1];
  const next = poses[lo];

  if (!curr && next) {
    const dt = next.onsetSeconds - t;
    if (dt <= 0.25 && dt >= 0) {
      const p = 1 - dt / 0.25;
      const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
      const jumpLift = Math.sin(p * Math.PI) * 1.0;
      return { positions: [...next.positions], jumpLift };
    }
    return undefined;
  }
  if (!curr) return undefined;
  if (!next) return { positions: curr.positions, jumpLift: 0 };

  const totalGap = next.onsetSeconds - curr.onsetSeconds;
  const timeToNext = next.onsetSeconds - t;
  const transitionWindow = Math.min(0.28, Math.max(0.06, totalGap * 0.7));

  if (timeToNext <= transitionWindow && timeToNext >= 0) {
    const p = 1 - timeToNext / transitionWindow;
    const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
    const palmDist = Math.abs(next.positions[2] - curr.positions[2]);
    const jumpLift = Math.min(3.2, Math.max(0, palmDist * 0.15)) * Math.sin(p * Math.PI);
    const positions = curr.positions.map((v, i) => v + (next.positions[i] - v) * ease);
    return { positions, jumpLift };
  }

  return { positions: curr.positions, jumpLift: 0 };
}
export type Point=[number,number,number];
export type Face={points:Point[];color:string};
export function box(x:number,y:number,z:number,w:number,d:number,h:number,color:string):Face[]{
 const v:Point[]=[[-w/2,-d/2,0],[w/2,-d/2,0],[w/2,d/2,0],[-w/2,d/2,0],[-w/2,-d/2,h],[w/2,-d/2,h],[w/2,d/2,h],[-w/2,d/2,h]].map(([a,b,c])=>[x+a,y+b,z+c]);
 return [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]].map(ids=>({points:ids.map(i=>v[i]),color}));
}
// Triangulated ellipsoid also supplies cylindrical finger segments with rounded ends.
export function limb(x:number,y:number,z:number,rx:number,ry:number,rz:number,color:string):Face[]{
 const result:Face[]=[];const rings=6,segments=10;
 const at=(a:number,b:number):Point=>[x+rx*Math.sin(a)*Math.cos(b),y+ry*Math.sin(a)*Math.sin(b),z+rz*Math.cos(a)];
 for(let i=0;i<rings;i++)for(let j=0;j<segments;j++)result.push({color,points:[at(i*Math.PI/rings,j*2*Math.PI/segments),at((i+1)*Math.PI/rings,j*2*Math.PI/segments),at((i+1)*Math.PI/rings,(j+1)*2*Math.PI/segments),at(i*Math.PI/rings,(j+1)*2*Math.PI/segments)]});
 return result;
}

export function keyboardMapper(keys:{midi:number;x:number;width:number}[]) {
 const points=keys.map(k=>({world:keyX(k.midi),pixel:k.x+k.width/2})).sort((a,b)=>a.world-b.world);
 return (world:number)=>{
  if(!points.length)return 0;
  if(points.length===1)return points[0].pixel+(world-points[0].world)*keys[0].width/(16.5/7);
  let lo=0,hi=points.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid].world<=world)lo=mid+1;else hi=mid;}
  const i=Math.max(0,Math.min(points.length-2,lo-1)),a=points[i],b=points[i+1];
  return a.pixel+(world-a.world)*(b.pixel-a.pixel)/(b.world-a.world);
 };
}
