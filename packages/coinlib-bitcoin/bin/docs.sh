#!/bin/bash
PACKAGE_ROOT="`cd $(dirname $0)/..; echo $PWD`"
REPO_ROOT="`cd $PACKAGE_ROOT/../..; echo $PWD`"
"$REPO_ROOT/bin/docs.sh" "$PACKAGE_ROOT"
