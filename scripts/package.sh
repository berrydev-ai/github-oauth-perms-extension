#!/usr/bin/env bash
set -euo pipefail

version="$(node -p "require('./manifest.json').version")"
name="github-authorized-apps-inline-permissions-v${version}.zip"

mkdir -p dist
rm -f "dist/${name}"

zip -q -r "dist/${name}" \
  manifest.json \
  content.js \
  popup.html \
  popup.js \
  assets/icon-16.png \
  assets/icon-32.png \
  assets/icon-48.png \
  assets/icon-128.png

echo "dist/${name}"
