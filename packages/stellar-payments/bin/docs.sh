#!/bin/bash
ROOT="`cd $(dirname $0)/..; echo $PWD`"
"$ROOT/node_modules/@faast/ts-config/library/bin/docs.sh" "$ROOT"
