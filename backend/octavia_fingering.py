"""Documented Octavia corrections around the supplied pianoplayer optimizer."""
from pianoplayer.hand import Hand
import pianoplayer.scorereader as reader

LAYOUT=(.5,1,1.5,2,2.5,3.5,4,4.5,5,5.5,6,6.5)
ORIGINAL_OPTIMIZE=Hand.optimize_seq

def key_position(note):
    return 16.5*(int(note.pitch)//12-1) + LAYOUT[int(note.pitch)%12]*(16.5/7)

def fast_optimize(self, notes, start, relaxed=False):
    if self.preserve_posture_memory:
        return ORIGINAL_OPTIMIZE(self, notes, start)
    if self.autodepth:
        if notes[0].isChord:
            self.depth=max(3,notes[0].NinChord-notes[0].chordnr+1)
        else:
            for depth in (4,5,6,7,8,9):
                self.depth=depth
                if notes[depth-1].time-notes[0].time>3.5: break
    remaining=1
    while remaining<len(notes) and notes[remaining] is not notes[remaining-1]: remaining+=1
    if remaining==1:
        finger=start or (int(notes[0].fingering or 0) if 1<=int(notes[0].fingering or 0)<=5 else 3)
        return [finger]*9,0.
    depth=min(9,self.depth,remaining);self.depth=depth
    # Preserve exactly the relaxed-position arithmetic and summation order.
    edge={};allowed={}
    for i in range(1,depth):
        a,b=notes[i-1:i+1]
        for fa in self.fingers:
            for fb in self.fingers:
                pos=(self.frest[fb]-self.frest[fa])+a.x
                value=abs(b.x-pos)/(abs(b.time-a.time)+.1)
                value/=(self.weights[fb] or 1)*(self.bfactor[fb] or 1) if b.isBlack else (self.weights[fb] or 1)
                edge[i,fa,fb]=value
                skipped=self.skip(fa,fb,a,b,self.hf,self.LR,i+1)
                allowed[i,fa,fb]=not skipped
                if relaxed:
                    # Stretch and melodic heuristics are preferences, not proof
                    # that a score is unplayable. Retain distinct ordered fingers
                    # within chords, and charge a penalty for relaxed heuristics.
                    same_chord=a.isChord and b.isChord and a.chordID==b.chordID
                    ordered=(fb-fa)*(b.pitch-a.pitch)*(1 if self.LR=='right' else -1)>0
                    allowed[i,fa,fb]=not same_chord or a.pitch==b.pitch or ordered
                    if skipped:
                        if same_chord: edge[i,fa,fb]+=10000
                        elif fa==fb and a.pitch!=b.pitch: edge[i,fa,fb]+=25000
                        else: edge[i,fa,fb]+=1000
    candidate=[0]*9;best=None;minimum=1e10
    # Prefixes are equivalent only when the last finger and all earlier
    # assignments in chord groups still present in the future are identical.
    live=[{n.chordID for n in notes[i:depth] if n.isChord} for i in range(depth+1)]
    memo={}
    def search(level,total,penalty):
        nonlocal best,minimum
        cost=total/(depth-1)+penalty
        # All future motion costs and chord penalties are non-negative.
        if cost>=minimum: return
        if level==depth:
            minimum=cost;best=candidate.copy();return
        for finger in ([start] if level==0 and start else self.fingers):
            if level and not allowed[level,candidate[level-1],finger]: continue
            amount=total+(edge[level,candidate[level-1],finger] if level else 0)
            chord_penalty=penalty
            n=notes[level]
            if n.isChord:
                for j in range(level):
                    p=notes[j];pf=candidate[j]
                    if not p.isChord or p.chordID!=n.chordID: continue
                    if relaxed and int(n.pitch)!=int(p.pitch):
                        direction=(finger-pf)*(n.pitch-p.pitch)*(1 if self.LR=='right' else -1)
                        if direction<=0: chord_penalty=float('inf');break
                    if finger==pf and int(n.pitch)!=int(p.pitch): chord_penalty+=1e6;continue
                    if self.LR=='right':
                        if (n.pitch>p.pitch and finger<=pf) or (n.pitch<p.pitch and finger>=pf): chord_penalty+=2e5
                    elif (n.pitch>p.pitch and finger>=pf) or (n.pitch<p.pitch and finger<=pf): chord_penalty+=2e5
            chord_state=tuple((j,candidate[j]) for j in range(level)
                              if notes[j].isChord and notes[j].chordID in live[level+1])
            if n.isChord and n.chordID in live[level+1]: chord_state+=((level,finger),)
            state=(level,finger,chord_state)
            prefix_cost=amount/(depth-1)+chord_penalty
            if memo.get(state,float('inf'))<=prefix_cost: continue
            memo[state]=prefix_cost
            candidate[level]=finger
            search(level+1,amount,chord_penalty)
    search(0,0.,0.)
    if best is None:
        # Retry an infeasible carried finger; do not lock a whole melody to it.
        if start and not (1<=int(notes[0].fingering or 0)<=5):
            return fast_optimize(self,notes,0,relaxed)
        if not relaxed:
            result=fast_optimize(self,notes,start,True)
            warnings=getattr(self,'constraint_warnings',None)
            if warnings is None: self.constraint_warnings=[];warnings=self.constraint_warnings
            warnings.append(dict(hand=self.LR,measure=notes[0].measure,time=notes[0].time))
            return result
        raise ValueError(f'The hand transition for the {"left" if self.LR=="left" else "right"} hand in measure {notes[0].measure or "—"} has conflicting finger or chord constraints. Check the hand assignment, chord span, and locked finger annotations in Settings.')
    return best,minimum

def generate_complete(self, start_measure=0, nmeasures=1000, show_progress=None):
    """Solve every real note, never consume zero-filled look-ahead padding."""
    original_x=[n.x for n in self.noteseq]
    if self.LR=='left':
        for n in self.noteseq: n.x=-n.x
    initial_depth=self.depth
    self.fingerseq=[];self.finger_positions=list(self.frest);self._has_position_state=False
    carry=0
    self.constraint_warnings=[]
    try:
        for i,n in enumerate(self.noteseq):
            if n.measure and not start_measure<=n.measure<start_measure+nmeasures: continue
            window=self.noteseq[i:i+9]
            window+= [window[-1]]*(9-len(window))
            anchor=abs(int(n.fingering or 0))
            anchor=anchor if 1<=anchor<=5 else 0
            out,cost=self.optimize_seq(window,anchor or carry)
            finger=anchor or self._enforce_chord_group_consistency(i,out[0])
            if not 1<=finger<=5: raise ValueError('The engine returned a missing finger number.')
            out[0]=finger;n.fingering=finger;n.cost=cost
            carry=out[1] if 1<=out[1]<=5 else finger
            self.set_fingers_positions(out,window,0)
            self.fingerseq.append(list(self.finger_positions))
            if show_progress: show_progress(i+1,len(self.noteseq),n.measure)
    finally:
        self.depth=initial_depth
        for n,x in zip(self.noteseq,original_x): n.x=x

def install():
    reader.keypos_midi=key_position
    Hand.optimize_seq=fast_optimize
    Hand.generate=generate_complete
