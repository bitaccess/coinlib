/* tslint:disable: max-line-length variable-name */
import { BitcoinTransactionInfo, BitcoinSignedTransaction } from '../../src'
import { FeeLevel, FeeRateType, TransactionStatus } from '@faast/payments-common'

export const txInfo_beae1: BitcoinTransactionInfo = {
  'status': TransactionStatus.Confirmed,
  'id': 'beae121a09459bd76995ee7de20f2dcd8f52abbbf513a32f24be572737b17ef3',
  'fromIndex': null,
  'fromAddress': 'bc1qaqm8wh8sr6gfx49mdpz3w70z48xdh0pzlf5kgr',
  'fromExtraId': null,
  'toIndex': null,
  'toAddress': '32BXkczC5Nr9mQKMifEaJf2p6Hb9JULakA',
  'toExtraId': null,
  'amount': '0.08301009',
  'fee': '0.00006531',
  'sequenceNumber': null,
  'weight': 142,
  'confirmationId': '0000000000000000000653e2bfb8b631e79c8c8ca8180725d823674d1612e3b1',
  'confirmationNumber': '638347',
  'confirmationTimestamp': new Date('2020-07-08T20:40:53.000Z'),
  'isExecuted': true,
  'isConfirmed': true,
  'confirmations': 1065,
  'data': {
    'txid': 'beae121a09459bd76995ee7de20f2dcd8f52abbbf513a32f24be572737b17ef3',
    'version': 2,
    'vin': [
      {
        'txid': '01ae19356989b8fae9384c0c704558a194e8e43a61424f1fdac3f5ecbf9ec39e',
        'vout': 5,
        'sequence': 4294967293,
        'n': 0,
        'addresses': [
          'bc1qaqm8wh8sr6gfx49mdpz3w70z48xdh0pzlf5kgr'
        ],
        'isAddress': true,
        'value': '20045195'
      }
    ],
    'vout': [
      {
        'value': '8301009',
        'n': 0,
        'hex': 'a91405648bff10f4cce3aacd8a2cc925cac248cdbe5b87',
        'addresses': [
          '32BXkczC5Nr9mQKMifEaJf2p6Hb9JULakA'
        ],
        'isAddress': true
      },
      {
        'value': '11737655',
        'n': 1,
        'hex': '0014e836775cf01e909354bb68451779e2a9ccdbbc22',
        'addresses': [
          'bc1qaqm8wh8sr6gfx49mdpz3w70z48xdh0pzlf5kgr'
        ],
        'isAddress': true
      }
    ],
    'blockHash': '0000000000000000000653e2bfb8b631e79c8c8ca8180725d823674d1612e3b1',
    'blockHeight': 638347,
    'confirmations': 1065,
    'blockTime': 1594240853,
    'value': '20038664',
    'valueIn': '20045195',
    'fees': '6531',
    'hex': '020000000001019ec39ebfecf5c3da1f4f42613ae4e894a15845700c4c38e9fab889693519ae010500000000fdffffff02d1a97e000000000017a91405648bff10f4cce3aacd8a2cc925cac248cdbe5b87371ab30000000000160014e836775cf01e909354bb68451779e2a9ccdbbc2202473044022067c4d3f664308375db86e6dfaed80b8d1810556f8915d367a15283b4750f38ed022030020b89b8908141ffadcc7ee6c9b9e22cea99f1b9dd7b9862d11460376696b30121024b23cd7cf072bc737bfc56861a58c9e52f386c98b3ba75095490456e5951255f00000000'
  },
  'inputUtxos': [
    {
      'txid': '01ae19356989b8fae9384c0c704558a194e8e43a61424f1fdac3f5ecbf9ec39e',
      'vout': 5,
      'value': '0.20045195'
    }
  ],
  'externalOutputs': [
    {
      'address': '32BXkczC5Nr9mQKMifEaJf2p6Hb9JULakA',
      'value': '0.08301009'
    }
  ],
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
