#!/usr/bin/env node
const TronWeb = require('tronweb')
const fetch = require('node-fetch')

const ADDRESS = process.env.ADDRESS || 'TFnVxk2EAWYCPtEjiMfF1zZwJgP3PzHgdR'

// see https://github.com/tronprotocol/Documentation/blob/master/TRX_CN/Official_Public_Node.md
const TRON_GRID = 'https://api.trongrid.io'
const nodes = [
  TRON_GRID,
  'http://54.236.37.243:8090',
  'http://52.53.189.99:8090',
  'http://18.196.99.16:8090',
  'http://34.253.187.192:8090',
  'http://52.56.56.149:8090',
  'http://35.180.51.163:8090',
  'http://54.252.224.209:8090',
  'http://18.228.15.36:8090',
  'http://52.15.93.92:8090',
  'http://34.220.77.106:8090',
  'http://13.127.47.162:8090',
  'http://13.124.62.58:8090',
  'http://47.74.149.206:8090',
  'http://47.90.240.187:8090',
  'http://47.90.215.84:8090',
  'http://47.254.77.146:8090',
  'http://47.74.242.55:8090',
  'http://47.75.249.119:8090',
  'http://47.90.201.118:8090',
  'http://47.74.21.68:8090',
  'http://47.74.13.168:8090',
  'http://47.74.33.41:8090',
  'http://47.52.59.134:8090',
  'http://47.74.229.70:8090',
  'http://47.254.27.69:8090',
  'http://47.89.243.195:8090',
  'http://47.90.201.112:8090',
  'http://47.88.174.175:8090',
  'http://47.74.224.123:8090',
  'http://47.75.249.4:8090',
]

function tronScanGetBalance(address) {
  return fetch(`https://apilist.tronscan.org/api/account?address=${address}`, {'credentials':'omit','headers':{'accept':'application/json, text/plain, */*'},'referrer':'https://tronscan.org/','referrerPolicy':'no-referrer-when-downgrade','body':null,'method':'GET','mode':'cors'})
    .then((r) => r.json())
    .then((r) => r.balance / 1e6)
}

console.log(`checking balance of ${ADDRESS}`)
tronScanGetBalance(ADDRESS)
  .then((tronScanBalance) => {
    console.log(`tronscan.org API -> ${tronScanBalance} TRX`)
    nodes.map((node) => {
      const tw = new TronWeb({ fullHost: node, eventServer: TRON_GRID, solidityNode: TRON_GRID })
      tw.trx.getBalance(ADDRESS)
        .then((b) => console.log(`${node} -> ${b / 1e6} TRX`))
        .catch((e) => console.log(`${node} -> ${e.message}`))
    })
  })
