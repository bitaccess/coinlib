import { assertType } from '#/utils'
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
      from: 'address',
      to: 'address',
      toExtraId: null,
      fromIndex: 0,
      toIndex: null,
      amount: null,
      fee: null,
      status: 'unsigned',
      rawUnsigned: {},
    })
  })
  test('BaseUnsignedTransaction throws on invalid', () => {
    expect(() => assertType(BaseUnsignedTransaction, {})).toThrow()
  })
  test('BaseSignedTransaction validates successfully', () => {
    assertType(BaseSignedTransaction, {
      id: 'id',
      from: 'address',
      to: 'address',
      toExtraId: null,
      fromIndex: 0,
      toIndex: null,
      amount: '0.1234',
      fee: '0.1234',
      status: 'signed',
      rawUnsigned: {},
      rawSigned: {},
    })
  })
  test('BaseSignedTransaction throws on invalid', () => {
    expect(() => assertType(BaseSignedTransaction, {})).toThrow()
  })
  test('BaseTransactionInfo validates successfully', () => {
    assertType(BaseTransactionInfo, {
      id: 'id',
      from: 'address',
      to: 'address',
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
      rawInfo: {},
    })
  })
  test('BaseTransactionInfo throws on invalid', () => {
    expect(() => assertType(BaseTransactionInfo, {})).toThrow()
  })
  test('BaseBroadcastResult validates successfully', () => {
    assertType(BaseBroadcastResult, {
      id: ''
    })
  })
  test('BaseBroadcastResult throws on invalid', () => {
    expect(() => assertType(BaseBroadcastResult, {})).toThrow()
  })
})
