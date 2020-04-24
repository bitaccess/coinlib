#!/bin/bash

# Builds the specified package. Designed to be run within that package dir.
# Usage: build.sh <package_dir> [...args]

REPO_ROOT="`cd $(dirname $0)/..; echo $PWD`"
NO_DOCS=1 "$REPO_ROOT/node_modules/@faast/ts-config/library/bin/build.sh" "$@"
