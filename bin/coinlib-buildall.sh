#!/usr/bin/env bash
set -e

# Builds all of the packages

npx lerna run --stream --scope=@bitaccess/coinlib-types build
npx lerna run --stream --scope=@bitaccess/coinlib-common build
npx lerna run --stream --scope=@bitaccess/coinlib-bitcoin build
npx lerna run --stream --scope=@bitaccess/coinlib-* --ignore=@bitaccess/coinlib --ignore=@bitaccess/coinlib-bitcoin --ignore=@bitaccess/coinlib-common --ignore=@bitaccess/coinlib-types --parallel build
npx lerna run --stream --scope=@bitaccess/coinlib build
