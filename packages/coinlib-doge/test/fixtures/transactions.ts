/* tslint:disable: max-line-length variable-name */
import { DogeTransactionInfo, DogeSignedTransaction } from '../../src'
import { FeeLevel, FeeRateType, TransactionStatus } from '@bitaccess/coinlib-common'

export const txInfo_example: DogeTransactionInfo = {
  'status': TransactionStatus.Confirmed,
  'id': 'dc8ae0ebe273faf3e6e2f1192279df91fa6b8621e3daba08dc89ef9cb0539193',
  'fromIndex': null,
  'fromAddress': 'DAK9Qiat3AvZ7rPC5BhWyW2iFgDnMQ2fHB',
  'fromExtraId': null,
  'toIndex': null,
  'toAddress': 'batch',
  'toExtraId': null,
  'amount': '58575.13509193',
  'fee': '3',
  'sequenceNumber': null,
  'weight': 225,
  'confirmationId': 'f04c4dc35d2f33756e9e913bece108dfa5ab5d5e6a97f1e7bd1eefbc3c3f9171',
  'confirmationNumber': '3368748',
  'confirmationTimestamp': new Date('2020-08-24T11:30:57.000Z'),
  'isExecuted': true,
  'isConfirmed': true,
  'confirmations': 4,
  'data': {
    'txid': 'dc8ae0ebe273faf3e6e2f1192279df91fa6b8621e3daba08dc89ef9cb0539193',
    'version': 1,
    'vin': [
      {
        'txid': '39aca8a23471c07670984690d9a1d6244aa3a4da1a77404afd1cca1ff185728f',
        'vout': 1,
        'sequence': 4294967295,
        'n': 0,
        'addresses': [
          'DAK9Qiat3AvZ7rPC5BhWyW2iFgDnMQ2fHB'
        ],
        'isAddress': true,
        'value': '5857813509193',
        'hex': '47304402204860ae17691d3ed96879fa900ea25e7c96fff8f27e8eb21dc5766b696856c72d02203002a1195729128c3632c47ca09b6bbb2a91e11e9d2ae1a7190a403dcd2ad62401210296621610fd3183c7b9f3835384bdb8f0633fa786092f2c4374752e4722a784db'
      }
    ],
    'vout': [
      {
        'value': '462542944913',
        'n': 0,
        'hex': '76a91427bd4c230c46bce00c3dad4279643f18710d797d88ac',
        'addresses': [
          'D8mDfMWavhe4BwJYhsRBy8VbNUWQkaHdhg'
        ],
        'isAddress': true
      },
      {
        'value': '5394970564280',
        'n': 1,
        'hex': '76a914c7cc3691a66171dc4d177f4ae332f2e010671ccb88ac',
        'addresses': [
          'DPMXeQqXrC5ThpT1cG5b7661NAY9MKjYmG'
        ],
        'isAddress': true
      }
    ],
    'blockHash': 'f04c4dc35d2f33756e9e913bece108dfa5ab5d5e6a97f1e7bd1eefbc3c3f9171',
    'blockHeight': 3368748,
    'confirmations': 4,
    'blockTime': 1598268657,
    'value': '5857513509193',
    'valueIn': '5857813509193',
    'fees': '300000000',
    'hex': '01000000018f7285f11fca1cfd4a40771adaa4a34a24d6a1d99046987076c07134a2a8ac39010000006a47304402204860ae17691d3ed96879fa900ea25e7c96fff8f27e8eb21dc5766b696856c72d02203002a1195729128c3632c47ca09b6bbb2a91e11e9d2ae1a7190a403dcd2ad62401210296621610fd3183c7b9f3835384bdb8f0633fa786092f2c4374752e4722a784dbffffffff02913ab5b16b0000001976a91427bd4c230c46bce00c3dad4279643f18710d797d88acb8d64d1de80400001976a914c7cc3691a66171dc4d177f4ae332f2e010671ccb88ac00000000'
  },
  'inputUtxos': [
    {
      'txid': '39aca8a23471c07670984690d9a1d6244aa3a4da1a77404afd1cca1ff185728f',
      'vout': 1,
      'value': '58578.13509193'
    }
  ],
  'outputUtxos': [
    {
      'address': 'D8mDfMWavhe4BwJYhsRBy8VbNUWQkaHdhg',
      'coinbase': false,
      'height': '3368748',
      'lockTime': undefined,
      'satoshis': 462542944913,
      'scriptPubKeyHex': '76a91427bd4c230c46bce00c3dad4279643f18710d797d88ac',
      'spent': true,
      'txHex': '01000000018f7285f11fca1cfd4a40771adaa4a34a24d6a1d99046987076c07134a2a8ac39010000006a47304402204860ae17691d3ed96879fa900ea25e7c96fff8f27e8eb21dc5766b696856c72d02203002a1195729128c3632c47ca09b6bbb2a91e11e9d2ae1a7190a403dcd2ad62401210296621610fd3183c7b9f3835384bdb8f0633fa786092f2c4374752e4722a784dbffffffff02913ab5b16b0000001976a91427bd4c230c46bce00c3dad4279643f18710d797d88acb8d64d1de80400001976a914c7cc3691a66171dc4d177f4ae332f2e010671ccb88ac00000000',
      'txid': 'dc8ae0ebe273faf3e6e2f1192279df91fa6b8621e3daba08dc89ef9cb0539193',
      'value': '4625.42944913',
      'vout': 0,
    },
    {
      'address': 'DPMXeQqXrC5ThpT1cG5b7661NAY9MKjYmG',
      'coinbase': false,
      'height': '3368748',
      'lockTime': undefined,
      'satoshis': 5394970564280,
      'scriptPubKeyHex': '76a914c7cc3691a66171dc4d177f4ae332f2e010671ccb88ac',
      'spent': true,
      'txHex': '01000000018f7285f11fca1cfd4a40771adaa4a34a24d6a1d99046987076c07134a2a8ac39010000006a47304402204860ae17691d3ed96879fa900ea25e7c96fff8f27e8eb21dc5766b696856c72d02203002a1195729128c3632c47ca09b6bbb2a91e11e9d2ae1a7190a403dcd2ad62401210296621610fd3183c7b9f3835384bdb8f0633fa786092f2c4374752e4722a784dbffffffff02913ab5b16b0000001976a91427bd4c230c46bce00c3dad4279643f18710d797d88acb8d64d1de80400001976a914c7cc3691a66171dc4d177f4ae332f2e010671ccb88ac00000000',
      'txid': 'dc8ae0ebe273faf3e6e2f1192279df91fa6b8621e3daba08dc89ef9cb0539193',
      'value': '53949.7056428',
      'vout': 1,
    },
 ],
  'externalOutputs': [
    {
      'address': 'D8mDfMWavhe4BwJYhsRBy8VbNUWQkaHdhg',
      'value': '4625.42944913'
    },
    {
      'address': 'DPMXeQqXrC5ThpT1cG5b7661NAY9MKjYmG',
      'value': '53949.7056428'
    }
  ]
}


export const signedTx_valid: DogeSignedTransaction = {
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

export const signedTx_invalid: DogeSignedTransaction = {
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
