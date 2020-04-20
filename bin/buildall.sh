#!/bin/bash

# Builds all of the packages

lerna run --stream --scope=@faast/payments-common build
lerna run --stream --scope=@faast/*-payments --ignore=@faast/coin-payments --parallel build
lerna run --stream --scope=@faast/coin-payments build
