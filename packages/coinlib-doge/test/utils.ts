import { UtxoInfo } from '@bitaccess/coinlib-common'
import { bitcoinish } from '@bitaccess/coinlib-bitcoin'
import { toBaseDenominationNumber } from '../src'

export * from '../../../common/testUtils'

export function makeUtxos(confirmedValues: string[], unconfirmedValues: string[] = []): UtxoInfo[] {
  return [
    ...confirmedValues.map((value, i) => ({
      txid: `utxo-confirmed-${i}`,
      vout: i,
      value: value,
      satoshis: toBaseDenominationNumber(value),
      confirmations: 10,
      height: '1234',
    })),
    ...unconfirmedValues.map((value, i) => ({
      txid: `utxo-unconfirmed-${i}`,
      vout: i,
      value: value,
      satoshis: toBaseDenominationNumber(value),
    }))
  ]
}

export function makeOutputs(address: string, ...values: string[]): bitcoinish.BitcoinishTxOutput[] {
  return values.map((value) => ({
    address,
    value: String(value),
  }))
}

export function sortUtxosByTxid(utxos: UtxoInfo[]): UtxoInfo[] {
  return [...utxos].sort((a, b) => a.txid.localeCompare(b.txid))
}

export function expectUtxosEqual(expectedUtxos: UtxoInfo[], actualUtxos: UtxoInfo[]) {
  expect(sortUtxosByTxid(expectedUtxos)).toEqual(sortUtxosByTxid(actualUtxos))
}
