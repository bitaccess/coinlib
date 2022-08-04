#!/bin/bash
# Extracts the "version" field from a JSON file
exec node -e "console.log(require('$1').version)"
