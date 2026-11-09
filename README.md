# Tamed Player

Music organizer with a project library, a 3D CD package creator (clear jewel case, booklet, tray card, spines, disc) with 300 dpi print files, target release dates, an EQ, and a full-screen concept streaming player.

- `index.html` is the whole app (vanilla HTML/CSS/JS, no build step).
- `desktop/` wraps it in Electron and builds the Windows installer.

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

Made by dris, trulytamed and all of KGB.
