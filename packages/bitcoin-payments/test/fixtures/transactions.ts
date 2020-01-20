/* tslint:disable: max-line-length variable-name */
import { BitcoinTransactionInfo, BitcoinSignedTransaction } from '../../src'
import { FeeLevel, FeeRateType, TransactionStatus } from '@faast/payments-common'

export const txInfo_e10d7: BitcoinTransactionInfo = {
  id: 'e10d793afdfc7145ba1acd8990df6214057bd12c8cb13797860d5d1443628c04',
  toAddress: '1ARdvxWWxai7B3dbNmURMVJWwKADcXTN6w',
  toExtraId: null,
  toIndex: null,
  fromAddress: '3Kr7HPfaNkjTzoS6pv33wUPAuQwSxpcWMc',
  fromExtraId: null,
  fromIndex: null,
  amount: '0.26407945',
  fee: '0.000168',
  sequenceNumber: null,
  isExecuted: true,
  isConfirmed: true,
  confirmations: 1234,
  confirmationId: '0000000000000000000452c23d6bdc070b3ad53ef2ae3f95b416b37efb1e575c',
  confirmationNumber: '613151',
  confirmationTimestamp: new Date('2020-01-16T20:34:36.000Z'),
  status: TransactionStatus.Confirmed,
  data: {
    'blockHash': '0000000000000000000452c23d6bdc070b3ad53ef2ae3f95b416b37efb1e575c',
    'blockHeight': 613151,
    'blockTime': 1579206876,
    'confirmations': 489,
    'fees': '16800',
    'hex': '010000000001015ccd738e047e3d171fc316d6b25cfaf55f4df951914c31a6555be1f427dff210010000001716001494d5b8499442f20ff0f8536efad062738fcb1f05ffffff000209f49201000000001976a9146761f1680bc1d452248190ad1cf57fe6b8eeb33c88acc941e2090000000017a914571482e76757ffb862c43873bb80709ed62a5bb2870247304402202e61aa7525effda62f227f8ca93bae7b24e9d234208e3a0fed585d5b42b5a390022070aee8bfabb6b9899efdee10d10bcfa9cc4ba1941ba0e215614137fe688cff6501210290b34cdb4a8d938de06bffb7dd72dd7c56e02111e47f0a31a045646cf9c1584800000000',
    'txid': 'e10d793afdfc7145ba1acd8990df6214057bd12c8cb13797860d5d1443628c04',
    'value': '192230866',
    'valueIn': '192247666',
    'version': 1,
    'vin': [
      {
        'addresses': [
          '3Kr7HPfaNkjTzoS6pv33wUPAuQwSxpcWMc',
        ],
        'hex': '16001494d5b8499442f20ff0f8536efad062738fcb1f05',
        'n': 0,
        'sequence': 16777215,
        'txid': '10f2df27f4e15b55a6314c9151f94d5ff5fa5cb2d616c31f173d7e048e73cd5c',
        'value': '192247666',
        'vout': 1,
      },
    ],
    'vout': [
      {
        'addresses': [
          '1ARdvxWWxai7B3dbNmURMVJWwKADcXTN6w',
        ],
        'hex': '76a9146761f1680bc1d452248190ad1cf57fe6b8eeb33c88ac',
        'n': 0,
        'spent': true,
        'value': '26407945',
      },
      {
        'addresses': [
          '39dTHPMBhNuGHSbFC8b4vXbX1CiWLdCitV',
        ],
        'hex': 'a914571482e76757ffb862c43873bb80709ed62a5bb287',
        'n': 1,
        'spent': true,
        'value': '165822921',
      },
    ],
  }
}

export const signedTx_valid: BitcoinSignedTransaction = {
  id: 'c7376e46f869a9cadfca43ca20bfdc3c1bfe856908a6a57de147fb881189c3a7',
  fromAddress: 'TWkTMxK5GZvnvQ3WjNQ6oNV5bNGHd13zov',
  toAddress: 'TSKW3gHsWKnF62zs2XsMxFkXZ2fLY74CnA',
  toExtraId: null,
  fromIndex: 6,
  toIndex: 5,
  amount: '74.262026',
  fee: '0',
  targetFeeLevel: FeeLevel.Medium,
  targetFeeRate: '0',
  targetFeeRateType: FeeRateType.BasePerWeight,
  sequenceNumber: null,
  status: TransactionStatus.Signed,
  data: {
    hex: '',
  },
}

export const signedTx_invalid: BitcoinSignedTransaction = {
  id: '1234567890',
  fromAddress: '1234567890',
  toAddress: '1234567890',
  toExtraId: null,
  fromIndex: 0,
  toIndex: 5,
  amount: '1234567890',
  fee: '1234567890',
  targetFeeLevel: FeeLevel.Medium,
  targetFeeRate: '0',
  targetFeeRateType: FeeRateType.BasePerWeight,
  sequenceNumber: null,
  status: TransactionStatus.Signed,
  data: {} as any,
}
