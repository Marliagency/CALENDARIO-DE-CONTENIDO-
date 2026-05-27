#!/usr/bin/env python3
# Epic brass+percussion score (real GM samples via fluidsynth). A minor, dynamic sections.
import mido
from mido import Message, MidiFile, MidiTrack, MetaMessage, bpm2tempo

TPB = 480
mid = MidiFile(ticks_per_beat=TPB)

def bt(b): return int(round(b * TPB))

# ---------- tempo / sections ----------
# A intro 80bpm (0-8) | B march 110 (8-24) | C climax 150 (24-44) | D breakdown 90 (44-50) | E finale 70 (50-54)
tempo_track = MidiTrack(); mid.tracks.append(tempo_track)
tempos = [(0, 80), (8, 110), (24, 150), (44, 90), (50, 70)]
last = 0
for beat, bpm in tempos:
    tempo_track.append(MetaMessage('set_tempo', tempo=bpm2tempo(bpm), time=bt(beat) - last)); last = bt(beat)

def make_track(channel, program, events):
    t = MidiTrack(); mid.tracks.append(t)
    if program is not None:
        t.append(Message('program_change', channel=channel, program=program, time=0))
    evs = []
    for (st, du, n, v) in events:
        evs.append((bt(st), 1, n, v)); evs.append((bt(st + du), 0, n, 0))
    evs.sort(key=lambda x: (x[0], x[1]))  # note_off before note_on at same tick
    last = 0
    for (tick, on, n, v) in evs:
        d = tick - last; last = tick
        t.append(Message('note_on' if on else 'note_off', channel=channel, note=n, velocity=v, time=d))
    return t

# MIDI notes
A2,C3,E3,A3,Cs3,F3,G3 = 45,48,52,57,49,53,55
F4,G4,A4,B4,C5,D5,E5,F5,G5,A5 = 65,67,69,71,72,74,76,77,79,81

brass=[]; trumpet=[]; horn=[]; timp=[]; drums=[]
BD,SN,CH,OH,T1,T2,T3,CR,SPL = 36,38,42,46,45,47,50,49,55  # GM percussion

# ===== A intro (0-8) majestic swell =====
for n in (A2,C3,E3):           # horn sustained Am chord
    horn.append((0,7.0,n,62))
brass.append((0,7.0,A2,55))
timp.append((0,1.5,33,100)); timp.append((4,1.5,33,96))   # big timpani A1
# snare roll crescendo beats 6-8
b=6.0
while b<8.0:
    v=int(45+ (b-6.0)/2.0*70)
    drums.append((b,0.12,SN,v)); b+=0.125

# ===== B march (8-24) trumpet fanfare + rising drums =====
# horn chord bed: Am F C G (4 beats each)
for (st,ns) in [(8,(A2,C3,E3)),(12,(F3,A3,C5-12)),(16,(C3,E3,G3+12)),(20,(G3,B4-12,D5-12))]:
    for n in ns: horn.append((st,3.8,n,58))
# brass stabs on each beat (Am-ish), rising velocity
for i in range(16):
    st=8+i; v=int(60+i*2.2)
    for n in (A3,C5,E5-12): brass.append((st,0.45,n,v))
# trumpet fanfare motif per bar
trumpet += [(8,0.5,A4,80),(8.5,0.5,A4,82),(9,1,C5,90),(10,2,E5,96)]
trumpet += [(12,0.5,A4,84),(12.5,0.5,A4,86),(13,1,F5,92),(14,2,D5,98)]
trumpet += [(16,0.5,G4,86),(16.5,0.5,G4,88),(17,1,B4,94),(18,2,D5,100)]
trumpet += [(20,1,E5,100),(21,1,D5,100),(22,1,C5,102),(23,1,B4,104)]
# march drums
for i in range(16):
    st=8+i; v=int(78+i*1.5)
    drums.append((st,0.2,BD,v)); drums.append((st+0.5,0.2,SN,v-6))
    drums.append((st,0.12,CH,60)); drums.append((st+0.5,0.12,CH,55))
    if i%4==3: timp.append((st,0.3,33,90))

# ===== C climax (24-44) full power, fast =====
# brass power chords on each beat
for i in range(20):
    st=24+i
    for n in (A3,E3+12,A4,C5,E5): brass.append((st,0.4,n,115))
# trumpet soaring line
trumpet += [(24,4,A5,118),(28,4,E5,116),(32,1,A5,118),(33,1,G5,116),(34,1,F5,116),(35,1,E5,116)]
trumpet += [(36,8,A5,122)]
horn += [(24,8,A2,90),(32,8,E3,92),(40,4,A2,96)]
# driving drums: bass on 8ths, snare backbeat, crash on downbeats of bars, tom fills
crash_beats=set([24,28,32,36,40])
for i in range(20):
    st=24+i
    drums.append((st,0.15,BD,118)); drums.append((st+0.5,0.15,BD,100))
    if i%2==1: drums.append((st,0.15,SN,112))
    drums.append((st,0.1,CH,70)); drums.append((st+0.5,0.1,CH,66))
    if st in crash_beats: drums.append((st,0.5,CR,120))
    if i%4==3:  # tom fill end of bar
        drums.append((st+0.5,0.12,T1,110)); drums.append((st+0.75,0.12,T2,112))
    timp.append((st,0.2,33,100))

# ===== D breakdown (44-50) tension, drums drop =====
for n in (A2,E3): horn.append((44,5.5,n,70))
brass.append((44,5.5,A2,60))
trumpet.append((46,3,E5,70))
b=44.0
while b<50.0:                  # snare roll big crescendo
    v=int(40+(b-44.0)/6.0*85)
    drums.append((b,0.1,SN,v)); b+=0.125
timp.append((48,2,33,110))

# ===== E finale (50-54) triumphant A major hit =====
for n in (A2,Cs3,E3,A3,A4,Cs3+24,E5): brass.append((50,4.0,n,124))
for n in (A2,Cs3,E3): horn.append((50,4.0,n,118))
trumpet += [(50,4.0,A5,126),(50,4.0,E5,120)]
drums.append((50,2.5,CR,127)); drums.append((50,2.0,SPL,110))
timp.append((50,0.4,33,120)); timp.append((50.5,0.4,33,118)); timp.append((51,1.5,33,124))

make_track(2, 61, brass)     # Brass Section
make_track(1, 56, trumpet)   # Trumpet
make_track(3, 60, horn)      # French Horn
make_track(4, 47, timp)      # Timpani
make_track(9, 0, drums)      # Drums (channel 10)

mid.save('epic.mid')
print('epic.mid saved, length beats=54')
