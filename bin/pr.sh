#!/bin/bash
set -e

ROOT=$(dirname $0)/..

GIT_CHANGES=$(git status --porcelain)
if [ "$GIT_CHANGES" ]; then
  echo "Working directory is not clean. Stash or commit your changes and try again."
  exit 1
fi

BRANCH=$(git branch -q --show-current)
if [ "$BRANCH" = "master" ]; then
  echo "Cannot create pull request while on master"
  exit 1
fi

git push -u origin "$BRANCH"

# Fetch master for accurate summary
git fetch origin master

# Summarize commits relative to origin/master
SUMMARY=$(git log --pretty="- %s" $(git merge-base origin/master HEAD)..HEAD)

gh pr create -r @bitaccess/coinlib-devs -t $BRANCH -b "$SUMMARY$(tail -n +6 $ROOT/pull_request_template.md)"
