#!/bin/bash

# Builds the specified package. Designed to be run within that package dir.
# Usage: build.sh <package_dir> [...args]

NM_BIN="$1/node_modules/.bin"
TSCONFIG="$1/tsconfig.build.json"
ROLLUP_CONFIG="$1/rollup.config.js"

echo ">> cd $1"
cd "$1"

echo ">> tsc"
"$NM_BIN/tsc" -b "$TSCONFIG"

echo ">> rollup"
"$NM_BIN/rollup" -c "$ROLLUP_CONFIG"
