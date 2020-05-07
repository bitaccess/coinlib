import { FeeLevel } from '@faast/payments-common'

export const PACKAGE_NAME = 'ethereum-payments'
export const DECIMAL_PLACES = 18

export const DEFAULT_FULL_NODE = process.env.ETH_FULL_NODE_URL
export const DEFAULT_SOLIDITY_NODE = process.env.ETH_SOLIDITY_NODE_URL
export const DEFAULT_EVENT_SERVER = process.env.ETH_EVENT_SERVER_URL
export const DEFAULT_FEE_LEVEL = FeeLevel.Medium

export const FEE_LEVEL_MAP: { [key: string]: string } = {
  'low': 'SLOW',
  'medium': 'NORM',
  'high': 'FAST',
}
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

export const SPEED: { [key: string]: string } = {
  SLOW: 'safeLow',
  NORM: 'average',
  FAST: 'fast',
}
export const PRICES: { [key: string]: string } = {
  'ETHEREUM_TRANSFER': ETHEREUM_TRANSFER_COST,
  'CONTRACT_DEPLOY': CONTRACT_DEPLOY_COST,
  'TOKEN_SWEEP': TOKEN_SWEEP_COST,
  'TOKEN_TRANSFER': TOKEN_TRANSFER_COST,
}

// data is pre-compiled code of tokenWallet.sol
// easiest way to get the updated compiled code is by using: https://ethereum.github.io/browser-solidity/
// EIP 155 chainId - mainnet: 1, ropsten: 3
//  chainId: 3
export const TOKEN_WALLET_DATA: string = '0x6060604052341561000f57600080fd5b5b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b5b61031c806100616000396000f3006060604052361561003f576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063b8dc491b14610053575b341561004a57600080fd5b6100515b5b565b005b341561005e57600080fd5b6100a9600480803573ffffffffffffffffffffffffffffffffffffffff1690602001909190803573ffffffffffffffffffffffffffffffffffffffff169060200190919050506100bf565b6040518082815260200191505060405180910390f35b60008060008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614151561011f57600080fd5b8491508173ffffffffffffffffffffffffffffffffffffffff166370a08231306000604051602001526040518263ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001915050602060405180830381600087803b15156101c557600080fd5b6102c65a03f115156101d657600080fd5b5050506040518051905090508173ffffffffffffffffffffffffffffffffffffffff1663a9059cbb85836040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050600060405180830381600087803b151561028457600080fd5b6102c65a03f1151561029557600080fd5b5050508373ffffffffffffffffffffffffffffffffffffffff167f69ca02dd4edd7bf0a4abb9ed3b7af3f14778db5d61921c7dc7cd545266326de2826040518082815260200191505060405180910390a25b5b5050929150505600a165627a7a7230582035a1671476fa4a074f34df3bb78e7f84ee7eb2de3f7e265bf1497483db9f75060029'

export const TOKEN_WALLET_ABI: string = '[{"constant":false,"inputs":[{"name":"erc20TokenSale","type":"address"},{"name":"to","type":"address"}],"name":"sweep","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[],"payable":false,"type":"constructor"},{"payable":false,"type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"}]'

export const DEPOSIT_KEY_INDEX = 20
