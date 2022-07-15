import * as t from 'io-ts'
import {
  enumCodec,
  extendCodec,
  instanceofCodec,
  Logger,
  Numeric,
  optional,
  requiredOptionalCodec,
} from '@faast/ts-common'

import {
  BaseTransactionInfo,
  BaseUnsignedTransaction,
  BaseSignedTransaction,
  BaseBroadcastResult,
  BaseConfig,
  ResolvedFeeOption,
  FeeOption,
  FeeOptionCustom,
  KeyPairsConfigParam,
  CreateTransactionOptions,
  NetworkTypeT,
  createUnitConverters,
  BlockInfo,
} from '@bitaccess/coinlib-common'
import { BlockbookEthereum, BlockInfoEthereum } from 'blockbook-client'
import Web3 from 'web3'

export enum EthereumAddressFormat {
  Lowercase = 'lowercase',
  Checksum = 'checksum',
}
export const EthereumAddressFormatT = enumCodec<EthereumAddressFormat>(EthereumAddressFormat, 'EthereumAddressFormat')

const keys = t.type({
  pub: t.string,
  prv: t.string,
})

const xkeys = t.type({
  xprv: t.string,
  xpub: t.string,
})

const OptionalString = optional(t.string)
const OptionalNumber = optional(t.number)

export type EthTxType = 'ETHEREUM_TRANSFER' | 'CONTRACT_DEPLOY' | 'TOKEN_SWEEP' | 'TOKEN_TRANSFER'

export const EthereumSignatory = t.type(
  {
    address: t.string,
    keys,
    xkeys,
  },
  'EthereumSignatory',
)
export type EthereumSignatory = t.TypeOf<typeof EthereumSignatory>


const networkConstantsCodecFields = {
  networkName: t.string,
  nativeCoinSymbol: t.string,
  nativeCoinName: t.string,
  nativeCoinDecimals: t.number,
  defaultDerivationPath: t.string,
  chainId: t.number,
}

export const NetworkConstants = t.type(networkConstantsCodecFields, 'NetworkConstants')
export type NetworkConstants = t.TypeOf<typeof NetworkConstants>

export const PartialNetworkConstants = t.partial(networkConstantsCodecFields, 'PartialNetworkConstants')
export type PartialNetworkConstants = t.TypeOf<typeof PartialNetworkConstants>

export const EthereumPaymentsUtilsConfig = extendCodec(
  BaseConfig,
  {},
  {
    fullNode: OptionalString,
    parityNode: OptionalString,
    blockbookNode: t.union([t.string, t.array(t.string)]),
    blockbookApi: instanceofCodec(BlockbookEthereum),
    gasStation: OptionalString,
    symbol: OptionalString,
    name: OptionalString,
    decimals: t.number,
    providerOptions: t.any,
    web3: t.any,
    tokenAddress: t.string,
    requestTimeoutMs: OptionalNumber,
    networkConstants: NetworkConstants,
  },
  'EthereumPaymentsUtilsConfig',
)
export type EthereumPaymentsUtilsConfig = t.TypeOf<typeof EthereumPaymentsUtilsConfig>

export const BaseEthereumPaymentsConfig = extendCodec(
  EthereumPaymentsUtilsConfig,
  {},
  {
    depositKeyIndex: OptionalNumber,
  },
  'BaseEthereumPaymentsConfig',
)
export type BaseEthereumPaymentsConfig = t.TypeOf<typeof BaseEthereumPaymentsConfig>

export const HdEthereumPaymentsConfig = extendCodec(
  BaseEthereumPaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'HdEthereumPaymentsConfig',
)
export type HdEthereumPaymentsConfig = t.TypeOf<typeof HdEthereumPaymentsConfig>

export const SeedEthereumPaymentsConfig = extendCodec(
  BaseEthereumPaymentsConfig,
  {
    seed: t.string,
  },
  'SeedEthereumPaymentsConfig',
)
export type SeedEthereumPaymentsConfig = t.TypeOf<typeof SeedEthereumPaymentsConfig>

export const KeyPairEthereumPaymentsConfig = extendCodec(
  BaseEthereumPaymentsConfig,
  {
    // can be private keys or addresses
    keyPairs: KeyPairsConfigParam,
  },
  'KeyPairEthereumPaymentsConfig',
)
export type KeyPairEthereumPaymentsConfig = t.TypeOf<typeof KeyPairEthereumPaymentsConfig>

export const BaseErc20PaymentsConfig = extendCodec(
  BaseEthereumPaymentsConfig,
  {
    tokenAddress: t.string,
  },
  {
    masterAddress: t.string,
  },
  'BaseErc20PaymentsConfig',
)
export type BaseErc20PaymentsConfig = t.TypeOf<typeof BaseErc20PaymentsConfig>

export const HdErc20PaymentsConfig = extendCodec(
  BaseErc20PaymentsConfig,
  {
    hdKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'HdErc20PaymentsConfig',
)
export type HdErc20PaymentsConfig = t.TypeOf<typeof HdErc20PaymentsConfig>

export const KeyPairErc20PaymentsConfig = extendCodec(
  BaseErc20PaymentsConfig,
  {
    // can be private keys or addresses
    keyPairs: KeyPairsConfigParam,
  },
  'KeyPairErc20PaymentsConfig',
)
export type KeyPairErc20PaymentsConfig = t.TypeOf<typeof KeyPairErc20PaymentsConfig>

export const Erc20PaymentsConfig = t.union([HdErc20PaymentsConfig, KeyPairErc20PaymentsConfig], 'Erc20PaymentsConfig')
export type Erc20PaymentsConfig = t.TypeOf<typeof Erc20PaymentsConfig>

export const EthereumPaymentsConfig = t.union(
  [
    HdEthereumPaymentsConfig,
    KeyPairEthereumPaymentsConfig,
    HdErc20PaymentsConfig,
    KeyPairErc20PaymentsConfig,
  ],
  'EthereumPaymentsConfig',
)
export type EthereumPaymentsConfig = t.TypeOf<typeof EthereumPaymentsConfig>

export type EthereumPaymentsConfigKeys =
  | keyof HdEthereumPaymentsConfig
  | keyof KeyPairEthereumPaymentsConfig
  | keyof HdErc20PaymentsConfig
  | keyof KeyPairErc20PaymentsConfig

export const EthereumTransactionOptions = extendCodec(
  CreateTransactionOptions,
  {},
  {
    data: t.string,
    gas: Numeric,
    proxyAddress: t.string,
  },
  'EthereumTransactionOptions',
)
export type EthereumTransactionOptions = t.TypeOf<typeof EthereumTransactionOptions>

export const EthereumUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
  },
  'EthereumUnsignedTransaction',
)
export type EthereumUnsignedTransaction = t.TypeOf<typeof EthereumUnsignedTransaction>

export const EthereumSignedTransaction = extendCodec(
  BaseSignedTransaction,
  {
    data: t.type({
      hex: t.string,
    }),
  },
  {},
  'EthereumSignedTransaction',
)
export type EthereumSignedTransaction = t.TypeOf<typeof EthereumSignedTransaction>

export const EthereumTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'EthereumTransactionInfo')
export type EthereumTransactionInfo = t.TypeOf<typeof EthereumTransactionInfo>

export const EthereumBroadcastResult = extendCodec(BaseBroadcastResult, {}, 'EthereumBroadcastResult')
export type EthereumBroadcastResult = t.TypeOf<typeof EthereumBroadcastResult>

export const EthereumResolvedFeeOption = extendCodec(
  ResolvedFeeOption,
  {
    gasPrice: t.string,
  },
  'EthereumResolvedFeeOption',
)
export type EthereumResolvedFeeOption = t.TypeOf<typeof EthereumResolvedFeeOption>

export const EthereumFeeOption = extendCodec(
  FeeOption,
  {},
  {
    isSweep: t.boolean,
  },
  'EthereumFeeOption',
)
export type EthereumFeeOption = t.TypeOf<typeof EthereumFeeOption>

export const EthereumFeeOptionCustom = extendCodec(
  FeeOptionCustom,
  {},
  {
    isSweep: t.boolean,
  },
  'EthereumFeeOption',
)
export type EthereumFeeOptionCustom = t.TypeOf<typeof EthereumFeeOptionCustom>

const BnRounding = t.union([
  t.literal(1),
  t.literal(2),
  t.literal(3),
  t.literal(4),
  t.literal(5),
  t.literal(6),
  t.literal(7),
  t.literal(8),
])

export const BaseDenominationOptions = extendCodec(
  t.object,
  {},
  {
    rounding: BnRounding,
  },
  'BaseDenominationOptions',
)

export type BaseDenominationOptions = t.TypeOf<typeof BaseDenominationOptions>

export const EthereumBlockbookConfigServer = t.union(
  [t.string, t.array(t.string), t.null],
  'EthereumBlockbookConfigServer',
)
export type EthereumBlockbookConfigServer = t.TypeOf<typeof EthereumBlockbookConfigServer>

export const EthereumBlockbookConnectedConfig = requiredOptionalCodec(
  {
    server: EthereumBlockbookConfigServer,
    logger: Logger,
  },
  {
    api: instanceofCodec(BlockbookEthereum),
    requestTimeoutMs: t.number,
  },
  'EthereumBlockbookConnectedConfig',
)
export type EthereumBlockbookConnectedConfig = t.TypeOf<typeof EthereumBlockbookConnectedConfig>

export const EthereumWeb3Config = requiredOptionalCodec(
  {
    web3: instanceofCodec(Web3)
  },
  {
    fullNode: t.string,
    providerOptions: t.any,
    logger: Logger,
  },
  'Web3Config',
)

export type EthereumWeb3Config = t.TypeOf<typeof EthereumWeb3Config>

export const BlockBookConfig = requiredOptionalCodec(
  {
    nodes: EthereumBlockbookConfigServer,
  },
  {
    requestTimeoutMs: t.number,
    api: instanceofCodec(BlockbookEthereum),
  },
  'BlockBookConfig',
)

export const NetworkDataConfig = requiredOptionalCodec(
  {
    web3Config: EthereumWeb3Config,
    blockBookConfig: BlockBookConfig,
  },
  {
    parityUrl: t.string,
    logger: Logger,
    gasStationUrl: t.string,
    requestTimeoutMs: t.number,
  },
  'NetworkDataConfig',
)

export type NetworkDataConfig = t.TypeOf<typeof NetworkDataConfig>

export const EthereumBalanceMonitorConfig = EthereumPaymentsUtilsConfig
export type EthereumBalanceMonitorConfig = EthereumPaymentsUtilsConfig

export const EthereumBlock = BlockInfoEthereum
export type EthereumBlock = BlockInfoEthereum

export type UnitConverters = ReturnType<typeof createUnitConverters>

export interface EthereumNodesConnection {
  web3: Web3
  blockbookApi?: BlockbookEthereum
}

export interface EthereumStandardizedTransaction {
  from: string
  to: string
  nonce: number
  txHash: string
  blockHeight: number
  blockHash: string
  blockTime: Date | null
  value: string
  confirmations: number
  gasUsed: number
  gasPrice: string
  raw: object,
  contractAddress?: string
  status: boolean,
}

export interface EthereumStandardizedERC20Transaction extends EthereumStandardizedTransaction {
  tokenSymbol: string
  tokenName: string
  tokenDecimals: string
  txInput: string
  receipt: {
    gasUsed: string
    status: string | boolean
    logs: any[]
  }
}
export interface EthereumNetworkDataProvider {
  getBlock(id?: string | number): Promise<BlockInfo>
  getCurrentBlockNumber(): Promise<number>

  getAddressBalance(address: string): Promise<string>
  getAddressBalanceERC20(address: string, tokenAddress: string): Promise<string>

  getERC20Transaction(txId: string, tokenAddress: string): Promise<EthereumStandardizedERC20Transaction>

  getTransaction(txId: string): Promise<EthereumStandardizedTransaction>
}
