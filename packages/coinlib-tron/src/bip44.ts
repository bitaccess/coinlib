// Many parts of this code are snippets from tronWeb:
// https://github.com/tronprotocol/tron-web/blob/master/src/index.js

import { bip32, HDNode } from '@bitaccess/coinlib-common'
import { keccak_256 as keccak256 } from 'js-sha3'
import JsSha from 'jssha'
import { ec as EC } from 'elliptic'
import crypto from 'crypto'

import { encode58 } from './base58'
import { isValidXpub, isValidXprv } from './helpers'

const ec = new EC('secp256k1')

export const derivationPath = "m/44'/195'/0'"
const derivationPathParts = derivationPath.split('/').slice(1)

type HDKey<K> = {
  depth: number
  derive: (path: string | number, hardened?: boolean) => K
}

export function deriveAddress(xpub: string, index: number): string {
  if (!isValidXpub(xpub)) {
    throw new Error('Invalid xpub')
  }
  const key = bip32.fromBase58(xpub)
  const derived = deriveBasePath(key)
    .derive(0)
    .derive(index)
  return hdPublicKeyToAddress(derived)
}

export function derivePrivateKey(xprv: string, index: number): string {
  if (!isValidXprv(xprv)) {
    throw new Error('Invalid xprv')
  }
  const key = bip32.fromBase58(xprv)
  const derived = deriveBasePath(key)
    .derive(0)
    .derive(index)
  return hdPrivateKeyToPrivateKey(derived)
}

export function xprvToXpub(xprv: string | HDNode): string {
  const key = typeof xprv === 'string' ? bip32.fromBase58(xprv) : xprv
  const derivedPubKey = deriveBasePath(key)
  return derivedPubKey.neutered().toBase58()
}

export function generateNewKeys(): { xpub: string; xprv: string } {
  const key = bip32.fromSeed(crypto.randomBytes(32))
  const xprv = key.toBase58()
  const xpub = xprvToXpub(xprv)
  return {
    xprv,
    xpub,
  }
}

// HELPER FUNCTIONS

function deriveBasePath(key: HDNode): HDNode {
  const parts = derivationPathParts.slice(key.depth)
  if (parts.length > 0) {
    return key.derivePath(`m/${parts.join('/')}`)
  }
  return key
}

function hdPublicKeyToAddress(key: HDNode): string {
  return addressBytesToB58CheckAddress(pubBytesToTronBytes(bip32PublicToTronPublic(key.publicKey)))
}

function hdPrivateKeyToPrivateKey(key: HDNode): string {
  if (key.isNeutered() || typeof key.privateKey === 'undefined') {
    throw new Error('Invalid HD private key, must not be neutered')
  }
  return bip32PrivateToTronPrivate(key.privateKey)
}

function bip32PublicToTronPublic(pubKey: any): number[] {
  const pubkey = ec.keyFromPublic(pubKey).getPublic()
  const x = pubkey.getX()
  const y = pubkey.getY()

  let xHex = x.toString('hex')

  while (xHex.length < 64) {
    xHex = `0${xHex}`
  }

  let yHex = y.toString('hex')

  while (yHex.length < 64) {
    yHex = `0${yHex}`
  }

  const pubkeyHex = `04${xHex}${yHex}`
  const pubkeyBytes = hexStr2byteArray(pubkeyHex)

  return pubkeyBytes
}

function bip32PrivateToTronPrivate(priKeyBytes: Buffer): string {
  const key = ec.keyFromPrivate(priKeyBytes, 'bytes')
  let priKeyHex = key.getPrivate('hex')
  while (priKeyHex.length < 64) {
    priKeyHex = `0${priKeyHex}`
  }
  const privArray = hexStr2byteArray(priKeyHex)
  return byteArray2hexStr(privArray)
}

// Borrowed from tronweb:  https://github.com/tronprotocol/tron-web/blob/master/src/utils/code.js
const ADDRESS_PREFIX = '41'
function byte2hexStr(byte: number): string {
  const hexByteMap = '0123456789ABCDEF'

  let str = ''
  str += hexByteMap.charAt(byte >> 4)
  str += hexByteMap.charAt(byte & 0x0f)

  return str
}

function hexStr2byteArray(str: string): number[] {
  const byteArray = []
  let d = 0
  let j = 0
  let k = 0

  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i)

    if (isHexChar(c)) {
      d <<= 4
      d += hexChar2byte(c)
      j++

      if (j % 2 === 0) {
        byteArray[k++] = d
        d = 0
      }
    }
  }

  return byteArray
}

function isHexChar(c: string): boolean {
  return (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9')
}

function hexChar2byte(c: string): number {
  let d = 0

  if (c >= 'A' && c <= 'F') {
    d = c.charCodeAt(0) - 'A'.charCodeAt(0) + 10
  } else if (c >= 'a' && c <= 'f') {
    d = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10
  } else if (c >= '0' && c <= '9') {
    d = c.charCodeAt(0) - '0'.charCodeAt(0)
  }

  return d
}

function byteArray2hexStr(byteArray: number[]): string {
  let str = ''

  for (let i = 0; i < byteArray.length; i++) {
    str += byte2hexStr(byteArray[i])
  }
  return str
}

function pubBytesToTronBytes(pubBytes: number[]): number[] {
  if (pubBytes.length === 65) {
    pubBytes = pubBytes.slice(1)
  }

  const hash = keccak256(pubBytes).toString()
  const addressHex = `${ADDRESS_PREFIX}${hash.substring(24)}`

  return hexStr2byteArray(addressHex)
}

function addressBytesToB58CheckAddress(addressBytes: number[]) {
  const hash0 = SHA256(addressBytes)
  const hash1 = SHA256(hash0)
  let checkSum = hash1.slice(0, 4)
  checkSum = addressBytes.concat(checkSum)
  return encode58(checkSum)
}

function SHA256(msgBytes: number[]): number[] {
  const shaObj = new JsSha('SHA-256', 'HEX')
  const msgHex = byteArray2hexStr(msgBytes)
  shaObj.update(msgHex)
  const hashHex = shaObj.getHash('HEX')
  return hexStr2byteArray(hashHex)
}
