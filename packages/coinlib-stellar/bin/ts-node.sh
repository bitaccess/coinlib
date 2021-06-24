#!/bin/bash
ROOT=$(dirname $0)/..
"$ROOT/node_modules/.bin/ts-node" -P "$ROOT/tsconfig.exec.json" --files -r tsconfig-paths/register $@
