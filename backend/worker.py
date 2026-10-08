"""Runs pianoplayer with documented Octavia geometry, routing and search corrections."""
import json, pathlib, sys, xml.etree.ElementTree as ET
sys.path.insert(0, str(pathlib.Path(__file__).parent / 'vendor'))
from pianoplayer.core import load_note_sequences, generate_hands
from pianoplayer.models import AnnotateOptions
from pianoplayer.musicxml_io import _pitch_from_note
from octavia_fingering import install
install()

def _balance_large_midi_chords(pm, right_notes, left_notes):
    """Move only overflowing chord notes across the hand boundary.

    Octavia renders one event per pitch/tick.  When a MIDI track assigns six or
    more simultaneous pitches to one hand, keep the lower notes in the left
    hand and the upper notes in the right hand while changing as few existing
    hand assignments as possible.
    """
    side_by_id={id(n):'right' for n in right_notes}
    side_by_id.update({id(n):'left' for n in left_notes})
    by_tick={}
    for note in (*right_notes,*left_notes):
        by_tick.setdefault(int(pm.time_to_tick(note.start)),[]).append(note)
    changed=0
    for chord in by_tick.values():
        right_count=sum(side_by_id[id(n)]=='right' for n in chord)
        left_count=len(chord)-right_count
        if right_count<=5 and left_count<=5: continue
        if len(chord)>10:
            raise ValueError('A chord contains more than ten distinct simultaneous notes and cannot be assigned to ten fingers.')
        minimum_left=max(0,len(chord)-5)
        maximum_left=min(5,len(chord))
        target_left=max(minimum_left,min(maximum_left,left_count))
        ordered=sorted(chord,key=lambda n:(n.pitch,n.end-n.start,n.velocity))
        left_ids={id(n) for n in ordered[:target_left]}
        for note in chord:
            target='left' if id(note) in left_ids else 'right'
            if side_by_id[id(note)]!=target:
                changed+=1
                side_by_id[id(note)]=target
    return ([n for n in (*right_notes,*left_notes) if side_by_id[id(n)]=='right'],
            [n for n in (*right_notes,*left_notes) if side_by_id[id(n)]=='left'],changed)

def compute(filename, hand_size="M", routing="auto", split_midi=60, progress=None):
    args = AnnotateOptions(filename=filename, quiet=True, hand_size=hand_size, start_measure=0, n_measures=1000000).to_namespace()
    _, score, rh, lh = load_note_sequences(args)
    if score is None:
        import pretty_midi
        from types import SimpleNamespace
        from pianoplayer.scorereader import reader_pretty_midi
        pm=pretty_midi.PrettyMIDI(filename)
        instruments=[i for i in pm.instruments if i.notes and not i.is_drum]
        if not instruments: raise ValueError('The file does not contain any piano instruments with notes.')
        # Match Octavia's single playable event per pitch/tick before optimizing.
        # Keep the selected track's event, so duplicate copies cannot consume
        # extra fingers or assign the same key to both hands.
        registers={id(i):sum(n.pitch for n in i.notes)/len(i.notes) for i in instruments}
        chosen={}
        for index,instrument in enumerate(instruments):
            for note in instrument.notes:
                if note.end-note.start<=.005 or note.velocity<=0: continue
                key=(int(pm.time_to_tick(note.start)),note.pitch)
                previous=chosen.get(key)
                duration=max(60,int((note.end-note.start)*1000+.5))
                if previous is None or duration>previous[2] or (len(instruments)==2 and previous[0]==0 and index==1):
                    chosen[key]=(index,note,duration)
        selected={id(entry[1]) for entry in chosen.values()}
        for instrument in instruments:
            instrument.notes=[n for n in instrument.notes if id(n) in selected]

        if routing=='split' or (routing=='auto' and len(instruments)==1):
            all_notes=[n for instrument in instruments for n in instrument.notes]
            right_notes=[n for n in all_notes if n.pitch>=split_midi]
            left_notes=[n for n in all_notes if n.pitch<split_midi]
            right_notes,left_notes,large_chord_moves=_balance_large_midi_chords(pm,right_notes,left_notes)
            rh=reader_pretty_midi(SimpleNamespace(notes=right_notes))
            lh=reader_pretty_midi(SimpleNamespace(notes=left_notes))
            args.right_only=False;args.left_only=False
        elif routing=='right':
            rh=reader_pretty_midi(SimpleNamespace(notes=[n for instrument in instruments for n in instrument.notes]));lh=[]
            args.right_only=True;args.left_only=False
        elif routing=='left':
            lh=reader_pretty_midi(SimpleNamespace(notes=[n for instrument in instruments for n in instrument.notes]));rh=[]
            args.left_only=True;args.right_only=False
        elif routing=='auto' and len(instruments)==2:
            ordered=sorted(instruments,key=lambda i:registers[id(i)])
            right_notes,left_notes,large_chord_moves=_balance_large_midi_chords(pm,list(ordered[-1].notes),list(ordered[0].notes))
            lh=reader_pretty_midi(SimpleNamespace(notes=left_notes));rh=reader_pretty_midi(SimpleNamespace(notes=right_notes));args.right_only=False;args.left_only=False
        elif len(instruments)>2:
            raise ValueError('The MIDI file has more than two instruments. Choose Split by pitch for the hand assignment.')
    for seq in (rh or [], lh or []):
        if any(n.isChord and n.NinChord>5 for n in seq):
            raise ValueError('One hand has more than five simultaneous notes. Use Automatic or Split by pitch for MIDI, or adjust the original MusicXML staves.')
    class Reporter:
        enabled=True
        def start_hand(self,side,total):
            if progress: progress(side,0,total)
        def update_hand(self,side,done,total,measure):
            if progress: progress(side,done,total)
        def hand_done(self,side): pass
    hands = generate_hands(args, rh or [], lh or [], Reporter() if progress else None)
    relaxed_count=sum(len(getattr(hand,'constraint_warnings',[])) for hand in hands if hand is not None)
    warnings=[]
    if score is None and locals().get('large_chord_moves',0):
        warnings.append(f'{large_chord_moves} notes in oversized chords were reassigned across hands so each hand uses at most five fingers.')
    if relaxed_count:
        warnings.append(f'{relaxed_count} note windows required relaxed finger transition or range rules. Fingering was calculated, but these passages should be reviewed during playback. Hand size or assignment in Settings may affect the result.')
    poses=[]
    for side,hand in zip(('right','left'),hands):
        if hand is None: continue
        for n,positions in zip(hand.noteseq,hand.fingerseq):
            onset=n.time+(args.chord_note_stagger_s*(n.NinChord-n.chordnr-1) if n.isChord else 0)
            poses.append(dict(hand=side,onsetSeconds=onset,positions=[p*(1 if side=='right' else -1) for p in positions[1:]]))
    poses.sort(key=lambda p:p['onsetSeconds'])
    if score is None:
        rows=[]
        for side, hand in zip(('right','left'), hands):
            if hand is None: continue
            for n in hand.noteseq:
                # Undo reader-only chord staggering; raw MIDI timing is retained.
                onset=n.time + (args.chord_note_stagger_s * (n.NinChord-n.chordnr-1) if n.isChord else 0)
                rows.append(dict(midi=n.pitch,onsetSeconds=onset,finger=n.fingering,hand=side))
        # Distinct ticks can round to the same display millisecond. Preserve
        # tick identity only for those collisions, rather than merging them.
        from collections import Counter
        collisions=Counter((row['midi'],int(row['onsetSeconds']*1000+.5)) for row in rows)
        for row in rows:
            if collisions[(row['midi'],int(row['onsetSeconds']*1000+.5))]>1:
                row['onsetTicks']=int(pm.time_to_tick(row['onsetSeconds']))
        return dict(engine='pianoplayer-python',format='midi',notes=rows,poses=poses,warnings=warnings)
    assigned=set()
    for side, hand in zip(('right','left'), hands):
        if hand is None: continue
        for n,positions in zip(hand.noteseq,hand.fingerseq):
            pose_json=json.dumps([p*(1 if side=='right' else -1) for p in positions[1:]])
            evt=n.note21
            # Upstream references the original MusicXML event. Assign by element,
            # pitch and staff, never by rounded Octavia playback timestamps.
            for element in evt.notes:
                if id(element) in assigned: continue
                p=_pitch_from_note(element)
                staff=next((int(e.text or 0) for e in element if e.tag.split('}')[-1]=='staff'),0)
                ties={e.get('type') for e in element.iter() if e.tag.split('}')[-1] in ('tie','tied')}
                if p and p.midi==n.pitch and staff==n.staff and not ties.intersection({'stop','continue'}):
                    element.set('data-octavia-finger',str(n.fingering))
                    element.set('data-octavia-hand',side)
                    element.set('data-octavia-positions',pose_json)
                    assigned.add(id(element)); break
    # Carry the same finger through tied continuation notes.
    for part in score.parts:
        active={}
        for evt in part.events:
            for element in evt.notes:
                p=_pitch_from_note(element)
                if not p: continue
                def value(tag): return next((e.text or '' for e in element if e.tag.split('}')[-1]==tag),'')
                key=(value('staff'),value('voice'),p.midi)
                ties={e.get('type') for e in element.iter() if e.tag.split('}')[-1] in ('tie','tied')}
                if 'stop' in ties or 'continue' in ties:
                    if key in active:
                        f,side,positions=active[key];element.set('data-octavia-finger',f);element.set('data-octavia-hand',side);element.set('data-octavia-positions',positions)
                if 'start' in ties and element.get('data-octavia-finger'):
                    active[key]=(element.get('data-octavia-finger'),element.get('data-octavia-hand'),element.get('data-octavia-positions','[]'))
                elif 'stop' in ties: active.pop(key,None)
    for element in score.tree.getroot().iter(): element.tag=element.tag.split('}')[-1]
    return dict(engine='pianoplayer-python',format='musicxml',warnings=warnings,xml=ET.tostring(score.tree.getroot(),encoding='unicode'))

def compute_json(*args, **kwargs):
    # Keep expected validation errors out of the browser's Python traceback.
    try: return json.dumps({'result':compute(*args,**kwargs)})
    except Exception as exc: return json.dumps({'error':str(exc)})

if __name__=='__main__':
    try: print(json.dumps(compute(sys.argv[1])))
    except Exception as exc:
        print(str(exc),file=sys.stderr);sys.exit(1)
