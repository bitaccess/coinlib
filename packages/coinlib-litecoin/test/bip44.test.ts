import {
  deriveAddress,
  derivePrivateKey,
  splitDerivationPath,
  deriveHDNode,
  deriveKeyPair,
  xprvToXpub,
  isValidXprv,
  isValidXpub,
  convertXPrefixHdKeys
} from '../src/bip44'
import { AddressType, LitecoinAddressFormat, NETWORK_TESTNET } from '../src'
import { bip32 } from '@bitaccess/coinlib-common'
import {
  DERIVED_XPRV, DERIVATION_PATH, ROOT_XPRV, NETWORK, PARTIALLY_DERIVED_XPRV, ADDRESS_LEGACY,
  ADDRESS_SEGWIT_P2SH, ADDRESS_SEGWIT_NATIVE, PRIVATE_KEY, DERIVED_XPUB, NETWORK_TYPE
} from './fixtures'

export const BASE_NODE = bip32.fromBase58(DERIVED_XPRV, NETWORK)

const format = LitecoinAddressFormat.Modern

describe('bip44', () => {
  describe('splitDerivationPath', () => {
    it('returns correct value', () => {
      expect(splitDerivationPath(DERIVATION_PATH)).toEqual(["44'", "2'", "0'"])
    })
  })
  describe('deriveHDNode', () => {
    it('derives root xprv correctly', () => {
      expect(deriveHDNode(ROOT_XPRV, DERIVATION_PATH, NETWORK_TYPE).toBase58()).toEqual(DERIVED_XPRV)
    })
    it('derives partially derived xprv correctly', () => {
      expect(deriveHDNode(PARTIALLY_DERIVED_XPRV, DERIVATION_PATH, NETWORK_TYPE).toBase58()).toEqual(DERIVED_XPRV)
    })
    it('derives fully derived xprv correctly', () => {
      expect(deriveHDNode(DERIVED_XPRV, DERIVATION_PATH, NETWORK_TYPE).toBase58()).toEqual(DERIVED_XPRV)
    })
  })
  describe('deriveKeyPair', () => {
    it('derives index correctly', () => {
      expect(deriveKeyPair(BASE_NODE, 2)).toEqual(BASE_NODE.derive(0).derive(2))
    })
  })
  describe('deriveAddress', () => {
    it('derives legacy address', () => {
      expect(deriveAddress(BASE_NODE, 2, NETWORK_TYPE, AddressType.Legacy, format)).toBe(ADDRESS_LEGACY)
    })
    it('derives p2sh segwit address', () => {
      expect(deriveAddress(BASE_NODE, 2, NETWORK_TYPE, AddressType.SegwitP2SH, format)).toBe(ADDRESS_SEGWIT_P2SH)
    })
    it('derives native segwit address', () => {
      expect(deriveAddress(BASE_NODE, 2, NETWORK_TYPE, AddressType.SegwitNative, format)).toBe(ADDRESS_SEGWIT_NATIVE)
    })
  })
  describe('derivePrivateKey', () => {
    it('derives private key', () => {
      expect(derivePrivateKey(BASE_NODE, 2)).toBe(PRIVATE_KEY)
    })
  })
  describe('xprvToXpub', () => {
    it('returns correct xpub for root xprv', () => {
      expect(xprvToXpub(ROOT_XPRV, DERIVATION_PATH, NETWORK_TYPE)).toEqual(DERIVED_XPUB)
    })
    it('returns correct xpub for partially derived xprv', () => {
      expect(xprvToXpub(PARTIALLY_DERIVED_XPRV, DERIVATION_PATH, NETWORK_TYPE)).toEqual(DERIVED_XPUB)
    })
    it('returns correct xpub for fully derived xprv', () => {
      expect(xprvToXpub(DERIVED_XPRV, DERIVATION_PATH, NETWORK_TYPE)).toEqual(DERIVED_XPUB)
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
  describe('convertXPrefixHdKeys', () => {
    it('should convert xprv to tprv', () => {
      const converted = convertXPrefixHdKeys(
        'xprv9s21ZrQH143K4A6W8rtYYfpLg55uou88DM343N43V9fEG1miFbLT7dBKzdTi4G88HvHCB3gJLC3c6m7qW28vbL5TvZQSHCJmuBMaPBGZi1U',
        NETWORK_TESTNET,
      )
      expect(converted).toEqual(
        'tprv8ZgxMBicQKsPeyL2oRk3iKSKzCW83RA8YtxAunUVy89i3cWoExgCdNYmuodN4dWSfMoyB9J4VYdQZcfadEUsQPM4TCcjwZ2ppH6zpo3Md6X'
      )
    })
    it('should convert xpub to tpub', () => {
      const converted = convertXPrefixHdKeys(
        'xpub6Bvk7TZL7RXk6vMPS3aTszwr57mYGEnWwS1gnoNiE3R7CxvRV6Nq9NChJwoztJG3rwNfyi1G368cfbgjpHyTYQWHqJSMZH4Nb7x7b92oeUF',
        NETWORK_TESTNET,
      )
      expect(converted).toEqual(
        'tpubDCJNdhP1phVCNiYEtEZZ5vHDQEsCFdHaV4bz9MRrZxAzxFb8ZKDvHosXYytnQoDHequabHX8aBxfMnBMD9phRqxatuBfEoicB5YXMCnjYZj'
      )
    })
  })
})
