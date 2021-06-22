/* tslint:disable: max-line-length variable-name */
import { TronTransactionInfo, TronSignedTransaction } from '../../src'
import { FeeLevel, FeeRateType, TransactionStatus } from '@faast/payments-common'

export const txInfo_209F8: TronTransactionInfo = {
  id: '209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c',
  toAddress: 'TYehHt29ynSogYoxp9653hMFmxCV3gCZqg',
  fromAddress: 'TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26',
  toExtraId: null,
  fromIndex: null,
  toIndex: null,
  amount: '0.002323',
  fee: '0.1',
  sequenceNumber: null,
  isExecuted: true,
  isConfirmed: true,
  confirmations: 1234,
  confirmationId: '3748106',
  confirmationTimestamp: new Date(1541196198000),
  status: TransactionStatus.Confirmed,
  data: {
    blockNumber: 3748106,
    blockTimeStamp: 1541196198000,
    contractResult: [''],
    currentBlock: {
      blockID: '00000000007e75b870f791dc72308ddf71b58237575bc2f13f5b68cba0f0c573',
      block_header: {
        raw_data: {
          number: 8287672,
          parentHash: '00000000007e75b7d5d3c97ca154ad94d629d66040847c8d9e6b0be241b4d0ce',
          timestamp: 1555006905000,
          txTrieRoot: 'b83ef9b7ac102ceb7b2dddae0b6622dbf7bebb397e9798f971de4c7b371b7347',
          version: 7,
          witness_address: '41c189fa6fc9ed7a3580c3fe291915d5c6a6259be7',
        },
        witness_signature:
          '5cfc0d6839e5bf4246bb08f97e0294efc46130dc27052f1276235933a216af5a6b4950135765ac9f407364c7d860031ee9561103488b6fb0aa3cd83dd67da58d00',
      },
    },
    fee: 100000,
    id: '209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c',
    raw_data: {
      contract: [
        {
          parameter: {
            type_url: 'type.googleapis.com/protocol.TransferContract',
            value: {
              amount: 2323,
              owner_address: '410fdbb073f86cea5c16eb05f1b2e174236c003b57',
              to_address: '41f8ca9ae6502d787eab3a322f662ae52cae787f2f',
            },
          },
          type: 'TransferContract',
        },
      ],
      expiration: 1541196252000,
      ref_block_bytes: '3108',
      ref_block_hash: 'ae9604e3f4636913',
      timestamp: 1541196195242,
    },
    raw_data_hex:
      '0a0231082208ae9604e3f463691340e086d2b3ed2c5a66080112620a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412310a15410fdbb073f86cea5c16eb05f1b2e174236c003b57121541f8ca9ae6502d787eab3a322f662ae52cae787f2f18931270aacbceb3ed2c',
    receipt: {
      net_fee: 100000,
    },
    ret: [
      {
        contractRet: 'SUCCESS',
      },
    ],
    signature: [
      'd6dbee070107073f756f7f44bb082a477c438d5aa54f685dc4a813c04bf26deed611ebb316fe6a8384cf02bcebd4e84b0333637add4bcaf7cc2a5071e999fb6000',
    ],
    txID: '209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c',
  },
}

export const txInfo_a0787: TronTransactionInfo = {
  id: 'a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39',
  amount: '10.27',
  toAddress: 'TVqbYNCpGBxTXP84zRuLk3iS4TXGo1verg',
  fromAddress: 'TBScvVdiX5Yob2XBLWUfUfTiTLabm2RsB8',
  toExtraId: null,
  fromIndex: null,
  toIndex: null,
  fee: '0',
  sequenceNumber: null,
  isExecuted: true,
  isConfirmed: true,
  confirmations: 4199517,
  confirmationId: '4093430',
  confirmationTimestamp: new Date(1542234063000),
  status: TransactionStatus.Confirmed,
  data: {
    ret: [
      {
        contractRet: 'SUCCESS',
      },
    ],
    signature: [
      '5ceb8c8cb23225038f72910e310f89dd55c70e9abfc3589b86ec78a8f14d2ba9a2367527a4ec2dd9671f2d421e91cad90ebeb717b78a9fff26cd58e59c2d31a601',
    ],
    txID: 'a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39',
    raw_data: {
      contract: [
        {
          parameter: {
            value: {
              amount: 10270000,
              owner_address: '4110275343850fff69059e2fe2f8f07a418a86e1f8',
              to_address: '41d9f200d49eda93de31bb3dd305928d7cfb1fd312',
            },
            type_url: 'type.googleapis.com/protocol.TransferContract',
          },
          type: 'TransferContract',
        },
      ],
      ref_block_bytes: '75f4',
      ref_block_hash: '8d8a83fa3ea0003d',
      expiration: 1542234117000,
      timestamp: 1542234058986,
    },
    raw_data_hex:
      '0a0275f422088d8a83fa3ea0003d4088a7c4a2f12c5a68080112640a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412330a154110275343850fff69059e2fe2f8f07a418a86e1f8121541d9f200d49eda93de31bb3dd305928d7cfb1fd31218b0eaf20470eae1c0a2f12c',
    id: 'a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39',
    blockNumber: 4093430,
    blockTimeStamp: 1542234063000,
    contractResult: [''],
    receipt: {
      net_usage: 268,
    },
    currentBlock: {
      block_header: {
        raw_data: {
          number: 8292947,
          txTrieRoot: 'c35e0d1a79b78882ca0bde7c6ec688cbc3ae06312838187586b72c62e6af81ae',
          witness_address: '415863f6091b8e71766da808b1dd3159790f61de7d',
          parentHash: '00000000007e8a52556283dd8d89990e2c79e4c9f12828e6271bb5469ab10099',
          version: 7,
          timestamp: 1555022763000,
        },
        witness_signature:
          '5028cde11148ac5684a7d8ad0f603b57f0580c15ba94ae93df35e33eeb178ffe59337039f2a8a157aa55748bffa69d034c0a227568c80973164071f9cf069deb01',
      },
      blockID: '00000000007e8a532982ee2dc51f926b7e1491d919787642a775bd9f62e8ccfa',
    },
  },
}

export const signedTx_valid: TronSignedTransaction = {
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
    txID: 'c7376e46f869a9cadfca43ca20bfdc3c1bfe856908a6a57de147fb881189c3a7',
    raw_data: {
      contract: [
        {
          parameter: {
            value: {
              amount: 74262026,
              owner_address: '41e3f138a75016a33a64ba2ec14afa2f5c44f30797',
              to_address: '41b3588f73abfb989d9a3488ccb1d01b7d42ed689e',
            },
            type_url: 'type.googleapis.com/protocol.TransferContract',
          },
          type: 'TransferContract',
        },
      ],
      ref_block_bytes: '4732',
      ref_block_hash: '263457a1c845be9f',
      expiration: 1555366179000,
      timestamp: 1555366122131,
    },
    raw_data_hex:
      '0a0247322208263457a1c845be9f40b8e1b198a22d5a68080112640a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412330a1541e3f138a75016a33a64ba2ec14afa2f5c44f30797121541b3588f73abfb989d9a3488ccb1d01b7d42ed689e188accb4237093a5ae98a22d',
    signature: [
      '2a3a92f5809b47517dfabac8ed8f25e3075071588f2b9846c0eb588415e9f9c1ff37655d3fe2c5fc8ef0c004e52a8ff9e9f96b7dd365f58387da6c1037a828d000',
    ],
  },
}

export const signedTx_invalid: TronSignedTransaction = {
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
  data: {
    txID: '1234567890',
    raw_data: {
      contract: [
        {
          parameter: {
            value: {
              amount: 1234567890,
              owner_address: '1234567890',
              to_address: '1234567890',
            },
            type_url: '1234567890',
          },
          type: '1234567890',
        },
      ],
      ref_block_bytes: '1234567890',
      ref_block_hash: '1234567890',
      expiration: 1234567890,
      timestamp: 1234567890,
    },
    raw_data_hex: '1234567890',
    signature: ['1234567890'],
  },
}
