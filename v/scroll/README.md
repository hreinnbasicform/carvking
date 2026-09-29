# Scroll

Scroll is a small plain-text format for web films: a timeline of shots, words and music cues.
You can write it by hand. The player at `/v/power/assets/scroll-*.js` fetches a page's `power.scroll`,
parses it with no dependencies, and plays it with images, video, generative Web Audio music and optional real audio files.

A page is a copy of `/v/power/1/index.html` next to a `power.scroll` file. The `<body data-scroll="power.scroll">` attribute names the file.

## Shape of a file

```
# comments start with #  (or //)
title: Do Not Be Afraid          <- header: "key: value" lines before the first @ line
tempo: 96
key: D minor
music: epic
grade: warm
images: ../assets/img/{}-2.webp

@0:00-0:02 black cue:wonder,0.6  <- a scene: @start-end, then tokens
sfx: spark                       <- lines under a scene belong to it
@0:04.5-0:10 img:child ken:up
vo: Before anything was made, there was love.
@0:10-0:15 img:steps ken:down fx:flare
vo: Not a little. Not enough.
+2.5 title: Overflowing           <- "+2.5" = 2.5 s after the scene starts
@0:21-0:25 img:smile hold:silent  <- true digital silence for the whole scene
@0:36-0:38 drop:"The light shines in the darkness" ref:"John 1:5"
@1:15.75-1:20.5 cuts:cords,knot,knot!,eyes,braid,whip cue:war
text: He made a whip of cords.
ref: John 2:15
```

Times are `m:ss`, `m:ss.s` or plain seconds. The end time is optional (the scene then runs to the next scene).
By default the player snaps every time to half a beat of the tempo (`snap: 1/2`, or `snap: off`), which keeps cuts on the music.

## Header keys

| key | meaning | default |
|---|---|---|
| `title`, `subtitle` | shown on the start screen | |
| `tempo` | BPM of the generative score (about 70–140) | 96 |
| `key` | `D minor`, `A dorian`, `F# major`, ... (minor, dorian, phrygian, harmonic, major, lydian, mixolydian) | D minor |
| `music` | score preset: `epic`, `relentless` (adds an 808 kit), `minimal`, `solemn`, `child`, `noir`, `chapters` | epic |
| `intensity` | 0.2–1.2, scales the whole score | 0.9 |
| `grade` | colour grade: `warm gold cold ash night ember dawn bleach noir` | warm |
| `seed` | default music seed (Remix and `?seed=` override it) | 1 |
| `images` | path template for `img:` names, `{}` is replaced by the name | `{}` |
| `videos` | same, for `video:` names | `{}` |
| `snap` | grid in beats: `1/2`, `1/4`, `1`, `off` | 1/2 |
| `generative` | `off` to use only your own audio files | on |
| `length` / `end` | film length (default: end of the last scene) | |
| `endnote`, `endref` | line and reference shown on the end screen | |
| `audio` | a sound file for the whole film (see Audio) | |

## Scene tokens (on the `@` line)

| token | meaning |
|---|---|
| `img:name` | still image (a name goes through the `images` template; a path or URL is used as is) |
| `video:clip.mp4` | video clip, muted, starts in sync with the scene |
| `black`, `white` | plain frame |
| `ken:in` | Ken Burns move: `in out push left right up down drift slow still`; combine with a comma: `ken:in,left` |
| `fade` | fade up from black instead of a hard cut |
| `cuts:a,b,c` | split the scene into equal fast cuts (one per beat when they fit), each with a drum hit; end a name with `!` to mirror it |
| `hit:1` / `hit:2` / `hit:3` | impact on the cut: small, big (with a flash and shake), or a swell |
| `shake`, `flip` | camera shake; mirror the image |
| `fx:dove` / `fx:rise` / `fx:flare` | dove crossing, dove rising, warm light flare |
| `grade:cold` | colour grade for this scene only |
| `cue:war,0.8` | music section from here on, with optional intensity (see Music) |
| `hold:silent` | true silence: music, reverb tails and files are all gated to zero |
| `drop:"..." ref:"..."` | full-screen hard-cut card on a bass drop (music cuts half a beat before) |

## Lines inside a scene

| line | meaning |
|---|---|
| `vo: words` | narration caption (serif, lower third) |
| `text: words` | big card in the centre |
| `title: words` | bigger card |
| `chapter: WORD` | spaced-out chapter card; add a `ref:` line for its subtitle |
| `drop: "WORDS" ref:"John 3:16"` | same as the drop token |
| `ref: Matthew 18:6` | reference under the previous vo/text/title/drop |
| `sfx: name [gain -3db]` | built-in: `spark impact braam riser heartbeat bell taiko subdrop crash whoosh stab choir`; or a file: `sfx: boom.wav gain -3db` |
| `audio: file.mp3 ...` | a sound file starting with this scene (see Audio) |
| `+1.5 <line>` | put any of the above 1.5 s into the scene |

Several `vo:` or `text:` lines without `+offsets` share the scene evenly, one after another. Use ` / ` for a line break.
Straight quotes and apostrophes are typeset as curly quotes.

## Audio files

```
audio: bed.mp3 at 0:00 gain -6db loop fade 2 until 2:10 as bed
audio: narration.wav at 0:04 as vo
```

`at` start time (inside a scene, relative to the scene), `gain` in dB, `loop`, `fade` seconds in/out, `until` stop time,
`offset` seconds into the file, `duck` (turn the generative music down while it plays), `as bed|vo|sfx`
(`vo` also ducks the music). mp3, wav, ogg and m4a work (whatever the browser decodes).
Files go through the same master chain, so silent holds silence them too. Set `generative: off` for a film that uses only your own music.

## Music

The score is synthesised live in the browser: taiko ensemble, sub drops, braams, a string ostinato, a formant choir, brass, risers, impacts,
a heartbeat, a solo line, procedural convolution reverb, sidechain ducking, and a compressor, limiter and soft clipper on the master.
`cue:` picks the section:

`wonder` (soft strings, celesta, bells) · `tense` (16th-note ostinato, low taiko, braams) · `build` (accelerating roll and riser) ·
`war` (full taiko patterns, braams, brass) · `choir` (choir climax) · `weep` (solo lament) · `heart` (heartbeat pulse, rising pad) ·
`tutti` (everything) · `outro` (a long final chord) · `drone` · `pulse` (the 808 groove) · `none`.

The seed changes the progression, ostinato, drum patterns and melody but keeps the preset, key and tempo. `?seed=123` reproduces a mix; `?at=1:20` starts partway through.
