#!/bin/bash

# Builds the specified package. Designed to be run within that package dir.
# Usage: build.sh <package_dir> [...args]

cd "$1"
tsc -p ./tsconfig.build.json
