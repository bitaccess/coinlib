import { BitcoinCashAddressFormat, BitcoinjsKeyPair } from './types'
import { BitcoinjsNetwork } from '@bitaccess/coinlib-bitcoin'
import { publicKeyToAddress } from './helpers'
import { HDNode, NetworkType, deriveHDNode, validateHdKey, isValidXprv, isValidXpub } from '@bitaccess/coinlib-common'

export { HDNode, deriveHDNode, validateHdKey, isValidXprv, isValidXpub }

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
