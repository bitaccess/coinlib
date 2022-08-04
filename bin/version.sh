#!/bin/bash
set -e

ROOT=$(cd $(dirname $0)/..; pwd)

GIT_CHANGES=$(git status --porcelain)
if [ "$GIT_CHANGES" ]; then
  echo "Working directory is not clean. Stash or commit your changes and try again."
  exit 1
fi

git checkout master
git fetch origin --tags
git pull origin master

CURRENT_TAG=$(git tag --points-at HEAD)
if [ "$CURRENT_TAG" ]; then
  echo "HEAD has already been tagged as version $CURRENT_TAG"
  exit 1
fi

lerna version $1 --no-push --no-git-tag-version
NEW_TAG="v$($ROOT/bin/extract-version.sh $ROOT/lerna.json)"
if [ "$NEW_TAG" = "$CURRENT_TAG" ]; then
  echo "NEW_TAG is the same as CURRENT_TAG, this shouldn't happen"
  exit 1
fi
echo "Creating rc version $LERNA_V"
git checkout -b rc/$NEW_TAG
git add .
git commit -s -m "$NEW_TAG"
git push -u origin rc/$NEW_TAG
"$ROOT/bin/pr.sh"
git checkout master
