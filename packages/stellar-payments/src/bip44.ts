// Many parts of this code are snippets from tronWeb:
// https://github.com/tronprotocol/tron-web/blob/master/src/index.js

import { BIP32Interface as HDNode, fromBase58, fromSeed } from 'bip32'
import baseX from 'base-x'
import { padLeft } from './utils'
import crypto from 'crypto'
import { StellarSignatory } from './types'

export const STELLAR_B58_DICT = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz'
export const base58 = baseX(STELLAR_B58_DICT)

export const derivationPath = "m/44'/144'/0'"
const derivationPathParts = derivationPath.split('/').slice(1)

export function deriveSignatory(hdKey: string, index: number): StellarSignatory {
  const key = fromBase58(hdKey)
  const derived = deriveBasePath(key)
    .derive(0)
    .derive(index)
  const privateKey = derived.isNeutered() ? '' : hdNodeToPrivateKey(derived)
  const publicKey = hdNodeToPublicKey(derived)
  const address = publicKeyToAddress(publicKey)
  return {
    address,
    secret: {
      privateKey,
      publicKey,
    },
  }
}

export function xprvToXpub(xprv: string | HDNode): string {
  const key = typeof xprv === 'string' ? fromBase58(xprv) : xprv
  const derivedPubKey = deriveBasePath(key)
  return derivedPubKey.neutered().toBase58()
}

export function generateNewKeys(): { xpub: string; xprv: string } {
  const key = fromSeed(crypto.randomBytes(32))
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

export function hdNodeToPublicKey(key: HDNode): string {
  const hexKey = padLeft(key.publicKey.toString('hex'), 66, '0')
  return hexKey.toUpperCase()
}

export function hdNodeToPrivateKey(key: HDNode): string {
  if (key.isNeutered() || typeof key.privateKey === 'undefined') {
    throw new Error('Cannot derive private key from neutered bip32 node')
  }
  const hexKey = padLeft(key.privateKey.toString('hex'), 64, '0')
  return hexKey.toUpperCase()
}

/**
 * Source: https://xrpl.org/accounts.html#address-encoding
 */
export function publicKeyToAddress(pubkeyHex: string): string {
  const pubkeyBuffer = Buffer.from(pubkeyHex, 'hex')
  const pubkeyInnerHash = crypto.createHash('sha256').update(pubkeyBuffer)
  const pubkeyOuterHash = crypto.createHash('ripemd160')
  pubkeyOuterHash.update(pubkeyInnerHash.digest())
  const accountId = pubkeyOuterHash.digest()
  const addressTypePrefix = Buffer.from([0x00])
  const payload = Buffer.concat([addressTypePrefix, accountId])
  const chksumHash1 = crypto
    .createHash('sha256')
    .update(payload)
    .digest()
  const chksumHash2 = crypto
    .createHash('sha256')
    .update(chksumHash1)
    .digest()
  const checksum = chksumHash2.slice(0, 4)
  const dataToEncode = Buffer.concat([payload, checksum])
  const address = base58.encode(dataToEncode)
  return address
}
