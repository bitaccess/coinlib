/* tslint:disable: max-line-length variable-name */
import { DashTransactionInfo, DashSignedTransaction } from '../../src'
import { FeeLevel, FeeRateType, TransactionStatus } from '@faast/payments-common'

export const txInfo_beae1: DashTransactionInfo = {
  'status': TransactionStatus.Confirmed,
  'id': '2f04f6ff6208dcac247920eaec3fde940fefd44c19d62c0a1e33f5c53fe6b7bd',
  'fromIndex': null,
  'fromAddress': 'Xfd8zZ4DzUYVmfuwxarpYGHtKCuGYB5Jjg',
  'fromExtraId': null,
  'toIndex': null,
  'toAddress': 'multioutput',
  'toExtraId': null,
  'amount': '1.03651899',
  'fee': '0.0000315',
  'sequenceNumber': null,
  'confirmationId': '0000000000000019d2f78c32fcce921fff73fabb6981530980f0809d253a4feb',
  'confirmationNumber': '1325654',
  'confirmationTimestamp': new Date('2020-08-22T19:54:55.000Z'),
  'isExecuted': true,
  'isConfirmed': true,
  'confirmations': 67,
  'data': {
    'txid': '2f04f6ff6208dcac247920eaec3fde940fefd44c19d62c0a1e33f5c53fe6b7bd',
    'version': 2,
    'vin': [
      {
        'txid': '7d19b0df97476a5b872d19dd6596bbc15867ee3937d77789f5483da369079fb6',
        'vout': 1,
        'sequence': 4294967295,
        'n': 0,
        'addresses': [
          'Xfd8zZ4DzUYVmfuwxarpYGHtKCuGYB5Jjg'
        ],
        'isAddress': true,
        'value': '103655049',
        'hex': '473044022055370c1817fe45377e713699b0aed0b21823dd8baf301ec892bc07a2fc06bd7102205ee71f169a554ea27a313d15a4bff250bafab641c82adb0c35922ecb7ff0bf580121022448e8372e143747a717b6b73d79db45a1459849fd6f41a6624d687d9c928515'
      }
    ],
    'vout': [
      {
        'value': '35438143',
        'n': 0,
        'hex': '76a91426308c872319ee5244d3d8adc24a6cb6db4a0ead88ac',
        'addresses': [
          'XeAmfnKuWqC1KGodJb4DbDjgqVmnH7cMq6'
        ],
        'isAddress': true
      },
      {
        'value': '68213756',
        'n': 1,
        'hex': '76a9148174eaab904ef1767bc3aa7a49c3eeb4bf7d92c788ac',
        'addresses': [
          'XnVM4WhpZFbiuKCKbcohrpeaGtLAryV7Xv'
        ],
        'isAddress': true
      }
    ],
    'blockHash': '0000000000000019d2f78c32fcce921fff73fabb6981530980f0809d253a4feb',
    'blockHeight': 1325654,
    'confirmations': 67,
    'blockTime': 1598126095,
    'value': '103651899',
    'valueIn': '103655049',
    'fees': '3150',
    'hex': '0200000001b69f0769a33d48f58977d73739ee6758c1bb9665dd192d875b6a4797dfb0197d010000006a473044022055370c1817fe45377e713699b0aed0b21823dd8baf301ec892bc07a2fc06bd7102205ee71f169a554ea27a313d15a4bff250bafab641c82adb0c35922ecb7ff0bf580121022448e8372e143747a717b6b73d79db45a1459849fd6f41a6624d687d9c928515ffffffff023fbe1c02000000001976a91426308c872319ee5244d3d8adc24a6cb6db4a0ead88acfcdb1004000000001976a9148174eaab904ef1767bc3aa7a49c3eeb4bf7d92c788ac00000000'
  },
  'inputUtxos': [
    {
      'txid': '7d19b0df97476a5b872d19dd6596bbc15867ee3937d77789f5483da369079fb6',
      'vout': 1,
      'value': '1.03655049'
    }
  ],
  'externalOutputs': [
    {
      'address': 'XeAmfnKuWqC1KGodJb4DbDjgqVmnH7cMq6',
      'value': '0.35438143'
    },
    {
      'address': 'XnVM4WhpZFbiuKCKbcohrpeaGtLAryV7Xv',
      'value': '0.68213756'
    }
  ]
}

export const signedTx_valid: DashSignedTransaction = {
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

export const signedTx_invalid: DashSignedTransaction = {
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
