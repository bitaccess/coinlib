#!/bin/bash

# Builds the docs for a specified package. Designed to be run within that package dir.
# Usage: docs.sh <package_dir> [...args]

REPO_ROOT="`cd $(dirname $0)/..; echo $PWD`"
PACKAGE_ROOT=$1
shift
"$REPO_ROOT/node_modules/@bitaccess/ts-config/library/bin/docs.sh" "$PACKAGE_ROOT" --tsconfig "$PACKAGE_ROOT/tsconfig.build.json" "$@"
