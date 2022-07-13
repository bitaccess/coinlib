import { createUnitConverters, NetworkType, bip32, BitcoinishAddressType } from '@bitaccess/coinlib-common'
import { bitcoinish, publicKeyToBuffer, BitcoinjsNetwork, AddressType } from '@bitaccess/coinlib-bitcoin'
import * as bitcoincash from 'bitcoinforksjs-lib'
import bchaddrjs from 'bchaddrjs'

import { BitcoinjsKeyPair, BitcoinCashAddressFormat } from './types'
import {
  DECIMAL_PLACES,
  DEFAULT_ADDRESS_FORMAT,
  NETWORKS,
  BITCOINCASH_COINTYPE_MAINNET,
  BITCOINCASH_COINTYPE_TESTNET,
  NETWORK_MAINNET,
  NETWORK_TESTNET,
} from './constants'

export { publicKeyToString, publicKeyToBuffer } from '@bitaccess/coinlib-bitcoin'

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

export function isValidAddress(
  address: string,
  networkType: NetworkType,
  format?: BitcoinCashAddressFormat, // undefined -> any
): boolean {
  if (!bchaddrjs.isValidAddress(address)) {
    return false
  }
  if (networkType === NetworkType.Mainnet && !bchaddrjs.isMainnetAddress(address)) {
    return false
  } else if (networkType === NetworkType.Testnet && !bchaddrjs.isTestnetAddress(address)) {
    return false
  }
  try {
    if (format === BitcoinCashAddressFormat.Cash) {
      return bchaddrjs.isCashAddress(address)
    } else if (format === BitcoinCashAddressFormat.BitPay) {
      return bchaddrjs.isBitpayAddress(address)
    } else if (format === BitcoinCashAddressFormat.Legacy) {
      return bchaddrjs.isLegacyAddress(address)
    }
    // undefined format -> any format is acceptable
    return true
  } catch (e) {
    return false
  }
}

export function standardizeAddress(
  address: string,
  networkType: NetworkType,
  format: BitcoinCashAddressFormat,
): string | null {
  if (!isValidAddress(address, networkType)) {
    return null
  }
  if (format === BitcoinCashAddressFormat.Cash) {
    return bchaddrjs.toCashAddress(address)
  } else if (format === BitcoinCashAddressFormat.BitPay) {
    return bchaddrjs.toBitpayAddress(address)
  } else if (format === BitcoinCashAddressFormat.Legacy) {
    return bchaddrjs.toLegacyAddress(address)
  }
  return null
}

export function isValidPublicKey(publicKey: string | Buffer, networkType: NetworkType): boolean {
  try {
    bitcoincash.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network: NETWORKS[networkType] })
    return true
  } catch (e) {
    return false
  }
}

export function isValidPrivateKey(privateKey: string, networkType: NetworkType): boolean {
  try {
    privateKeyToKeyPair(privateKey, networkType)
    return true
  } catch (e) {
    return false
  }
}

export function getSinglesigPaymentScript(networkType: NetworkType, pubkey: Buffer): bitcoincash.payments.Payment {
  const scriptParams = { network: NETWORKS[networkType], pubkey }
  return bitcoincash.payments.p2pkh(scriptParams)
}

export function getMultisigPaymentScript(
  networkType: NetworkType,
  pubkeys: Buffer[],
  m: number,
  format: BitcoinCashAddressFormat = DEFAULT_ADDRESS_FORMAT,
): bitcoincash.payments.Payment {
  const network = NETWORKS[networkType]
  const scriptParams = {
    network,
    redeem: bitcoincash.payments.p2ms({
      pubkeys: pubkeys.sort(),
      m,
      network,
    }),
  }
  // convert legacy address to cashaddr
  const script = bitcoincash.payments.p2sh(scriptParams)
  if (script.address) {
    script.address = standardizeAddress(script.address, networkType, format) || undefined
  }
  return script
}

export function publicKeyToAddress(
  publicKey: string | Buffer,
  networkType: NetworkType,
  format: BitcoinCashAddressFormat,
): string {
  const pubkey = publicKeyToBuffer(publicKey)
  const script = getSinglesigPaymentScript(networkType, pubkey)
  const { address } = script
  if (!address) {
    throw new Error('bitcoinforksjs-lib address derivation returned falsy value')
  }
  const standardAddress = standardizeAddress(address, networkType, format)
  if (!standardAddress) {
    throw new Error('Failed to standardize derived BCH address')
  }
  return standardAddress
}

export function publicKeyToKeyPair(publicKey: string | Buffer, networkType: NetworkType): BitcoinjsKeyPair {
  return bitcoincash.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network: NETWORKS[networkType] })
}

export function privateKeyToKeyPair(privateKey: string, networkType: NetworkType): BitcoinjsKeyPair {
  return bitcoincash.ECPair.fromWIF(privateKey, NETWORKS[networkType])
}

export function privateKeyToAddress(privateKey: string, networkType: NetworkType, format: BitcoinCashAddressFormat) {
  const keyPair = privateKeyToKeyPair(privateKey, networkType)
  return publicKeyToAddress(keyPair.publicKey, networkType, format)
}

export function estimateBitcoinCashTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  networkType: NetworkType,
) {
  return bitcoinish.estimateTxSize(inputCounts, outputCounts, (address: string) =>
    bitcoincash.address.toOutputScript(address, NETWORKS[networkType]),
  )
}

export function determinePathForIndex(
  accountIndex: number,
  addressType?: BitcoinishAddressType,
  networkType?: NetworkType,
): string {
  if (addressType && ![AddressType.Legacy, AddressType.MultisigLegacy].includes(addressType)) {
    throw new TypeError(`Bitcoincash does not support this type ${addressType}`)
  }
  let purpose: string = '44'
  if (addressType) {
    purpose = bitcoinish.BITCOINISH_ADDRESS_PURPOSE[addressType]
  }

  let cointype = BITCOINCASH_COINTYPE_MAINNET
  if (networkType === NetworkType.Testnet) {
    cointype = BITCOINCASH_COINTYPE_TESTNET
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

  const bitcoincashSupportedPurposes = [`44'`, `87'`]
  const purpose = splitPath[1]
  if (!bitcoincashSupportedPurposes.includes(purpose)) {
    throw new TypeError(`Purpose in derivationPath ${purpose} not supported by Bitcoincash`)
  }

  const coinType = splitPath[2]
  let network: BitcoinjsNetwork | null = null
  if (coinType === `${BITCOINCASH_COINTYPE_MAINNET}'`) {
    network = NETWORK_MAINNET
  } else if (coinType === `${BITCOINCASH_COINTYPE_TESTNET}'`) {
    network = NETWORK_TESTNET
  } else {
    throw new TypeError(`Invalid derivationPath coin type ${coinType}`)
  }

  const root = bip32.fromSeed(seed, network)
  const account = root.derivePath(derivationPath)
  return account.neutered().toBase58()
}
