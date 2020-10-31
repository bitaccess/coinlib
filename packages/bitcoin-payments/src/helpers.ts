import { createUnitConverters } from '@faast/payments-common'
import * as bitcoin from 'bitcoinjs-lib'
import * as bip32 from 'bip32'
import { isString } from '@faast/ts-common'

import { AddressType, BitcoinjsKeyPair, MultisigAddressType, SinglesigAddressType } from './types'
import { BitcoinjsNetwork } from './bitcoinish/types'
import { DECIMAL_PLACES } from './constants'

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

export function isValidAddress(address: string, network: BitcoinjsNetwork): boolean {
  try {
    bitcoin.address.toOutputScript(address, network)
    return true
  } catch (e) {
    return false
  }
}

export function isValidPublicKey(publicKey: string | Buffer, network: BitcoinjsNetwork): boolean {
  try {
    bitcoin.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network })
    return true
  } catch (e) {
    return false
  }
}

export function isValidExtraId(extraId: string): boolean {
  return false
}

export function publicKeyToBuffer(publicKey: string | Buffer): Buffer {
  return isString(publicKey) ? Buffer.from(publicKey, 'hex') : publicKey
}

export function publicKeyToString(publicKey: string | Buffer): string {
  return isString(publicKey) ? publicKey : publicKey.toString('hex')
}

export function getMultisigPaymentScript(
  network: BitcoinjsNetwork,
  addressType: MultisigAddressType,
  pubkeys: Buffer[],
  m: number,
  unsortedPubKeys?: boolean,
): bitcoin.payments.Payment {
  const scriptParams = {
    network,
    redeem: bitcoin.payments.p2ms({
      pubkeys: unsortedPubKeys ? pubkeys : [...pubkeys].sort(),
      m,
      network,
    })
  }
  switch(addressType) {
    case AddressType.MultisigLegacy:
      return bitcoin.payments.p2sh(scriptParams)
    case AddressType.MultisigSegwitNative:
      return bitcoin.payments.p2wsh(scriptParams)
    case AddressType.MultisigSegwitP2SH:
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wsh(scriptParams),
        network,
      })
  }
}

export function getSinglesigPaymentScript(
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
  pubkey: Buffer,
): bitcoin.payments.Payment {
  const scriptParams = { network, pubkey }
  switch(addressType) {
    case AddressType.Legacy:
      return bitcoin.payments.p2pkh(scriptParams)
    case AddressType.SegwitNative:
      return bitcoin.payments.p2wpkh(scriptParams)
    case AddressType.SegwitP2SH:
      return bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh(scriptParams),
        network,
      })
  }
}

export function publicKeyToAddress(
  publicKey: string | Buffer,
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
): string {
  const pubkey = publicKeyToBuffer(publicKey)
  const script = getSinglesigPaymentScript(network, addressType, pubkey)
  const { address } = script
  if (!address) {
    throw new Error('bitcoinjs-lib address derivation returned falsy value')
  }
  return address
}

export function publicKeyToKeyPair(
  publicKey: string | Buffer,
  network: BitcoinjsNetwork,
  uncompressed?: boolean,
): BitcoinjsKeyPair {
  return bitcoin.ECPair.fromPublicKey(publicKeyToBuffer(publicKey), { network, compressed: !uncompressed })
}

export function privateKeyToKeyPair(
  privateKey: string, network: BitcoinjsNetwork, uncompressed?: boolean,
): BitcoinjsKeyPair {
  return bitcoin.ECPair.fromPrivateKey(
    bitcoin.ECPair.fromWIF(privateKey, network).privateKey!,
    { network, compressed: !uncompressed },
  )
}

export function privateKeyToAddress(
  privateKey: string,
  network: BitcoinjsNetwork,
  addressType: SinglesigAddressType,
  uncompressed?: boolean,
) {
  const keyPair = privateKeyToKeyPair(privateKey, network, uncompressed)
  return publicKeyToAddress(keyPair.publicKey, network, addressType)
}

export function isValidPrivateKey(privateKey: string, network: BitcoinjsNetwork): boolean {
  try {
    privateKeyToKeyPair(privateKey, network)
    return true
  } catch (e) {
    return false
  }
}
