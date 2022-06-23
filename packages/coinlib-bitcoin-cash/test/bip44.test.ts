import { bip32 } from '@bitaccess/coinlib-common'

import {
  deriveAddress,
  derivePrivateKey,
  splitDerivationPath,
  deriveHDNode,
  deriveKeyPair,
  xprvToXpub,
  isValidXprv,
  isValidXpub,
} from '../src/bip44'
import { BitcoinCashAddressFormat } from '../src'
import {
  DERIVED_XPRV,
  DERIVATION_PATH,
  ROOT_XPRV,
  NETWORK,
  PARTIALLY_DERIVED_XPRV,
  ADDRESS_CASH,
  PRIVATE_KEY,
  DERIVED_XPUB,
  NETWORK_TYPE,
} from './fixtures'

export const BASE_NODE = bip32.fromBase58(DERIVED_XPRV)

describe('bip44', () => {
  describe('splitDerivationPath', () => {
    it('returns correct value', () => {
      expect(splitDerivationPath(DERIVATION_PATH)).toEqual(["44'", "145'", "0'"])
    })
  })
  describe('deriveHDNode', () => {
    it('derives root xprv correctly', () => {
      expect(deriveHDNode(ROOT_XPRV, DERIVATION_PATH, NETWORK).toBase58()).toEqual(DERIVED_XPRV)
    })
    it('derives partially derived xprv correctly', () => {
      expect(deriveHDNode(PARTIALLY_DERIVED_XPRV, DERIVATION_PATH, NETWORK).toBase58()).toEqual(DERIVED_XPRV)
    })
    it('derives fully derived xprv correctly', () => {
      expect(deriveHDNode(DERIVED_XPRV, DERIVATION_PATH, NETWORK).toBase58()).toEqual(DERIVED_XPRV)
    })
  })
  describe('deriveKeyPair', () => {
    it('derives index correctly', () => {
      expect(deriveKeyPair(BASE_NODE, 2)).toEqual(BASE_NODE.derive(0).derive(2))
    })
  })
  describe('deriveAddress', () => {
    it('derives legacy address', () => {
      expect(deriveAddress(BASE_NODE, 2, NETWORK_TYPE, BitcoinCashAddressFormat.Cash)).toBe(ADDRESS_CASH)
    })
  })
  describe('derivePrivateKey', () => {
    it('derives private key', () => {
      expect(derivePrivateKey(BASE_NODE, 2)).toBe(PRIVATE_KEY)
    })
  })
  describe('xprvToXpub', () => {
    it('returns correct xpub for root xprv', () => {
      expect(xprvToXpub(ROOT_XPRV, DERIVATION_PATH, NETWORK)).toEqual(DERIVED_XPUB)
    })
    it('returns correct xpub for partially derived xprv', () => {
      expect(xprvToXpub(PARTIALLY_DERIVED_XPRV, DERIVATION_PATH, NETWORK)).toEqual(DERIVED_XPUB)
    })
    it('returns correct xpub for fully derived xprv', () => {
      expect(xprvToXpub(DERIVED_XPRV, DERIVATION_PATH, NETWORK)).toEqual(DERIVED_XPUB)
    })
  })
  describe('isValidXpub', () => {
    it('should return true for valid', () => {
      expect(isValidXpub(DERIVED_XPUB, NETWORK)).toBe(true)
    })
    it('should return false for invalid', () => {
      expect(isValidXpub('xpat1234', NETWORK)).toBe(false)
    })
  })
  describe('isValidXprv', () => {
    it('should return true for valid', () => {
      expect(isValidXprv(DERIVED_XPRV, NETWORK)).toBe(true)
    })
    it('should return false for invalid', () => {
      expect(isValidXprv('xpat1234', NETWORK)).toBe(false)
    })
  })
})
