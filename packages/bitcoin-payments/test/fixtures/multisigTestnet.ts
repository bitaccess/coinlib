import { AddressType } from '../../src'
import singlesigFixtures from './singlesigTestnet'

export const DERIVATION_PATH = "m/44'/1'/0'"

// Corresponds to each private key in test/keys/testnet.multisig.key
export const ACCOUNT_IDS_0 = [
  '03f17de9004239bde1e3de1c0df4257a5980e0420c16ce331ec8b7af2bb1e6033e',
  'tpubDDhbeKTD26qn1rSKVJwskPYPfXADmF5ByxdXKiD9PZfZwcuopfTix637Y41VKoSKFzepSEo8N1bFMxmN1cDeZScVsRq9LwaeUuFHGLQB4qv',
  '0355c2914341e40247f2fb414d6780eda19d196cc3af982a953456929d5063c1ce',
  'tpubDDUT4ANr119kxYqHxZmhMibA7ZMvAmtWS9nu9YPKHuXkMWADUDhSZbDqbsShqbnRwNSy8DYChbFtoCwVF6JeH2gSqtEdV4VEz53vE5gh5mN',
]

export const ACCOUNT_IDS_ALL = [
  '03f17de9004239bde1e3de1c0df4257a5980e0420c16ce331ec8b7af2bb1e6033e',
  '035cf0b508c94bdb7383c5071bae59df95a934713dfe3bf72fe55c8da41ea2f01a',
  'tpubDDhbeKTD26qn1rSKVJwskPYPfXADmF5ByxdXKiD9PZfZwcuopfTix637Y41VKoSKFzepSEo8N1bFMxmN1cDeZScVsRq9LwaeUuFHGLQB4qv',
  '0355c2914341e40247f2fb414d6780eda19d196cc3af982a953456929d5063c1ce',
  '02592f454768a180299f1167e6a3a4c1dbe4f533089a9c7d4276f2ae521a53a27e',
  'tpubDDUT4ANr119kxYqHxZmhMibA7ZMvAmtWS9nu9YPKHuXkMWADUDhSZbDqbsShqbnRwNSy8DYChbFtoCwVF6JeH2gSqtEdV4VEz53vE5gh5mN',
]

export const ADDRESSES = {
  [AddressType.MultisigLegacy]: '2MyDfXtRKRkmBgSsbkJn6U5z8hAw3RfBcR1',
  [AddressType.MultisigSegwitP2SH]: '2NDLJLHWjxWyEm292WcapZW3ci6J2D4vwiw',
  [AddressType.MultisigSegwitNative]: 'tb1q7ynjlttcuk7ce2y8wpumaqtu7ptjmcdvzgvgyvwh6ta5prlunl0suul9gs',
}

export const M = 2

// Send all our test funds to another address we control
export const EXTERNAL_ADDRESS = singlesigFixtures[AddressType.SegwitNative].addresses[0]
