#!/bin/bash
set -e

# Builds all of the packages

lerna run --stream --scope=@bitaccess/coinlib-common build
lerna run --stream --scope=@bitaccess/coinlib-bitcoin build
lerna run --stream --scope=@bitaccess/coinlib-* --ignore=@bitaccess/coinlib-payments --ignore=@bitaccess/coinlib-bitcoin --parallel build
lerna run --stream --scope=@bitaccess/coinlib-payments build
