#!/bin/bash
# Finds problematic relative path imports of local packages
if grep -rnw -e '\.\./coinlib' packages/*/src packages/*/test; then
  echo "Found relative imports of local packages that should be replaced with '@bitaccess/<packageName>'"
  exit 1
fi
