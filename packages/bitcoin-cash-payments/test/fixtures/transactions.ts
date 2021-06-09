/* tslint:disable: max-line-length variable-name */
import { BitcoinCashTransactionInfo, BitcoinCashSignedTransaction } from '../../src'
import { FeeLevel, FeeRateType, TransactionStatus } from '@faast/payments-common'

export const txInfo_beae1: BitcoinCashTransactionInfo = {
  'status': TransactionStatus.Confirmed,
  'id': '036cbcbcfa286c1ea3a8c1846064974a107d3f2a982b0ee29f5e02bbedb01f15',
  'fromIndex': null,
  'fromAddress': 'bitcoincash:qq5hgg4e0uavrlgwqtsu7092jpkef560yyedt26jks',
  'fromExtraId': null,
  'toIndex': null,
  'toAddress': 'bitcoincash:qpnljd3cler4sz7ky2gxhp0ffew22j6ryg6kjxga4f',
  'toExtraId': null,
  'amount': '0.00009803',
  'fee': '0.00000227',
  'sequenceNumber': null,
  'weight': 225,
  'confirmationId': '0000000000000000005e5f7db290865106895a50540f468396023100c9c8b6d2',
  'confirmationNumber': '645657',
  'confirmationTimestamp': new Date('2020-07-26T21:55:09.000Z'),
  'isExecuted': true,
  'isConfirmed': true,
  'confirmations': 1065,
  'data': {
    'txid': '036cbcbcfa286c1ea3a8c1846064974a107d3f2a982b0ee29f5e02bbedb01f15',
    'value': '6922454',
    'valueIn': '6922681',
    'version': 2,
    'vin': [
      {
        'txid': '1e76c7b16329b654df64c904c09e3dbf3989ef20f8dd1faaee8ed24565f6f540',
        'vout': 1,
        'sequence': 4294967295,
        'n': 0,
        'addresses': [
          'bitcoincash:qq5hgg4e0uavrlgwqtsu7092jpkef560yyedt26jks'
        ],
        'isAddress': true,
        'value': '6922681',
        'hex': '473044022055f88571f8b94c11b7b2145fc41fec9c35e1d7cb1bdac35c9033f9a78c55dadd02201f4aaf3c52c19defa3e8093bedb13007df30fbc504bb912ac62a7721beaa42da412102dd03e5a8da4e99d20b7b67088185994bf11eb51978f696994ebba824174a2724'
      }
    ],
    'vout': [
      {
        'value': '9803',
        'n': 0,
        'hex': '76a91467f93638fe47580bd622906b85e94e5ca54b432288ac',
        'addresses': [
          'bitcoincash:qpnljd3cler4sz7ky2gxhp0ffew22j6ryg6kjxga4f'
        ],
        'isAddress': true
      },
      {
        'value': '6912651',
        'n': 1,
        'hex': '76a914297422b97f3ac1fd0e02e1cf3caa906d94d34f2188ac',
        'addresses': [
          'bitcoincash:qq5hgg4e0uavrlgwqtsu7092jpkef560yyedt26jks'
        ],
        'isAddress': true
      }
    ],
    'blockHash': '0000000000000000005e5f7db290865106895a50540f468396023100c9c8b6d2',
    'blockHeight': 645657,
    'confirmations': 1065,
    'blockTime': 1595800509,
    'fees': '227',
    'hex': '020000000140f5f66545d28eeeaa1fddf820ef8939bf3d9ec004c964df54b62963b1c7761e010000006a473044022055f88571f8b94c11b7b2145fc41fec9c35e1d7cb1bdac35c9033f9a78c55dadd02201f4aaf3c52c19defa3e8093bedb13007df30fbc504bb912ac62a7721beaa42da412102dd03e5a8da4e99d20b7b67088185994bf11eb51978f696994ebba824174a2724ffffffff024b260000000000001976a91467f93638fe47580bd622906b85e94e5ca54b432288ac8b7a6900000000001976a914297422b97f3ac1fd0e02e1cf3caa906d94d34f2188ac00000000'
  },
  'inputUtxos': [
    {
      'txid': '1e76c7b16329b654df64c904c09e3dbf3989ef20f8dd1faaee8ed24565f6f540',
      'vout': 1,
      'value': '0.06922681'
    }
  ],
  'outputUtxos': [
    {
      'address': 'bitcoincash:qpnljd3cler4sz7ky2gxhp0ffew22j6ryg6kjxga4f',
      'coinbase': false,
      'confirmations': 45863,
      'height': '645657',
      'lockTime': undefined,
      'satoshis': 9803,
      'scriptPubKeyHex': '76a91467f93638fe47580bd622906b85e94e5ca54b432288ac',
      'spent': true,
      'txHex': '020000000140f5f66545d28eeeaa1fddf820ef8939bf3d9ec004c964df54b62963b1c7761e010000006a473044022055f88571f8b94c11b7b2145fc41fec9c35e1d7cb1bdac35c9033f9a78c55dadd02201f4aaf3c52c19defa3e8093bedb13007df30fbc504bb912ac62a7721beaa42da412102dd03e5a8da4e99d20b7b67088185994bf11eb51978f696994ebba824174a2724ffffffff024b260000000000001976a91467f93638fe47580bd622906b85e94e5ca54b432288ac8b7a6900000000001976a914297422b97f3ac1fd0e02e1cf3caa906d94d34f2188ac00000000',
      'txid': '036cbcbcfa286c1ea3a8c1846064974a107d3f2a982b0ee29f5e02bbedb01f15',
      'value': '0.00009803',
      'vout': 0,
    },
    {
      'address': 'bitcoincash:qq5hgg4e0uavrlgwqtsu7092jpkef560yyedt26jks',
      'coinbase': false,
      'confirmations': 45863,
      'height': '645657',
      'lockTime': undefined,
      'satoshis': 6912651,
      'scriptPubKeyHex': '76a914297422b97f3ac1fd0e02e1cf3caa906d94d34f2188ac',
      'spent': true,
      'txHex': '020000000140f5f66545d28eeeaa1fddf820ef8939bf3d9ec004c964df54b62963b1c7761e010000006a473044022055f88571f8b94c11b7b2145fc41fec9c35e1d7cb1bdac35c9033f9a78c55dadd02201f4aaf3c52c19defa3e8093bedb13007df30fbc504bb912ac62a7721beaa42da412102dd03e5a8da4e99d20b7b67088185994bf11eb51978f696994ebba824174a2724ffffffff024b260000000000001976a91467f93638fe47580bd622906b85e94e5ca54b432288ac8b7a6900000000001976a914297422b97f3ac1fd0e02e1cf3caa906d94d34f2188ac00000000',
      'txid': '036cbcbcfa286c1ea3a8c1846064974a107d3f2a982b0ee29f5e02bbedb01f15',
      'value': '0.06912651',
      'vout': 1,
    },
  ],
  'externalOutputs': [
    {
      'address': 'bitcoincash:qpnljd3cler4sz7ky2gxhp0ffew22j6ryg6kjxga4f',
      'value': '0.00009803'
    }
  ],
}

export const signedTx_valid: BitcoinCashSignedTransaction = {
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

export const signedTx_invalid: BitcoinCashSignedTransaction = {
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
