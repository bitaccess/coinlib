import { assertType } from '@faast/ts-common'
import {
  BalanceResult,
  TransactionStatus,
  TransactionStatusT,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  BaseTransactionInfo,
  BaseConfig,
  NetworkType,
} from '../src'

describe('types', () => {
  test('BaseConfig validates successfully', () => {
    assertType(BaseConfig, {
      network: NetworkType.Mainnet,
    })
  })
  test('BaseConfig throws on invalid', () => {
    expect(() => assertType(BaseConfig, '')).toThrow()
  })
  test('BalanceResult validates successfully', () => {
    assertType(BalanceResult, {
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      spendableBalance: '0',
      sweepable: false,
      requiresActivation: false,
    })
  })
  test('BalanceResult throws on invalid', () => {
    expect(() => assertType(BalanceResult, {})).toThrow()
  })
  test('TransactionStatusT validates successfully', () => {
    for (let status of Object.values(TransactionStatus)) {
      assertType(TransactionStatusT, status)
    }
  })
  test('TransactionStatusT throws on invalid', () => {
    expect(() => assertType(TransactionStatusT, 'invalid test status')).toThrow()
  })
  test('BaseUnsignedTransaction validates successfully', () => {
    assertType(BaseUnsignedTransaction, {
      status: 'unsigned',
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
      sequenceNumber: null,
      data: {},
    })
  })
  test('BaseUnsignedTransaction throws on invalid', () => {
    expect(() => assertType(BaseUnsignedTransaction, {})).toThrow()
  })
  test('BaseSignedTransaction validates successfully', () => {
    assertType(BaseSignedTransaction, {
      status: 'signed',
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
      sequenceNumber: null,
      data: {},
    })
  })
  test('BaseSignedTransaction throws on invalid', () => {
    expect(() => assertType(BaseSignedTransaction, {})).toThrow()
  })
  describe('BaseTransactionInfo', () => {
    test('validates successfully', () => {
      assertType(BaseTransactionInfo, {
        status: 'unsigned',
        id: 'id',
        fromAddress: 'address',
        toAddress: 'address',
        toExtraId: null,
        fromIndex: 0,
        toIndex: 1,
        amount: '0.1234',
        fee: '0.1234',
        sequenceNumber: null,
        isExecuted: false,
        isConfirmed: false,
        confirmations: 0,
        confirmationId: '0',
        confirmationTimestamp: new Date(),
        data: {},
      })
    })
    test('validates with confirmationNumber of type number successfully', () => {
      assertType(BaseTransactionInfo, {
        status: 'unsigned',
        id: 'id',
        fromAddress: 'address',
        toAddress: 'address',
        toExtraId: null,
        fromIndex: 0,
        toIndex: 1,
        amount: '0.1234',
        fee: '0.1234',
        sequenceNumber: null,
        isExecuted: false,
        isConfirmed: false,
        confirmations: 0,
        confirmationId: '0',
        confirmationTimestamp: new Date(),
        data: {},
        confirmationNumber: 0
      })
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
