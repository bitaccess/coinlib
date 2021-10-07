/* tslint:disable: max-line-length variable-name */
import { LitecoinTransactionInfo, LitecoinSignedTransaction } from '../../src'
import { FeeLevel, FeeRateType, TransactionStatus } from '@bitaccess/coinlib-common'

export const txInfo_4d111: LitecoinTransactionInfo = {
  id: '4d111229fefb8b856beafa1a5e2799a16d2718f558e1c0ada0fde13fd41653a9',
  toAddress: 'Lar9GoLtt8FwCJzahE8GnuTfNL8kQhkUFR',
  toExtraId: null,
  toIndex: null,
  fromAddress: 'MUzMaBkrmwVgvKr15wo61qVTUHLCZeK8Ax',
  fromExtraId: null,
  fromIndex: null,
  amount: '0.11044456',
  fee: '0.0000832',
  externalOutputs: [
    {
      'address': 'Lar9GoLtt8FwCJzahE8GnuTfNL8kQhkUFR',
      'value': '0.11044456',
    },
  ],
  inputUtxos: [
    {
      'address': 'MUzMaBkrmwVgvKr15wo61qVTUHLCZeK8Ax',
      'satoshis': 826000000,
      'txid': '9b64ee72b0674cdc44e9130a14c94719ec21997c9e9d3573ce956759a3bd6898',
      'value': '8.26',
      'vout': 0,
    },
  ],
  outputUtxos: [
    {
      'address': 'Lar9GoLtt8FwCJzahE8GnuTfNL8kQhkUFR',
      'coinbase': false,
      'confirmations': 219967,
      'height': '1847467',
      'lockTime': undefined,
      'satoshis': 11044456,
      'scriptPubKeyHex': '76a914ab620d5aa587e3d866deafee28c5667b133ac90588ac',
      'spent': true,
      'txHex': '010000000001019868bda3596795ce73359d9e7c9921ec1947c9140a13e944dc4c67b072ee649b00000000232200204ff6abc65d7693a679287cef07a2e9e8b7cf9f19137ee5fd207eac16cf4be3feffffffff026886a800000000001976a914ab620d5aa587e3d866deafee28c5667b133ac90588ac981b93300000000017a914e756301d05a21d85b920e20b3ea840e06e63289887040047304402206d0395f09905916e1a3a47aa8171ce55ddbe63d1585097eb9b76214b6a16151902202710f746868b8e0cdd96ffb0923839467db60418bca9271abd6a9d220beb536001473044022056bf37f7718f6c7d0519888fbb81268c58c606b8dd104ff784f16af39751d26d0220411bb7bbf715ddea3c05fdf7b681dc8d00fc332c550c51b90adb09eac9da099501475221035c8c252768242be5fa24a22a5c5d7d6c559c1f88ea39ab957b9e51a939b925cb2103cc695f9e9cd2b58b9317d35d8dd87c184baca64417afc89664b668dcf34923a752ae00000000',
      'txid': '4d111229fefb8b856beafa1a5e2799a16d2718f558e1c0ada0fde13fd41653a9',
      'value': '0.11044456',
      'vout': 0,
    },
    {
      'address': 'MUzMaBkrmwVgvKr15wo61qVTUHLCZeK8Ax',
      'coinbase': false,
      'confirmations': 219967,
      'height': '1847467',
      'lockTime': undefined,
      'satoshis': 814947224,
      'scriptPubKeyHex': 'a914e756301d05a21d85b920e20b3ea840e06e63289887',
      'spent': true,
      'txHex': '010000000001019868bda3596795ce73359d9e7c9921ec1947c9140a13e944dc4c67b072ee649b00000000232200204ff6abc65d7693a679287cef07a2e9e8b7cf9f19137ee5fd207eac16cf4be3feffffffff026886a800000000001976a914ab620d5aa587e3d866deafee28c5667b133ac90588ac981b93300000000017a914e756301d05a21d85b920e20b3ea840e06e63289887040047304402206d0395f09905916e1a3a47aa8171ce55ddbe63d1585097eb9b76214b6a16151902202710f746868b8e0cdd96ffb0923839467db60418bca9271abd6a9d220beb536001473044022056bf37f7718f6c7d0519888fbb81268c58c606b8dd104ff784f16af39751d26d0220411bb7bbf715ddea3c05fdf7b681dc8d00fc332c550c51b90adb09eac9da099501475221035c8c252768242be5fa24a22a5c5d7d6c559c1f88ea39ab957b9e51a939b925cb2103cc695f9e9cd2b58b9317d35d8dd87c184baca64417afc89664b668dcf34923a752ae00000000',
      'txid': '4d111229fefb8b856beafa1a5e2799a16d2718f558e1c0ada0fde13fd41653a9',
      'value': '8.14947224',
      'vout': 1,
    },
  ],
  sequenceNumber: null,
  weight: 207,
  isExecuted: true,
  isConfirmed: true,
  confirmations: 1234,
  confirmationId: '6cc849d473a342663c9b7fbf2a19b42c9828e8c778ab5bdd2ee42cd6e30a7bdc',
  confirmationNumber: '1847467',
  confirmationTimestamp: new Date('2020-05-25T11:09:30.000Z'),
  status: TransactionStatus.Confirmed,
  data: {
    'blockHash': '6cc849d473a342663c9b7fbf2a19b42c9828e8c778ab5bdd2ee42cd6e30a7bdc',
    'blockHeight': 1847467,
    'blockTime': 1590404970,
    'confirmations': 489,
    'fees': '8320',
    'hex': '010000000001019868bda3596795ce73359d9e7c9921ec1947c9140a13e944dc4c67b072ee649b00000000232200204ff6abc65d7693a679287cef07a2e9e8b7cf9f19137ee5fd207eac16cf4be3feffffffff026886a800000000001976a914ab620d5aa587e3d866deafee28c5667b133ac90588ac981b93300000000017a914e756301d05a21d85b920e20b3ea840e06e63289887040047304402206d0395f09905916e1a3a47aa8171ce55ddbe63d1585097eb9b76214b6a16151902202710f746868b8e0cdd96ffb0923839467db60418bca9271abd6a9d220beb536001473044022056bf37f7718f6c7d0519888fbb81268c58c606b8dd104ff784f16af39751d26d0220411bb7bbf715ddea3c05fdf7b681dc8d00fc332c550c51b90adb09eac9da099501475221035c8c252768242be5fa24a22a5c5d7d6c559c1f88ea39ab957b9e51a939b925cb2103cc695f9e9cd2b58b9317d35d8dd87c184baca64417afc89664b668dcf34923a752ae00000000',
    'txid': '4d111229fefb8b856beafa1a5e2799a16d2718f558e1c0ada0fde13fd41653a9',
    'value': '825991680',
    'valueIn': '826000000',
    'version': 1,
    'vin': [
      {
        'addresses': [
          'MUzMaBkrmwVgvKr15wo61qVTUHLCZeK8Ax',
        ],
        'hex': '2200204ff6abc65d7693a679287cef07a2e9e8b7cf9f19137ee5fd207eac16cf4be3fe',
        'n': 0,
        'sequence': 4294967295,
        'txid': '9b64ee72b0674cdc44e9130a14c94719ec21997c9e9d3573ce956759a3bd6898',
        'isAddress': true,
        'value': '826000000',
      },
    ],
    'vout': [
      {
        'addresses': [
          'Lar9GoLtt8FwCJzahE8GnuTfNL8kQhkUFR',
        ],
        'hex': '76a914ab620d5aa587e3d866deafee28c5667b133ac90588ac',
        'n': 0,
        'spent': true,
        'value': '11044456',
        'isAddress': true,
      },
      {
        'addresses': [
          'MUzMaBkrmwVgvKr15wo61qVTUHLCZeK8Ax',
        ],
        'hex': 'a914e756301d05a21d85b920e20b3ea840e06e63289887',
        'n': 1,
        'spent': true,
        'value': '814947224',
        'isAddress': true,
      },
    ],
  }
}

export const signedTx_valid: LitecoinSignedTransaction = {
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

export const signedTx_invalid: LitecoinSignedTransaction = {
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
