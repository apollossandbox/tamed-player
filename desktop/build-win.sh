#!/usr/bin/env bash
# Builds the Windows installer and drops it in ../installer/ with latest.json,
# so pushing the repo to GitHub updates everyone's desktop app.
# Usage: ./build-win.sh 1.0.2 "What changed in this version"
# Needs Node, and Wine (64- and 32-bit) when building on Linux.
set -euo pipefail
cd "$(dirname "$0")"
VERSION="${1:?Give the new version, for example: ./build-win.sh 1.0.2 \"Notes\"}"
NOTES="${2:-}"
export WINEDEBUG=-all

npm pkg set version="$VERSION"
[ -d node_modules ] || npm install --no-audit --no-fund
node make-page.js
rm -rf dist

# 1. Package the app (without editing the exe; the bundled editor is 32-bit only).
npx electron-builder --win dir --x64 --publish never -c.win.signAndEditExecutable=false

# 2. Stamp icon and version info into the exe with the 64-bit resource editor.
RCEDIT="$(ls ~/.cache/electron-builder/winCodeSign/winCodeSign-*/rcedit-x64.exe | head -1)"
WINE64="$(command -v wine64 || echo /usr/lib/wine/wine64)"
WINEARCH=win64 WINEPREFIX="$HOME/.wine64" "$WINE64" "$RCEDIT" "dist/win-unpacked/Tamed Player.exe" \
  --set-version-string FileDescription "Tamed Player" --set-version-string ProductName "Tamed Player" \
  --set-version-string LegalCopyright "trulytamed and KGB" --set-version-string CompanyName trulytamed \
  --set-version-string InternalName "Tamed Player" --set-version-string OriginalFilename "Tamed Player.exe" \
  --set-file-version "$VERSION" --set-product-version "$VERSION.0" --set-icon build/icon.ico

# 3. Build the installer from the prepared app. (A trailing "channel" error from electron-builder is harmless.)
npx electron-builder --win nsis --x64 --prepackaged dist/win-unpacked --publish never \
  -c.win.signAndEditExecutable=false -c.win.icon=build/icon.ico || true
test -f "dist/TamedPlayer-Setup-$VERSION.exe"

# 4. Replace the published installer and the update file.
mkdir -p ../installer
rm -f ../installer/TamedPlayer-Setup*.exe
cp "dist/TamedPlayer-Setup-$VERSION.exe" ../installer/TamedPlayer-Setup.exe
node -e '
const fs = require("fs"), [v, notes] = process.argv.slice(1);
const f = "../installer/TamedPlayer-Setup.exe", size = fs.statSync(f).size;
const sha256 = require("crypto").createHash("sha256").update(fs.readFileSync(f)).digest("hex");
fs.writeFileSync("../installer/latest.json", JSON.stringify({ version: v, file: "TamedPlayer-Setup.exe", size, sha256, notes, date: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");
' "$VERSION" "$NOTES"
echo "Built installer/TamedPlayer-Setup.exe ($VERSION). Commit and push the repo to publish it."
