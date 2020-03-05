import { PACKAGE_NAME } from '../src/constants'
import { UtxoInfo } from '@faast/payments-common'

export * from '../../../common/testUtils'
import { TestLogger } from '../../../common/testUtils'
import { BitcoinishTxOutput } from '../src/bitcoinish/types'
import { toBaseDenominationNumber } from '../src'
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
