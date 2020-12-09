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
    '20000': 'bitcoincash:qqnwqxpj3nq5s20x4alem4g6y540w78tksf46694ej'
  },
}
