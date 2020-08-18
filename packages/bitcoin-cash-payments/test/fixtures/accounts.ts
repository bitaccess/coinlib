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

export const legacyFixedAccount: AccountFixture = {
  derivationPath: "m/44'/145'/0'",
  xprv: ROOT_XPRV,
  sweepTxSize: 192,
  xpub:
    'xpub6DQ4sJfAghtQd7KvxFcuiRvPyKMZmF5HDmYfXj3EM234E38p11SteUZCsiAzhQJ8BQzyPC93yRdkmD42MnCHSW5oUWZeHaMiJPCrApczkwD',
  addresses: {
    '0': 'bitcoincash:qqpqf3ppzd4z34ctslhajzzt7hxxvjl8dcfzkrzmxj',
    '1': 'bitcoincash:qp68g6a6y5dskfaw4anq4l32s04xuqet05vrzepqp8',
    '2': 'bitcoincash:qq60dskvul43sl4xgp202ccwkzc8ytk6wgl5wzlhk2',
    '5': 'bitcoincash:qqudvlkhyht6y0awt4khu0spzjf2ncsl9u6a6j5lwa',
    '6': 'bitcoincash:qqgnmu5vzcs0lfk9gy8hqsgu9q60fg58ggq20sjr5q',
    '10': 'bitcoincash:qqyluc0lcqxaj08qlk8rm4a922rud3jdyq2xwsztpl',
    '10000': 'bitcoincash:qrpknlaxgv38ns0zpzar0jc49s7uqlydjqm7mfazsd',
    '20000': 'bitcoincash:qp36ea6s4jme2rztam96cc2fzrzaxmjt7czgq4ztcv'
  },
}

export const accountsByAddressType: { [type in SinglesigAddressType]: AccountFixture } = {
  [AddressType.Legacy]: legacyAccount,
}
