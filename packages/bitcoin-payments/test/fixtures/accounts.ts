import { AddressType } from '../../src'
import { ROOT_XPRV } from './bip44'

// Values calculated using https://iancoleman.io/bip39/

export type AccountFixture = {
  derivationPath: string,
  xprv: string,
  xpub: string,
  addresses: {
    [i: number]: string,
  }
}

export const legacyAccount: AccountFixture = {
  derivationPath: "m/44'/0'/0'",
  xprv: ROOT_XPRV,
  xpub:
    'xpub6Bv3pWx1p5ekyQg9m2CRmmtuboBqD6ctfjrZ3QwJFBK85DdsobqPNzFkhrGTU4eDmZ8abVqkFGRn8RHoQ5n56QVbopdjVUEaA4KeZyAyL7a',

  addresses: {
    '0': '1LvCqgodx1wxE6PRP7KC5THyCEXFkHU9bR',
    '1': '1Evpto7NHhqBAVZzhBjBBaMD59SAaozacB',
    '2': '1DbGmkAU9myqs8WkeSVYMN3z7AQWT6o5Fk',
    '5': '1Ewv2U5sgd1VVY8d2GLSB2EQNcZF9oXmVJ',
    '6': '1PfCviS5UfKKA1invvTytudHHJaamjG236',
    '10': '1vkpL6cCPm5g1yorLzpcQ9ZGEAgyvTKHq',
    '10000': '17mwffuzdAFmtPG72K7PD4t5V6dbVLQWoU',
    '20000': '1J5d68gBGsNS8bxMGBnjCHorYCYGXQnM65'
  },
}

export const p2shSegwitAccount: AccountFixture = {
  derivationPath: "m/49'/0'/0'",
  xprv: ROOT_XPRV,
  xpub:
    'xpub6CMAWVYBgih2Tn19acYpti82VKoKLGK59ttLHuxFvx662GSyZGm98e3TCQ7GZwkFBg2PYQr7Ygc5oXyS3wir46FB4zsFFYG14vVppGybEEx',

  addresses: {
    0: '3QqhPVcUqFtWpUV827N9LkwHRTokNWXEqC',
    1: '3B2ZyFXx1QUqNXZP1gB697qqypGRjFFpMa',
    2: '3DSTxbemBNU36MGuK6weqcTKLF3rEs2cUB',
    5: '3Q4d9JXs5YccojdA4XUrveMYNUu9Jd59hj',
    6: '39VMfcQWx451BLRsmqmAjrs4T6QtVf6WT8',
    10: '38Ugsu6wxyHiPKRWPCNW997WSmffjpanPu',
    10000: '34rtQTzDjWXbXr74khcFRx4kpYQkTE39ty',
    20000: '3A766zq5cpCq1yWCbZTjvFSC8FnXihhTVg',
  },
}

export const nativeSegwitAccount: AccountFixture = {
  derivationPath: "m/84'/0'/0'",
  xprv: ROOT_XPRV,
  xpub:
    'xpub6D5YXn7yRMg1GT12ghYDWDmgjT92cCZBYkmCqtkBFyGvJUPg1zTvHjR7untmdh5oPAU1Qve9D2XXULNdH4pfrcbRbWTLsBUPY2xTFse8uVx',

  addresses: {
    0: 'bc1q4qxngwree422qkse80xg6nw7egkqejju0lngsx',
    1: 'bc1qhnvdu7wjpwhpz2l252epghrkkjh22wzm8fktmq',
    2: 'bc1qr0fmsttpjgr9sjhrfxtsh78yktsejrgl353pwl',
    5: 'bc1q7w4u60g9pz7s3clcjzu4mwpfpqs4762c3fa5v8',
    6: 'bc1qa0482yu39n584rh6lkzfyzwmnhefmrmm5qz42h',
    10: 'bc1qp6snccy4lzkda93q05tg8jaeu78qqrp0efeu05',
    10000: 'bc1qnwkrgjvuhem4wqu8cn9yatxehzz5cuysuyf0fk',
    20000: 'bc1qwgfsk5ylcevy6g638gcmaxqf8hu8jpxql7x9zt',
  },
}

export const accountsByAddressType: { [type in AddressType]: AccountFixture } = {
  [AddressType.Legacy]: legacyAccount,
  [AddressType.SegwitP2SH]: p2shSegwitAccount,
  [AddressType.SegwitNative]: nativeSegwitAccount,
}
