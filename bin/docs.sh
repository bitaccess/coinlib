#!/bin/bash
REPO_ROOT="`cd $(dirname $0)/..; echo $PWD`"
PACKAGE_ROOT=$1
shift
"$REPO_ROOT/node_modules/@faast/ts-config/library/bin/docs.sh" "$PACKAGE_ROOT" --tsconfig "$PACKAGE_ROOT/tsconfig.build.json" "$@"
