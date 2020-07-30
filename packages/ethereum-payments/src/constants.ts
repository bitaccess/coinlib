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

export const TOKEN_WALLET_DATA: string = '0x608060405234801561001057600080fd5b5061032a806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063b8dc491b1461002d575b005b61008f6004803603604081101561004357600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506100a5565b6040518082815260200191505060405180910390f35b600073<address of owner>73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146100f357600080fd5b73<address of owner>73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461013f57600080fd5b600083905060008173ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060206040518083038186803b1580156101c357600080fd5b505afa1580156101d7573d6000803e3d6000fd5b505050506040513d60208110156101ed57600080fd5b810190808051906020019092919050505090508173ffffffffffffffffffffffffffffffffffffffff1663a9059cbb85836040518363ffffffff1660e01b8152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050600060405180830381600087803b15801561028757600080fd5b505af115801561029b573d6000803e3d6000fd5b505050508373ffffffffffffffffffffffffffffffffffffffff167f69ca02dd4edd7bf0a4abb9ed3b7af3f14778db5d61921c7dc7cd545266326de2826040518082815260200191505060405180910390a250509291505056fea265627a7a72315820744abee8c455537f572ad5bce76da343e87aad96f4459adbea41be853699b3bb64736f6c63430005110032'

export const TOKEN_WALLET_ABI = JSON.parse(
'[{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_to","type":"address"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"payable":false,"stateMutability":"nonpayable","type":"fallback"},{"constant":false,"inputs":[{"internalType":"address","name":"erc20TokenSale","type":"address"},{"internalType":"address","name":"to","type":"address"}],"name":"sweep","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"}]'
)

export const TOKEN_PROXY_DATA: string = '0x3d602d80600a3d3981f3363d3d373d3d3d363d73<address to proxy>5af43d82803e903d91602b57fd5bf3'

export const TOKEN_METHODS_ABI = JSON.parse(
  '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"data","type":"bytes"}],"name":"Transfer","type":"event"}]'
)

export const DEPOSIT_KEY_INDEX = 2

export const PUBLIC_CONFIG_OMIT_FIELDS = ['logger', 'fullNode', 'solidityNode', 'eventServer', 'keyPairs', 'hdKey', 'providerOptions', 'web3']
