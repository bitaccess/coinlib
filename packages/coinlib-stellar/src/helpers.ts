import { createUnitConverters, NetworkType } from '@bitaccess/coinlib-common'
import { isNil, isString } from '@faast/ts-common'
import * as Stellar from 'stellar-sdk'
import StellarHDWallet from 'stellar-hd-wallet'
import {Keypair} from "stellar-base";

import { DECIMAL_PLACES, STELLAR_COINTYPES, STELLAR_SUPPORTED_ADDRESS_TYPES } from './constants'

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

export function isValidAddress(address: unknown): boolean {
  return isString(address) && Stellar.StrKey.isValidEd25519PublicKey(address)
}

export function isValidExtraId(extraId: unknown): boolean {
  return isString(extraId)
}

export function isValidSecret(secret: unknown): boolean {
  return isString(secret) && Stellar.StrKey.isValidEd25519SecretSeed(secret)
}

export function assertValidAddress(address: string): void {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid stellar address: ${address}`)
  }
}

export function assertValidExtraId(extraId: string): void {
  if (!isValidExtraId(extraId)) {
    throw new Error(`Invalid stellar extraId: ${extraId}`)
  }
}

export function assertValidExtraIdOrNil(extraId?: string | undefined | null): void {
  if (!isNil(extraId) && !isValidExtraId(extraId)) {
    throw new Error(`Invalid stellar extraId: ${extraId}`)
  }
}

export function isSupportedAddressType(addressType: string): boolean {
  return STELLAR_SUPPORTED_ADDRESS_TYPES.map(at => at.toString()).includes(addressType)
}

export function getSupportedAddressTypes(): string[] {
  return STELLAR_SUPPORTED_ADDRESS_TYPES
}

export function determinePathForIndex(accountIndex: number, addressType?: any, networkType?: NetworkType): string {
  const purpose: string = '44'
  const cointype = STELLAR_COINTYPES[networkType ?? NetworkType.Mainnet]
  const derivationPath = `m/${purpose}'/${cointype}'/${accountIndex}'`
  return derivationPath
}

export function hexSeedToBuffer(seedHex: string): Buffer {
  const seedBuffer = Buffer.from(seedHex, 'hex')
  return seedBuffer
}

export function deriveKeyPairForAnyPath(wallet: StellarHDWallet, anyPath: string): Keypair {
  const key: Buffer = wallet.derive(anyPath)
  const keypair: Keypair =  Keypair.fromRawEd25519Seed(key)
  return keypair
}

export function removeTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '');
}

export function deriveUniPubKeyForPath(seed: Buffer, derivationPath: string): string {
  const wallet: StellarHDWallet = StellarHDWallet.fromSeed(seed)

  derivationPath = removeTrailingSlash(derivationPath)
  const hotAccountPath: string = `${derivationPath}/0'`
  const depositAccountPath: string = `${derivationPath}/1'`

  const hotAccountPubKey: string =  deriveKeyPairForAnyPath(wallet, hotAccountPath).publicKey()
  const depositAccountPubKey: string =  deriveKeyPairForAnyPath(wallet, depositAccountPath).publicKey()

  return `${hotAccountPubKey}:${depositAccountPubKey}`
}
