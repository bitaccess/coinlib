import { ROOT_XPRV } from './bip44'

// Values calculated using https://iancoleman.io/bip39/

export type AccountFixture = {
  derivationPath: string
  xprv: string
  xpub: string
  sweepTxSize: number
  addresses: {
    [i: number]: string
  }
  firstAccountBalanceStatus: {
    confirmedBalance: string
    spendableBalance: string
    unconfirmedBalance: string
  }
}

export const hdAccount: AccountFixture = {
  derivationPath: "m/44'/145'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 192,
  xpub:
    'xpub6DPwXAhSxJbqowWSvozSDrQmHYLAZucdAnxmdGV2YdHHfaS9Kj4ZCET6eMGBwhFX2hYwqcHBeYdjsNiQ4o9KULqbX8mjnNbmC31LesCBF9R',
  addresses: {
    '0': 'bitcoincash:qqyqaklgadws70sc3wa6rrrk2wlpt6tnjuvyll86mu',
    '1': 'bitcoincash:qz9w06u8702epgxr7gs278g5pc0z5md0cgx2jxs5aq',
    '2': 'bitcoincash:qr5avn7f6qs3m4497mf3zag5fkcuzke9qcl944t87w',
    '5': 'bitcoincash:qpryvhmlqskajs4jzc77ja5gwfnxkpqf25acz3lz50',
    '6': 'bitcoincash:qqm6lpfufywc42ufzhuxs4j5qy0dmcdmfu5r4567tw',
    '10': 'bitcoincash:qps6errksj3an0hfzw09a6mdmtzw974klcs2cnghhm',
    '10000': 'bitcoincash:qrx8fv76tp2x0c7fyh9whfxrwlp6ywvwesfkz3lvud',
    '20000': 'bitcoincash:qqnwqxpj3nq5s20x4alem4g6y540w78tksf46694ej',
  },
  firstAccountBalanceStatus: {
    confirmedBalance: '0.03',
    spendableBalance: '0.03',
    unconfirmedBalance: '0',
  },
}

export type SeedAccountFixture = {
  seed: string
  derivationPath: string
  xprv: string
  xpub: string
  sweepTxSize: number
  addresses: {
    [i: number]: string
  }
  firstAccountBalanceStatus: {
    confirmedBalance: string
    spendableBalance: string
    unconfirmedBalance: string
  }
}

export const seedAccount: SeedAccountFixture = {
  seed:
    '716bbb2c373406156d6fc471db0c62d957e27d97f1d07bfb0b2d22f04d07b75b32f2542e20f077251d7bc390cac8847ac6e64d94bccff1e1b2cd82802df35a78',
  derivationPath: "m/44'/145'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 192,
  xpub:
    'tpubDD4w2LgE99HcuMudjms7Xx4M2MK9WTAbYimA2fQeCvS89YGAafjnA42uFRcQzwUs12NSCA5g9Ua8whvk89XShpioticPh5XizZNwArdqgju',
  addresses: {
    '0': 'bchtest:qr6evq0knxrxgjvc7jdyzs4995d927ntqsy0uv4ghu',
    '1': 'bchtest:qz07p7hpxfq6f97689qtrnl2ju0qcu8kpch3n2tn5c',
    '2': 'bchtest:qz6chln3hzt8egl2jpjg75n4md4ake7kcul3xmj00d',
    '5': 'bchtest:qp36lwskrh2r6a4ef8xze25ar750mzrpquuj9zm79q',
    '6': 'bchtest:qq772u72kf6nfa2dly2xmagc6aszyyztg5zz502wyk',
    '10': 'bchtest:qqehyneetgwqss0xevvuy3jzvm2zcgnmmqdev4ttq5',
    '10000': 'bchtest:qrlkxjs9s35ezpugvy4g8qt0c2qnrgskdg8dgmg7zr',
    '20000': 'bchtest:qqwnf76cxasl45wfmaum5wasta4hvd7amg2t4ejn9g',
  },
  firstAccountBalanceStatus: {
    confirmedBalance: '0.101',
    spendableBalance: '0.101',
    unconfirmedBalance: '0',
  },
}

export const seedAccountsXPrv = 'xprv9s21ZrQH143K2ryvmJczPHVGKHKGMCTuNoWsELSctVhm3RwVAPgkWAf5KEXfqXFEPXxtGTznaRtSEWppan4Vhm6GB1uABBXReGxESgXKz7e'