import { BitcoinCashAddressFormat, BitcoinjsKeyPair } from './types'
import { BitcoinjsNetwork, bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { publicKeyToAddress } from './helpers'
import { NetworkType, HDNode, bip32 } from '@bitaccess/coinlib-common'

const convertXPrefixHdKeys = bitcoinish.convertXPrefixHdKeys
export { HDNode, convertXPrefixHdKeys }

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

/**
 * Derive the base HDNode required for deriveKeyPair, deriveAddress, and derivePrivateKey functions
 *
 * This partially applies the derivation path starting at the already derived depth of the provided key.
 */
export function deriveHDNode(hdKey: string, derivationPath: string, network: BitcoinjsNetwork): HDNode {
  if (network) {
    hdKey = bitcoinish.convertXPrefixHdKeys(hdKey, network)
  }
  const rootNode = bip32.fromBase58(hdKey, network)
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
  baseNode: HDNode,
  index: number,
  networkType: NetworkType,
  format: BitcoinCashAddressFormat,
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
    return !bip32.fromBase58(xprv, network).isNeutered()
  } catch (e) {
    return false
  }
}

export function isValidXpub(xpub: string, network?: BitcoinjsNetwork): boolean {
  try {
    return bip32.fromBase58(xpub, network).isNeutered()
  } catch (e) {
    return false
  }
}

/** Return string error if invalid, undefined otherwise */
export function validateHdKey(hdKey: string, network?: BitcoinjsNetwork): string | undefined {
  try {
    bip32.fromBase58(hdKey, network)
  } catch (e) {
    return e.toString()
  }
}
