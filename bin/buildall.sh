#!/bin/bash
set -e

# Builds all of the packages

./node_modules/.bin/lerna run --stream --scope=@bitaccess/coinlib-types build
./node_modules/.bin/lerna run --stream --scope=@bitaccess/coinlib-common build
./node_modules/.bin/lerna run --stream --scope=@bitaccess/coinlib-bitcoin build
./node_modules/.bin/lerna run --stream --scope=@bitaccess/coinlib-* --ignore=@bitaccess/coinlib --ignore=@bitaccess/coinlib-bitcoin --ignore=@bitaccess/coinlib-common --ignore=@bitaccess/coinlib-types --parallel build
./node_modules/.bin/lerna run --stream --scope=@bitaccess/coinlib build
