# Tamed Player

Music organizer with a project library, a 3D CD package creator (clear jewel case, booklet, tray card, spines, disc) with 300 dpi print files, target release dates, an EQ, and a full-screen concept streaming player.

- `index.html` is the whole app (vanilla HTML/CSS/JS, no build step).
- `desktop/` wraps it in Electron and builds the Windows installer.

## Audio Doctor and the FL Studio link

Audio Doctor reads each song's tempo, key and first beat, converts MP3 to WAV, and exports WAVs that start on the beat
(with the tempo written into the file), so they sit on the grid when dropped into a DAW.

In the Windows app, **Send to FL Studio** saves the WAV to `Documents\Tamed Player\Sent to FL Studio`,
sets FL Studio's tempo to match, rewinds to bar 1 and opens the playlist. Then you drag the file from Tamed Player onto the playlist.
FL Studio's scripting has no way to place audio on the playlist, so that last step is a drag.

Setup, once (Audio Doctor › Send to FL Studio › Set up walks through it):

1. **Install script** copies `desktop/fl/device_TamedPlayer.py` into `Documents\Image-Line\FL Studio\Settings\Hardware\Tamed Player`.
2. Create a virtual MIDI port called `Tamed Link` with [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) (free).
3. In FL Studio: Options › MIDI settings › Input: pick `Tamed Link`, set Controller type to `Tamed Player`, enable it.

## Download (Windows)

`installer/TamedPlayer-Setup.exe` is always the newest version.
Installing it over an older copy upgrades in place and keeps your projects (`%APPDATA%\Tamed Player`).

## Publish a new version

```
cd desktop
npm install          # first time only
./build-win.sh 1.0.2 "What changed"
cd .. && git add -A && git commit -m "Tamed Player 1.0.2" && git push
```

`build-win.sh` overwrites `installer/TamedPlayer-Setup.exe` and `installer/latest.json`.
The desktop app reads `latest.json` from GitHub when it starts (and from the update button in the sidebar),
then offers to download and install anything newer. That check needs this repository to be public.
Building on Linux needs Wine (64- and 32-bit).

Made by sxteen ways, trulytamed and all of KGB.
