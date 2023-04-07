#!/bin/bash
set -e

# Builds all of the packages

lerna run --stream --scope=@bitaccess/coinlib-types build
lerna run --stream --scope=@bitaccess/coinlib-common build
lerna run --stream --scope=@bitaccess/coinlib-bitcoin build
lerna run --stream --scope=@bitaccess/coinlib-* --ignore=@bitaccess/coinlib --ignore=@bitaccess/coinlib-bitcoin --ignore=@bitaccess/coinlib-common --ignore=@bitaccess/coinlib-types --parallel build
lerna run --stream --scope=@bitaccess/coinlib build
