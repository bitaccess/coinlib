import { SinglesigAddressType, BitcoinjsKeyPair } from './types'
import { BitcoinjsNetwork, bip32MagicNumberToPrefix } from './bitcoinish'
import { publicKeyToAddress } from './helpers'
import { deriveHDNode, HDNode } from '@bitaccess/coinlib-common'

export { bip32MagicNumberToPrefix, HDNode }

export function deriveKeyPair(baseNode: HDNode, index: number, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return baseNode.derive(0).derive(index)
}

export function deriveAddress(
  baseNode: HDNode,
  index: number,
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
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
