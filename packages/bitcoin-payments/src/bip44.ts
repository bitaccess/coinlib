import bitcoin, { ECPair } from 'bitcoinjs-lib'
import { BIP32Interface as HDNode, fromBase58 } from 'bip32'
import { BitcoinjsNetwork, AddressType } from './types'
import { publicKeyToAddress } from './helpers'

export { HDNode }

export type KeyPair = ECPair.Signer & {
  privateKey?: Buffer | undefined
  toWIF(): string
}

/**
 * Split full path into array of indices
 *
 * @example "m/44'/0'/0'/1/23" -> ["44'", "0'", "0'", "1", "23"]
 */
export function splitDerivationPath(path: string): string[] {
  let parts = path.split('/')
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
  const rootNode = fromBase58(hdKey, network)
  const parts = splitDerivationPath(derivationPath).slice(rootNode.depth)
  let node = rootNode
  if (parts.length > 0) {
    node = rootNode.derivePath(parts.join('/'))
  }
  return node
}

export function deriveKeyPair(baseNode: HDNode, index: number, network: BitcoinjsNetwork): KeyPair {
  return baseNode.derive(0).derive(index)
}

export function deriveAddress(
  baseNode: HDNode, index: number, network: BitcoinjsNetwork, addressType: AddressType,
): string {
  const keyPair = deriveKeyPair(baseNode, index, network)
  return publicKeyToAddress(keyPair.publicKey, network, addressType)
}

export function derivePrivateKey(baseNode: HDNode, index: number, network: BitcoinjsNetwork) {
  const keyPair = deriveKeyPair(baseNode, index, network)
  return keyPair.toWIF()
}

export function xprvToXpub(xprv: string, derivationPath: string, network: BitcoinjsNetwork) {
  const node = deriveHDNode(xprv, derivationPath, network)
  return node.neutered().toBase58()
}
