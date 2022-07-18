import { createUnitConverters, NetworkType, BitcoinishAddressType } from '@bitaccess/coinlib-common'
import * as bitcoin from 'bitcoinjs-lib-bigint'
import {
  DECIMAL_PLACES,
  NETWORKS,
  BITCOIN_SUPPORTED_ADDRESS_TYPES,
} from './constants'
import * as bitcoinish from './bitcoinish'

export {
  getMultisigPaymentScript,
  getSinglesigPaymentScript,
  publicKeyToAddress,
  publicKeyToKeyPair,
  publicKeyToString,
  publicKeyToBuffer,
  privateKeyToKeyPair,
  privateKeyToAddress,
} from './bitcoinish'

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
  return bitcoinish.isValidExtraId(extraId)
}

export function isValidPrivateKey(privateKey: string, networkType: NetworkType): boolean {
  return bitcoinish.isValidPrivateKey(privateKey, NETWORKS[networkType])
}

export function estimateBitcoinTxSize(
  inputCounts: { [k: string]: number },
  outputCounts: { [k: string]: number },
  networkType: NetworkType,
) {
  return bitcoinish.estimateTxSize(inputCounts, outputCounts, (address: string) =>
    bitcoin.address.toOutputScript(address, NETWORKS[networkType]),
  )
}

export function isSupportedAddressType(addressType: string): boolean {
  return BITCOIN_SUPPORTED_ADDRESS_TYPES.map(at => at.toString()).includes(addressType)
}

export function getSupportedAddressTypes(): BitcoinishAddressType[] {
  return BITCOIN_SUPPORTED_ADDRESS_TYPES
}

// export function determinePathForIndex(
//   accountIndex: number,
//   addressType?: BitcoinishAddressType,
//   networkType?: NetworkType,
// ): ((
//   accountIndex: number,
//   addressType?: BitcoinishAddressType,
//   networkType?: NetworkType,
// ) => string) {
//   const constants = {
//     coinName: COIN_NAME,
//     defaultPurpose: DEFAULT_PURPOSE,
//     coinTypes: BITCOIN_COINTYPES,
//   }
//   const functions = {
//     isSupportedAddressType,
//   }

//   const determinePathForIndexFn = bitcoinish.createDeterminePathForIndexHelper(constants, functions)
//   // const derivationPath = determinePathForIndexFn(accountIndex, addressType, networkType)
//   return determinePathForIndexFn
// }


export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

// export function deriveUniPubKeyForPath(seed: Buffer, derivationPath: string, networkType: NetworkType): string {
//   const constants = {
//     networks: NETWORKS,
//     networkType: networkType,
//   }
//   const deriveUniPubKeyForPathFn = bitcoinish.createDeriveUniPubKeyForPathHelper(constants)

//   const uniPubKey: string = deriveUniPubKeyForPathFn(seed, derivationPath)
//   return uniPubKey
// }
