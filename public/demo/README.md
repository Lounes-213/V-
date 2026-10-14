# Demo clip — attribution and licence

`demo-clip.webm` is **not** ours. It ships with the repo so the editor can be opened
without recording anything, and so the demo project is backed by real media rather
than a placeholder rectangle.

| Field | Value |
| --- | --- |
| Work | *WIKITONGUES: Fayçal speaking Algerian Arabic* |
| Author | Wikitongues, Anass Sedrati |
| Source | https://commons.wikimedia.org/wiki/File:WIKITONGUEs-_Fay%C3%A7al_speaking_Algerian_Arabic.webm |
| Licence | Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0) |
| File used | `240p.vp9.webm` transcode, 155.8 s, 428×240, VP9 + Opus |
| Retrieved | 2026-10-10 |

Modifications: none. The file is redistributed unmodified, as the licence allows,
with attribution preserved here and shown in the app next to the demo project.

**ShareAlike**: this file stays under CC BY-SA 4.0. It is not covered by the project's
own licence. Any redistribution of the file must keep this attribution and the same
licence. Code that merely references it is unaffected.

The transcript fixture generated from this clip (`src/lib/fixtures/demo-transcript.json`)
is a transcription of the clip's audio and is derivative of the same work — treat it as
CC BY-SA 4.0 as well.

## Replacing the demo

Delete these files and drop your own `demo-clip.webm` / `demo-clip.mp4` in this
directory; `ProjectLoader` picks up whatever the manifest in
`src/lib/demo-media.ts` points at. Users' own uploads never come from here — they
live in OPFS on the user's device.
