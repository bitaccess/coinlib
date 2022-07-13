import { createUnitConverters, NetworkType, bip32, BitcoinishAddressType } from '@bitaccess/coinlib-common'
import { bitcoinish, BitcoinjsNetwork, AddressType } from '@bitaccess/coinlib-bitcoin'

import * as bitcoin from 'bitcoinjs-lib-bigint'

import {
  DECIMAL_PLACES,
  NETWORKS,
  DOGECOIN_COINTYPE_MAINNET,
  DOGECOIN_COINTYPE_TESTNET,
  NETWORK_MAINNET,
  NETWORK_TESTNET,
} from './constants'

const {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
  privateKeyToAddress,
  BITCOINISH_ADDRESS_PURPOSE,
} = bitcoinish

export {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
  privateKeyToAddress,
}

const {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
} = createUnitConverters(DECIMAL_PLACES)

export {
  toMainDenominationBigNumber,
  toMainDenominationString,
  toMainDenominationNumber,
  toBaseDenominationBigNumber,
  toBaseDenominationString,
  toBaseDenominationNumber,
}

export function isValidAddress(address: string, networkType: NetworkType): boolean {
  return bitcoinish.isValidAddress(address, NETWORKS[networkType])
}

export function standardizeAddress(address: string, networkType: NetworkType): string | null {
  return bitcoinish.standardizeAddress(address, NETWORKS[networkType])
}

export function isValidPublicKey(publicKey: string | Buffer, networkType: NetworkType): boolean {
  return bitcoinish.isValidPublicKey(publicKey, NETWORKS[networkType])
}

export function isValidExtraId(extraId: string): boolean {
  return false
}

export function isValidPrivateKey(privateKey: string, networkType: NetworkType): boolean {
  return bitcoinish.isValidPrivateKey(privateKey, NETWORKS[networkType])
}

export function estimateDogeTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  networkType: NetworkType,
) {
  return bitcoinish.estimateTxSize(inputCounts, outputCounts, (address: string) =>
    bitcoin.address.toOutputScript(address, NETWORKS[networkType]),
  )
}

export function determinePathForIndex(
  accountIndex: number,
  addressType?: BitcoinishAddressType,
  networkType?: NetworkType,
): string {
  if (addressType && ![AddressType.Legacy, AddressType.MultisigLegacy].includes(addressType)) {
    throw new TypeError(`Dogecoin does not support this type ${addressType}`)
  }
  let purpose: string = '44'
  if (addressType) {
    purpose = BITCOINISH_ADDRESS_PURPOSE[addressType]
  }

  let cointype = DOGECOIN_COINTYPE_MAINNET
  if (networkType === NetworkType.Testnet) {
    cointype = DOGECOIN_COINTYPE_TESTNET
  }

  const derivationPath = `m/${purpose}'/${cointype}'/${accountIndex}'`
  return derivationPath
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

export function deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
  const splitPath = derivationPath.split('/')
  if (splitPath?.length !== 4 || splitPath[0] !== 'm') {
    throw new TypeError(`Invalid derivationPath ${derivationPath}`)
  }

  const dogecoinSupportedPurposes = [`44'`, `87'`]
  const purpose = splitPath[1]
  if (!dogecoinSupportedPurposes.includes(purpose)){
    throw new TypeError(`Purpose in derivationPath ${purpose} not supported by Dogecoin`)
  }

  const coinType = splitPath[2]
  let network: BitcoinjsNetwork | null = null
  if (coinType === `${DOGECOIN_COINTYPE_MAINNET}'`) {
    network = NETWORK_MAINNET
  } else if (coinType === `${DOGECOIN_COINTYPE_TESTNET}'`) {
    network = NETWORK_TESTNET
  } else {
    throw new TypeError(`Invalid derivationPath coin type ${coinType}`)
  }

  const root = bip32.fromSeed(seed, network)
  const account = root.derivePath(derivationPath)
  return account.neutered().toBase58()
}
