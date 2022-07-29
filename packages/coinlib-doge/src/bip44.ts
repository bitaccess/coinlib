import { BitcoinjsKeyPair } from './types'
import { BitcoinjsNetwork } from '@bitaccess/coinlib-bitcoin'
import { HDNode, deriveHDNode, isValidXpub, isValidXprv, validateHdKey } from '@bitaccess/coinlib-common'
import { publicKeyToAddress } from './helpers'
import { SINGLESIG_ADDRESS_TYPE } from './constants'

export { HDNode, deriveHDNode, isValidXprv, isValidXpub, validateHdKey }

export function deriveKeyPair(baseNode: HDNode, index: number, network: BitcoinjsNetwork): BitcoinjsKeyPair {
  return baseNode.derive(0).derive(index)
}

export function deriveAddress(baseNode: HDNode, index: number, network: BitcoinjsNetwork): string {
  const keyPair = deriveKeyPair(baseNode, index, network)
  return publicKeyToAddress(keyPair.publicKey, network, SINGLESIG_ADDRESS_TYPE)
}

export function derivePrivateKey(baseNode: HDNode, index: number, network: BitcoinjsNetwork) {
  const keyPair = deriveKeyPair(baseNode, index, network)
  return keyPair.toWIF()
}

export function xprvToXpub(xprv: string, derivationPath: string, network: BitcoinjsNetwork) {
  const node = deriveHDNode(xprv, derivationPath, network)
  return node.neutered().toBase58()
}
