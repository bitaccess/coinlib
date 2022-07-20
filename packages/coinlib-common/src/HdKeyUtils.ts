import crypto from 'crypto'
import { isString } from '@bitaccess/ts-common'

import { bip32, bip39, bs58, HDNode } from './SharedDependencies'
import { Bip32Network } from './types'
import { BIP39_SEED_REGEX, BIP39_SEED_BYTES, DERIVATION_PATH_REGEX } from './constants'

export function generateNewSeed(): Buffer {
  return crypto.randomBytes(BIP39_SEED_BYTES)
}

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
export function convertXPrefixHdKeys(hdKey: string, network: Bip32Network): string {
  let newMagicNumber
  if (hdKey.startsWith('xpub')) {
    newMagicNumber = network.bip32.public
  } else if (hdKey.startsWith('xprv')) {
    newMagicNumber = network.bip32.private
  } else {
    // Not recognized so probably already has network prefix
    return hdKey
  }
  let data = bs58.decode(hdKey)
  data = data.slice(4)
  data = Buffer.concat([bufferFromUInt32(newMagicNumber), data])
  return bs58.encode(data)
}

export function hdKeyToHdNode(hdKey: string, network?: Bip32Network): HDNode {
  if (network) {
    hdKey = convertXPrefixHdKeys(hdKey, network)
  }
  return bip32.fromBase58(hdKey, network)
}

/**
 * Derive the base HDNode required for deriveKeyPair, deriveAddress, and derivePrivateKey functions
 *
 * This partially applies the derivation path starting at the already derived depth of the provided key.
 */
export function deriveHDNode(hdKey: string | HDNode, derivationPath: string, network?: Bip32Network): HDNode {
  const rootNode = typeof hdKey === 'string'
    ? hdKeyToHdNode(hdKey, network)
    : hdKey
  const parts = splitDerivationPath(derivationPath).slice(rootNode.depth)
  let node = rootNode
  if (parts.length > 0) {
    node = rootNode.derivePath(parts.join('/'))
  }
  return node
}

export function isValidXprv(xprv: string, network?: Bip32Network): boolean {
  try {
    return !bip32.fromBase58(xprv, network).isNeutered()
  } catch (e) {
    return false
  }
}

export function isValidXpub(xpub: string, network?: Bip32Network): boolean {
  try {
    return bip32.fromBase58(xpub, network).isNeutered()
  } catch (e) {
    return false
  }
}

/** Return string error if invalid, undefined otherwise */
export function validateHdKey(hdKey: string, network?: Bip32Network): string | undefined {
  try {
    bip32.fromBase58(hdKey, network)
  } catch (e) {
    return e.toString()
  }
}

export function isValidHdKey(hdKey: string, network?: Bip32Network): boolean {
  return !validateHdKey(hdKey, network)
}

export function determineHdNode(root: string | Buffer | HDNode, network?: Bip32Network): HDNode {
  if (isString(root)) {
    if (BIP39_SEED_REGEX.test(root)) {
      return bip32.fromSeed(Buffer.from(root, 'hex'))
    } else if (bip39.validateMnemonic(root)) {
      return bip32.fromSeed(bip39.mnemonicToSeedSync(root))
    } else if (isValidHdKey(root, network)) {
      return bip32.fromBase58(root, network)
    } else if (network && isValidHdKey(root)) {
      return bip32.fromBase58(convertXPrefixHdKeys(root, network))
    } else {
      throw new Error('Invalid bip39 mnemonic, seed, or bip32 xkey')
    }
  } else if (root instanceof Buffer) {
    if (root.length !== BIP39_SEED_BYTES) {
      throw new Error(`Invalid bip39 seed buffer provided with length ${root.length} when ${BIP39_SEED_BYTES} is expected`)
    }
    return bip32.fromSeed(root)
  } else {
    return root
  }
}

export abstract class HdKeyUtils {

  private readonly hdNode: HDNode
  public readonly xprv: string | null
  public readonly xpub: string

  constructor(xkey: string, derivationPath: string, network?: Bip32Network)
  constructor(seed: string | Buffer, derivationPath: string, network?: Bip32Network)
  constructor(rootNode: HDNode, derivationPath: string, network?: Bip32Network)
  constructor(root: HDNode | string | Buffer, derivationPath: string, network?: Bip32Network) {
    if (!DERIVATION_PATH_REGEX.test(derivationPath)) {
      throw new Error(`Invalid derivation path: ${derivationPath}`)
    }
    const hdNode = determineHdNode(root, network)
    this.hdNode = deriveHDNode(hdNode, derivationPath)
    this.xprv = this.hdNode.isNeutered() ? null : this.hdNode.toBase58()
    this.xpub = this.hdNode.neutered().toBase58()
  }

  abstract publicKeyToAddress(pubKeyBuffer: Buffer): string
  abstract publicKeyToString(pubKeyBuffer: Buffer): string
  abstract privateKeyToString(privateKeyBuffer: Buffer): string

  /** Returns an HDNode derived to a particular address index */
  private deriveByIndex(index: number) {
    return this.hdNode.derive(index)
  }

  getAddress(index: number): string {
    const derived = this.deriveByIndex(index)
    const address = this.publicKeyToAddress(derived.publicKey)
    return address
  }

  getPrivateKey(index: number): string | null {
    const derived = this.deriveByIndex(index)
    if (!derived.privateKey) {
      return null
    }
    return this.privateKeyToString(derived.privateKey)
  }

  getPublicKey(index: number): string {
    return this.publicKeyToString(this.deriveByIndex(index).publicKey)
  }

  getXPrivateKey(): string | null {
    return this.xprv
  }

  getXPublicKey() {
    return this.xpub
  }
}
