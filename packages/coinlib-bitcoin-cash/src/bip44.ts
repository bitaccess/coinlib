import { BIP32Interface as HDNode, fromBase58 } from 'bip32'
import { BitcoinCashAddressFormat, BitcoinjsKeyPair } from './types'
import { BitcoinjsNetwork } from '@bitaccess/coinlib-bitcoin'
import { publicKeyToAddress } from './helpers'
import { NetworkType } from '@bitaccess/coinlib-common'
import  b58 from 'bs58check'

export { HDNode }

/**
 * Split full path into array of indices
 *
 * @example "m/44'/0'/0'/1/23" -> ["44'", "0'", "0'", "1", "23"]
 */
export function splitDerivationPath(path: string): string[] {
  const parts = path.split('/')
  if (parts[0] === 'm') {
    return parts.slice(1)
  }
  return parts
}


function bufferFromUInt32(x: number) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(x, 0)
  return b
}

/**
 * Utility for converting xpub/xprv prefixed hd keys to the network specific prefix (ie Ltub/Ltpv)
 */
 export function convertXPrefixHdKeys(
  hdKey: string,
  network: BitcoinjsNetwork,
): string {
  let newMagicNumber
  if (hdKey.startsWith('xpub')) {
    newMagicNumber = network.bip32.public
  } else if (hdKey.startsWith('xprv')) {
    newMagicNumber = network.bip32.private
  } else {
    // Not recognized so probably already has network prefix
    return hdKey
  }
  let data = b58.decode(hdKey)
  data = data.slice(4)
  data = Buffer.concat([bufferFromUInt32(newMagicNumber), data])
  return b58.encode(data)
}

/**
 * Derive the base HDNode required for deriveKeyPair, deriveAddress, and derivePrivateKey functions
 *
 * This partially applies the derivation path starting at the already derived depth of the provided key.
 */
export function deriveHDNode(hdKey: string, derivationPath: string, network: BitcoinjsNetwork): HDNode {
  if (network) {
    hdKey = convertXPrefixHdKeys(hdKey, network)
  }
  const rootNode = fromBase58(hdKey, network)
  const parts = splitDerivationPath(derivationPath).slice(rootNode.depth)
  let node = rootNode
  if (parts.length > 0) {
    node = rootNode.derivePath(parts.join('/'))
  }
  return node
}

export function deriveKeyPair(baseNode: HDNode, index: number): BitcoinjsKeyPair {
  return baseNode.derive(0).derive(index)
}

export function deriveAddress(
  baseNode: HDNode, index: number, networkType: NetworkType, format: BitcoinCashAddressFormat,
): string {
  const keyPair = deriveKeyPair(baseNode, index)
  return publicKeyToAddress(keyPair.publicKey, networkType, format)
}

export function derivePrivateKey(baseNode: HDNode, index: number) {
  const keyPair = deriveKeyPair(baseNode, index)
  return keyPair.toWIF()
}

export function xprvToXpub(xprv: string, derivationPath: string, network: BitcoinjsNetwork) {
  const node = deriveHDNode(xprv, derivationPath, network)
  return node.neutered().toBase58()
}

export function isValidXprv(xprv: string, network?: BitcoinjsNetwork): boolean {
  try {
    return !fromBase58(xprv, network).isNeutered()
  } catch(e) {
    return false
  }
}

export function isValidXpub(xpub: string, network?: BitcoinjsNetwork): boolean {
  try {
    return fromBase58(xpub, network).isNeutered()
  } catch(e) {
    return false
  }
}

/** Return string error if invalid, undefined otherwise */
export function validateHdKey(hdKey: string, network?: BitcoinjsNetwork): string | undefined {
  try {
    fromBase58(hdKey, network)
  } catch(e) {
    return e.toString()
  }
}
