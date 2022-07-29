import { SinglesigAddressType, LitecoinjsKeyPair, LitecoinAddressFormat } from './types'
import { publicKeyToAddress } from './helpers'
import {
  NetworkType,
  HDNode,
  deriveHDNode as commonDerive,
  isValidXprv,
  isValidXpub,
  validateHdKey,
  convertXPrefixHdKeys,
} from '@bitaccess/coinlib-common'
import { NETWORKS } from './constants'

export { HDNode, isValidXprv, isValidXpub, validateHdKey, convertXPrefixHdKeys }

/**
 * Derive the base HDNode required for deriveKeyPair, deriveAddress, and derivePrivateKey functions
 *
 * This partially applies the derivation path starting at the already derived depth of the provided key.
 */
export function deriveHDNode(hdKey: string, derivationPath: string, networkType: NetworkType): HDNode {
  const network = NETWORKS[networkType]
  return commonDerive(hdKey, derivationPath, network)
}

export function deriveKeyPair(baseNode: HDNode, index: number): LitecoinjsKeyPair {
  return baseNode.derive(0).derive(index)
}

export function deriveAddress(
  baseNode: HDNode,
  index: number,
  networkType: NetworkType,
  addressType: SinglesigAddressType,
  format: LitecoinAddressFormat,
): string {
  const keyPair = deriveKeyPair(baseNode, index)
  return publicKeyToAddress(keyPair.publicKey, networkType, addressType, format)
}

export function derivePrivateKey(baseNode: HDNode, index: number) {
  const keyPair = deriveKeyPair(baseNode, index)
  return keyPair.toWIF()
}

export function xprvToXpub(xprv: string, derivationPath: string, networkType: NetworkType) {
  const node = deriveHDNode(xprv, derivationPath, networkType)
  return node.neutered().toBase58()
}
