import { AddressType, SinglesigAddressType } from '../../src'
import { ROOT_XPRV } from './bip44'

// Values calculated using https://iancoleman.io/bip39/

export type AccountFixture = {
  derivationPath: string,
  xprv: string,
  xpub: string,
  sweepTxSize: number,
  addresses: {
    [i: number]: string,
  }
}

export const legacyAccount: AccountFixture = {
  derivationPath: "m/44'/2'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 192,
  xpub:
    'xpub6BvtsVTfEJWNuwLGduLMBYK9oBBpYmteSoayxvXMMjNMqWsbhX4xNJeTL83BLoLNZoqAdJhr86JHqEJA16ZSBfQG9cEkx3d1MyHrZSSV8X3',
  addresses: {
    0: 'Ld1eoAGyDHSr5qp7vPhVYY52M3aGxJQY6N',
    1: 'LLVr1ccv9HSvHuWoZ37cFnZPijKS6s6kwe',
    2: 'LPHRhQyZ4pfUzbT4L7NmAHU51B66QfsPQm',
    5: 'LMgUa9dFEVDkxhuZVqUeA61qJhsi9r8b1d	',
    6: 'LWrc4hWqZuQrgAWBRf7QEyx2iSQBV9vRvn',
    10: 'LKTpBfsFfph85Ri1Va7MoP3SBHT8n6KXEW',
    10000: 'LLudzbXqs5qYvAA4W53Cv9AbSJG1J5NCsJ',
    20000: 'LQi4pdfoL72Cc8RnMuvyGREkH1f4YBwZ6Y'
  },
}

export const p2shSegwitAccount: AccountFixture = {
  derivationPath: "m/49'/2'/0'",
  sweepTxSize: 133,
  xprv: ROOT_XPRV,
  xpub:
    'xpub6Cn2FkCfvpJ4FTLGNyWwDTWhhgEpyF3fh3MXcH5uqrtSuHDKJHbkoJ5cCLD2uHQrHpCj7oL3eevz2hQoWuBMk3PvSXop7cimc6RbG8aKiCE',
  addresses: {
    0: 'MQRmKLBCR6Lx3cAwQLpFQ7TWk9emXqfc8e',
    1: 'MSWhMKMZrh3bAjCtSu3ic2nvzyE7CBQu8a',
    2: 'MSdUteBz8jBva5WK9rhXytoCkstyvWRQDF',
    5: 'MHdTWgK4ue4oXv8CtqyqBttdEoSNgonn88',
    6: 'MEpNheNmeRYBEx4Uz9CRaAquU9TQvy8peR',
    10: 'MAXezntDQYiBJPkdpWB6J9HLshnmJTvJ61',
    10000: 'MP95FunXmkKtpNF9KR6pmHLUBUzkwh8xhw',
    20000: 'MKg3ksyJvGMnUgVCKudUwd631iPRuCB5Vh',
  },
}

export const nativeSegwitAccount: AccountFixture = {
  derivationPath: "m/84'/2'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 109,
  xpub:
    'xpub6BrXLvkCQFCuJVqbEyhdduV1E2yoEch3WDcioqExPPQwt6v6CWAvj5RkyRPx6cQr9ABoT21J3bJzZnJuKZwpzS2qSvieggedQ3f7JcjwKPx',
  addresses: {
    0: 'ltc1qcv0tz0xkwn7kxztk0n5kjzk3ww7jjmfax6xeez',
    1: 'ltc1qphueqqvv7l79v5u3gjfvyyqx50gxhh3hhg3x6h',
    2: 'ltc1q9jy2da00sx99t7euhg5f3r3ju875elyafuvkhe',
    5: 'ltc1qrt69uy0ukl4g3wl6t0cut2x50r29l46t37qkdm',
    6: 'ltc1q07t7n5yu25nm924n7dkn0jvzq7wqpd980fqwrq',
    10: 'ltc1qq203glxhjphqy2vqycnnssrpppu6tjttmulahj',
    10000: 'ltc1qzfuc8zuc6ggzh6x5w3ym5ssvjajk3847e6svsc',
    20000: 'ltc1q8s5uqstg5az5meszvz45lyzrrs9nsau2jyjgnh',
  },
}

export const accountsByAddressType: { [type in SinglesigAddressType]: AccountFixture } = {
  [AddressType.Legacy]: legacyAccount,
  [AddressType.SegwitP2SH]: p2shSegwitAccount,
  [AddressType.SegwitNative]: nativeSegwitAccount,
}
