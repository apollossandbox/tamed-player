# Tamed Player

Music organizer with a project library, a 3D CD package creator (clear jewel case, booklet, tray card, spines, disc) with 300 dpi print files, target release dates, an EQ, and a full-screen concept streaming player.

- `index.html` is the whole app (vanilla HTML/CSS/JS, no build step).
- `desktop/` wraps it in Electron and builds the Windows installer.

## Build the Windows installer

```
cd desktop
npm install
npm run dist
```

The installer is written to `desktop/dist/TamedPlayer-Setup-<version>.exe`. Building on Linux needs Wine (64- and 32-bit).

Made by dris, trulytamed and all of KGB.
