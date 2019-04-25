import { assertType } from '@faast/ts-common'
import {
  BalanceResult,
  TransactionStatus,
  TransactionStatusT,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  BaseTransactionInfo,
} from '#/types'

describe('types', () => {
  test('BalanceResult validates successfully', () => {
    assertType(BalanceResult, {
      balance: '0',
      unconfirmedBalance: '0',
    })
  })
  test('BalanceResult throws on invalid', () => {
    expect(() => assertType(BalanceResult, {})).toThrow()
  })
  test('TransactionStatusT validates successfully', () => {
    for (let k in TransactionStatus) {
      assertType(TransactionStatusT, TransactionStatus[k])
    }
  })
  test('TransactionStatusT throws on invalid', () => {
    expect(() => assertType(TransactionStatusT, 'invalid test status')).toThrow()
  })
  test('BaseUnsignedTransaction validates successfully', () => {
    assertType(BaseUnsignedTransaction, {
      id: null,
      fromAddress: 'address',
      toAddress: 'address',
      toExtraId: null,
      fromIndex: 0,
      toIndex: null,
      amount: null,
      fee: null,
      targetFeeLevel: 'high',
      targetFeeRate: null,
      targetFeeRateType: null,
      status: 'unsigned',
      data: {},
    })
  })
  test('BaseUnsignedTransaction throws on invalid', () => {
    expect(() => assertType(BaseUnsignedTransaction, {})).toThrow()
  })
  test('BaseSignedTransaction validates successfully', () => {
    assertType(BaseSignedTransaction, {
      id: 'id',
      fromAddress: 'address',
      toAddress: 'address',
      toExtraId: null,
      fromIndex: 0,
      toIndex: null,
      amount: '0.1234',
      fee: '0.1234',
      targetFeeLevel: 'high',
      targetFeeRate: '0.1234',
      targetFeeRateType: 'main',
      status: 'signed',
      data: {},
    })
  })
  test('BaseSignedTransaction throws on invalid', () => {
    expect(() => assertType(BaseSignedTransaction, {})).toThrow()
  })
  test('BaseTransactionInfo validates successfully', () => {
    assertType(BaseTransactionInfo, {
      id: 'id',
      fromAddress: 'address',
      toAddress: 'address',
      toExtraId: null,
      fromIndex: 0,
      toIndex: 1,
      amount: '0.1234',
      fee: '0.1234',
      status: 'unsigned',
      isExecuted: false,
      isConfirmed: false,
      confirmations: 0,
      block: 0,
      date: new Date(),
      data: {},
    })
  })
  test('BaseTransactionInfo throws on invalid', () => {
    expect(() => assertType(BaseTransactionInfo, {})).toThrow()
  })
  test('BaseBroadcastResult validates successfully', () => {
    assertType(BaseBroadcastResult, {
      id: '',
    })
  })
  test('BaseBroadcastResult throws on invalid', () => {
    expect(() => assertType(BaseBroadcastResult, {})).toThrow()
  })
})
