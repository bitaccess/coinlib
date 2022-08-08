#!/bin/bash
set -e

ROOT=$(cd $(dirname $0)/..; pwd)

LERNA_V="v$($ROOT/bin/extract-version.sh $ROOT/lerna.json)"
echo "Publishing $LERNA_V"

lerna run --stream build

git tag $LERNA_V
git push --tags

lerna publish from-package
