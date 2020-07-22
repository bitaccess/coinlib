#!/bin/bash

# Builds all of the packages

lerna run --stream --scope=@faast/payments-common build
lerna run --stream --scope=@faast/bitcoin-payments build
lerna run --stream --scope=@faast/*-payments --ignore=@faast/coin-payments --ignore=@faast/bitcoin-payments --parallel build
lerna run --stream --scope=@faast/coin-payments build
