#!/bin/bash
set -e

ROOT=$(cd $(dirname $0)/..; pwd)

LERNA_V="v$($ROOT/bin/extract-version.sh $ROOT/lerna.json)"
echo "Publishing $LERNA_V"

./node_modules/.bin/lerna run --stream build

TAGGED_COMMIT=$(git rev-list -n 1 $LERNA_V 2>/dev/null || true)
if [ -z "$TAGGED_COMMIT" ]; then
  echo "Tagging current commit as $LERNA_V"
  git tag $LERNA_V
  git push --tags
else
  echo "Checking out $LERNA_V"
  git checkout "$LERNA_V"
fi

./node_modules/.bin/lerna publish from-package
