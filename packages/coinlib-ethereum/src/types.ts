import * as t from 'io-ts'
import {
  enumCodec,
  extendCodec,
  instanceofCodec,
  Logger,
  Numeric,
  optional,
  requiredOptionalCodec,
} from '@bitaccess/ts-common'

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
  BigNumber,
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

export const NetworkConstants = t.partial(networkConstantsCodecFields, 'NetworkConstants')
export type NetworkConstants = t.TypeOf<typeof NetworkConstants>

export const PartialNetworkConstants = t.partial(networkConstantsCodecFields, 'PartialNetworkConstants')
export type PartialNetworkConstants = t.TypeOf<typeof PartialNetworkConstants>

export const EthereumPaymentsUtilsConfig = extendCodec(
  BaseConfig,
  {},
  {
    fullNode: OptionalString,
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
  {
    derivationPath: t.string,
  },
  'SeedEthereumPaymentsConfig',
)
export type SeedEthereumPaymentsConfig = t.TypeOf<typeof SeedEthereumPaymentsConfig>

export const UniPubKeyEthereumPaymentsConfig = extendCodec(
  BaseEthereumPaymentsConfig,
  {
    uniPubKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'UniPubKeyEthereumPaymentsConfig',
)
export type UniPubKeyEthereumPaymentsConfig = t.TypeOf<typeof UniPubKeyEthereumPaymentsConfig>

export const UHdEthereumPaymentsConfig = t.union(
  [SeedEthereumPaymentsConfig, UniPubKeyEthereumPaymentsConfig],
  'UHdEthereumPaymentsConfig',
)
export type UHdEthereumPaymentsConfig = t.TypeOf<typeof UHdEthereumPaymentsConfig>

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

export const SeedErc20PaymentsConfig = extendCodec(
  BaseErc20PaymentsConfig,
  {
    seed: t.string,
  },
  {
    derivationPath: t.string,
  },
  'SeedErc20PaymentsConfig',
)
export type SeedErc20PaymentsConfig = t.TypeOf<typeof SeedErc20PaymentsConfig>

export const UniPubKeyErc20PaymentsConfig = extendCodec(
  BaseErc20PaymentsConfig,
  {
    uniPubKey: t.string,
  },
  {
    derivationPath: t.string,
  },
  'UniPubKeyErc20PaymentsConfig',
)
export type UniPubKeyErc20PaymentsConfig = t.TypeOf<typeof UniPubKeyErc20PaymentsConfig>

export const UHdErc20PaymentsConfig = t.union(
  [SeedErc20PaymentsConfig, UniPubKeyErc20PaymentsConfig],
  'UHdErc20PaymentsConfig',
)
export type UHdErc20PaymentsConfig = t.TypeOf<typeof UHdErc20PaymentsConfig>

export const KeyPairErc20PaymentsConfig = extendCodec(
  BaseErc20PaymentsConfig,
  {
    // can be private keys or addresses
    keyPairs: KeyPairsConfigParam,
  },
  'KeyPairErc20PaymentsConfig',
)
export type KeyPairErc20PaymentsConfig = t.TypeOf<typeof KeyPairErc20PaymentsConfig>

export const Erc20PaymentsConfig = t.union(
  [HdErc20PaymentsConfig, UHdErc20PaymentsConfig, KeyPairErc20PaymentsConfig],
  'Erc20PaymentsConfig',
)
export type Erc20PaymentsConfig = t.TypeOf<typeof Erc20PaymentsConfig>

export const EthereumPaymentsConfig = t.union(
  [
    HdEthereumPaymentsConfig,
    UHdEthereumPaymentsConfig,
    KeyPairEthereumPaymentsConfig,
    HdErc20PaymentsConfig,
    UHdErc20PaymentsConfig,
    KeyPairErc20PaymentsConfig,
  ],
  'EthereumPaymentsConfig',
)
export type EthereumPaymentsConfig = t.TypeOf<typeof EthereumPaymentsConfig>

export type EthereumPaymentsConfigKeys =
  | keyof HdEthereumPaymentsConfig
  | keyof UHdEthereumPaymentsConfig
  | keyof KeyPairEthereumPaymentsConfig
  | keyof HdErc20PaymentsConfig
  | keyof UHdErc20PaymentsConfig
  | keyof KeyPairErc20PaymentsConfig

export const EthereumTransactionOptions = extendCodec(
  CreateTransactionOptions,
  {},
  {
    data: t.string,
    gas: Numeric,
    proxyAddress: t.string,
    legacySweep: t.boolean,
  },
  'EthereumTransactionOptions',
)
export type EthereumTransactionOptions = t.TypeOf<typeof EthereumTransactionOptions>

export const EthereumUnsignedTxData = requiredOptionalCodec(
  {
    from: t.string,
    value: t.string,
    gas: t.string,
    gasPrice: t.string,
    nonce: t.string,
  },
  {
    to: t.string,
    data: t.string,
  },
  'EthereumUnsignedTxData',
)
export type EthereumUnsignedTxData = t.TypeOf<typeof EthereumUnsignedTxData>

export const EthereumUnsignedTransaction = extendCodec(
  BaseUnsignedTransaction,
  {
    amount: t.string,
    fee: t.string,
    data: EthereumUnsignedTxData,
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
    web3: instanceofCodec(Web3),
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

export enum NetworkDataProviders {
  Blockbook = 'blockbook',
  Web3 = 'web3',
}

export interface EthereumStandardizedReceipt {
  gasUsed: string
  status: string | boolean
  logs: any[]
}

export interface ERC20TokenTransfer {
  type: 'ERC20' | string
  from: string
  to: string
  token: string
  name: string
  symbol: string
  decimals: number
  value: string
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
  raw: object
  contractAddress?: string
  status: boolean
  currentBlockNumber: number
  dataProvider: NetworkDataProviders
  receipt?: EthereumStandardizedReceipt
  tokenTransfers: ERC20TokenTransfer[]
}

export interface EthereumStandardizedERC20Transaction extends EthereumStandardizedTransaction {
  tokenSymbol: string
  tokenName: string
  tokenDecimals: string
  txInput: string
  receipt: EthereumStandardizedReceipt
}

export interface EthereumNetworkDataProvider {
  getBlock(id?: string | number, includeTransactionObjects?: boolean): Promise<BlockInfo>
  getCurrentBlockNumber(): Promise<number>

  getNextNonce(address: string): Promise<Numeric>

  getAddressBalance(address: string): Promise<string>
  getAddressBalanceERC20(address: string, tokenAddress: string): Promise<string>

  getERC20Transaction(txId: string, tokenAddress: string): Promise<EthereumStandardizedERC20Transaction>

  getTransaction(txId: string): Promise<EthereumStandardizedTransaction>
}
