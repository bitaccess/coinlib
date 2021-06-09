import { PACKAGE_NAME } from '../src/constants'
import { UtxoInfo } from '@faast/payments-common'

export * from '../../../common/testUtils'
import { TestLogger } from '../../../common/testUtils'
import { BitcoinishTxOutput } from '../src/bitcoinish/types'
import { toBaseDenominationNumber } from '../src'
import { omit } from 'lodash'
export const logger = new TestLogger(PACKAGE_NAME)

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

export function makeOutputs(address: string, ...values: string[]): BitcoinishTxOutput[] {
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

function stripBitcoinishTxInfoForEquality(txInfo: any) {
  return omit({
    ...txInfo,
    data: {
      ...txInfo.data,
      vout: (txInfo.data as any).vout.map((o: any) => omit(o, ['spent'])),
    },
    outputUtxos: txInfo.outputUtxos?.map((o: any) => omit(o, ['confirmations'])),
  }, ['data.confirmations', 'confirmations', 'currentBlockNumber'])
}

export function assertBitcoinishTxInfoEquality(actual: any, expected: any): void {
  expect(stripBitcoinishTxInfoForEquality(actual)).toEqual(stripBitcoinishTxInfoForEquality(expected))
}
