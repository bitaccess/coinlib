#!/bin/bash
REPO_ROOT="`cd $(dirname $0)/..; echo $PWD`"
"$REPO_ROOT/node_modules/@faast/ts-config/library/bin/build.sh" "$@"
