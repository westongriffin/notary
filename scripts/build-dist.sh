#!/bin/sh
# Copies the static site into dist/ for Capacitor (webDir). GitHub Pages
# serves the repo root directly; dist/ is only for the native shells.
set -e
cd "$(dirname "$0")/.."
rm -rf dist && mkdir -p dist
cp index.html intake.html privacy.html manifest.webmanifest dist/
cp -R css js icons fonts dist/
echo "dist/ ready: $(find dist -type f | wc -l | tr -d ' ') files"
