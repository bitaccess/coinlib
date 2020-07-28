import { FeeLevel } from '@faast/payments-common'
import { EthTxType } from './types'

export const PACKAGE_NAME = 'ethereum-payments'
export const DECIMAL_PLACES = 18

export const DEFAULT_FULL_NODE = process.env.ETH_FULL_NODE_URL
export const DEFAULT_SOLIDITY_NODE = process.env.ETH_SOLIDITY_NODE_URL
export const DEFAULT_EVENT_SERVER = process.env.ETH_EVENT_SERVER_URL
export const DEFAULT_FEE_LEVEL = FeeLevel.Medium

export const MIN_CONFIRMATIONS = 0
export const DEFAULT_GAS_PRICE_IN_WEI = '50000000000'
export const GAS_STATION_URL = 'https://ethgasstation.info'

// The following are effective maximum gas amounts for various txs we send
export const ETHEREUM_TRANSFER_COST = '50000'
export const CONTRACT_DEPLOY_COST = '285839'
export const TOKEN_SWEEP_COST = '816630'
export const TOKEN_TRANSFER_COST = '250000'

/** Multiply all web3 estimateGas calls by this because it's innacurate */
export const GAS_ESTIMATE_MULTIPLIER = 1.5

export const GAS_STATION_FEE_SPEED = {
  [FeeLevel.Low]: 'safeLow',
  [FeeLevel.Medium]: 'average',
  [FeeLevel.High]: 'fast',
}
export const MAXIMUM_GAS: { [a in EthTxType]: string} = {
  'ETHEREUM_TRANSFER': ETHEREUM_TRANSFER_COST,
  'CONTRACT_DEPLOY': CONTRACT_DEPLOY_COST,
  'TOKEN_SWEEP': TOKEN_SWEEP_COST,
  'TOKEN_TRANSFER': TOKEN_TRANSFER_COST,
}

export const TOKEN_WALLET_DATA: string = '0x608060405234801561001057600080fd5b5060008054600160a060020a03191633179055610361806100326000396000f3fe6080604052600436106100565763ffffffff7c0100000000000000000000000000000000000000000000000000000000600035041663893d20e88114610065578063b8dc491b14610096578063f8b2cb4f146100e3575b34801561006257600080fd5b50005b34801561007157600080fd5b5061007a610116565b60408051600160a060020a039092168252519081900360200190f35b3480156100a257600080fd5b506100d1600480360360408110156100b957600080fd5b50600160a060020a0381358116916020013516610125565b60408051918252519081900360200190f35b3480156100ef57600080fd5b506100d16004803603602081101561010657600080fd5b5035600160a060020a031661029a565b600054600160a060020a031690565b60008054600160a060020a0316331461013d57600080fd5b604080517f70a0823100000000000000000000000000000000000000000000000000000000815230600482015290518491600091600160a060020a038416916370a08231916024808301926020929190829003018186803b1580156101a157600080fd5b505afa1580156101b5573d6000803e3d6000fd5b505050506040513d60208110156101cb57600080fd5b5051604080517fa9059cbb000000000000000000000000000000000000000000000000000000008152600160a060020a0387811660048301526024820184905291519293509084169163a9059cbb9160448082019260009290919082900301818387803b15801561023b57600080fd5b505af115801561024f573d6000803e3d6000fd5b5050604080518481529051600160a060020a03881693507f69ca02dd4edd7bf0a4abb9ed3b7af3f14778db5d61921c7dc7cd545266326de292509081900360200190a2505092915050565b604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905160009183918391600160a060020a038416916370a0823191602480820192602092909190829003018186803b15801561030157600080fd5b505afa158015610315573d6000803e3d6000fd5b505050506040513d602081101561032b57600080fd5b505194935050505056fea165627a7a72305820208e3823e2f34bf7d4ef9c9dfbc5bd04b857b8b748327eb069cab8fcb20370660029'

export const TOKEN_WALLET_ABI = JSON.parse(
'[{"constant":true,"inputs":[],"name":"getOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"erc20TokenSale","type":"address"},{"name":"to","type":"address"}],"name":"sweep","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"erc20TokenSale","type":"address"}],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":false,"stateMutability":"nonpayable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"}]'
)

export const TOKEN_METHODS_ABI = JSON.parse(
  '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"data","type":"bytes"}],"name":"Transfer","type":"event"}]'
)

export const DEPOSIT_KEY_INDEX = 2

export const PUBLIC_CONFIG_OMIT_FIELDS = ['logger', 'fullNode', 'solidityNode', 'eventServer', 'keyPairs', 'hdKey', 'providerOptions', 'web3']
