import { PACKAGE_NAME } from '../src/constants'
import { UtxoInfo, BaseConfig } from '@bitaccess/coinlib-common'
import { TestLogger } from '../../../common/testUtils'
import { BitcoinishTxOutput } from '../src/bitcoinish/types'
import { BitcoinishPayments } from '../src/bitcoinish/BitcoinishPayments'
import { toBaseDenominationNumber } from '../src'
import { omit } from 'lodash'
import { toBigNumber } from '@faast/ts-common'


export * from '../../../common/testUtils'
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
  return [...utxos].sort((a, b) => a.txid.localeCompare(b.txid) || (b.vout - a.vout))
}

export function expectUtxosEqual(expectedUtxos: UtxoInfo[], actualUtxos: UtxoInfo[]) {
  expect(sortUtxosByTxid(expectedUtxos)).toEqual(sortUtxosByTxid(actualUtxos))
}

function stripBitcoinishTxInfoForEquality(txInfo: any) {
  return omit({
    ...txInfo,
    data: {
      ...txInfo.data,
      vout: txInfo.data.vout.map((o: any) => omit(o, ['spent'])),
    },
    outputUtxos: txInfo.outputUtxos?.map((o: any) => omit(o, ['confirmations'])),
  }, ['data.confirmations', 'confirmations', 'currentBlockNumber'])
}

export function assertBitcoinishTxInfoEquality(actual: any, expected: any): void {
  expect(stripBitcoinishTxInfoForEquality(actual)).toEqual(stripBitcoinishTxInfoForEquality(expected))
}


export async function getFromTo(
  payments: BitcoinishPayments<BaseConfig>,
  asset: string,
  index1: number, 
  index2: number,
  minBalance: number = 0.001,
){
  const [balanceResult1, balanceResult2] = await Promise.all([
    payments.getBalance(index1), 
    payments.getBalance(index2)
  ]);
  const balance1 = toBigNumber(balanceResult1.spendableBalance)
  const balance2 = toBigNumber(balanceResult2.spendableBalance)
  if (balance1.lt(minBalance) && balance2.lt(minBalance)) {
    throw new Error(
      `Cannot getFromTo for testing due to lack of funds. Send ${asset} to any of the following addresses and try again: ${
        payments.getAddress(index1)
      }:${balance1.toString()} ${payments.getAddress(index2)}:${balance2.toString()}`,
    )
  }

  const res = [
    {
      fromIndex: index1,
      fromBalance: balance1,
      toIndex: index2,
      toBalance: balance2,
    },
    {
      fromIndex: index2,
      fromBalance: balance2,
      toIndex: index1,
      toBalance: balance1,
    },
  ]

  if (balance1.lt(balance2)) {
    return res[1]
  } else {
    return res[0]
  }


}