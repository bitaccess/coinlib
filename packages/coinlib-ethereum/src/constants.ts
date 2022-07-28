import { FeeLevel } from '@bitaccess/coinlib-common'
import { EthTxType, EthereumAddressFormat, NetworkConstants, EthereumPaymentsConfigKeys } from './types'

export const PACKAGE_NAME = 'ethereum-payments'

export const DEFAULT_FEE_LEVEL = FeeLevel.Medium
export const DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0"
export const DEFAULT_DECIMALS = 18

export const DEFAULT_GAS_PRICE_IN_WEI = '50000000000'
export const GAS_STATION_URL = 'https://ethgasstation.info'

// The following are effective maximum gas amounts for various txs we send that we use to limit our estimateGas calls
export const ETHEREUM_TRANSFER_COST = 50000
export const CONTRACT_DEPLOY_COST = 500000
export const TOKEN_SWEEP_COST = 300000
export const TOKEN_TRANSFER_COST = 300000

/** Multiply all web3 estimateGas calls by this because it's innacurate */
export const GAS_ESTIMATE_MULTIPLIER = 1.5

export const MIN_SWEEPABLE_WEI = String(21000 * 10e9) // 21k gas @ 10Gwei: anything below this is dust ($0.2 @ $1200/ETH)

export const GAS_STATION_FEE_SPEED = {
  [FeeLevel.Low]: 'safeLow',
  [FeeLevel.Medium]: 'average',
  [FeeLevel.High]: 'fast',
}
export const MAXIMUM_GAS: { [a in EthTxType]: number } = {
  ETHEREUM_TRANSFER: ETHEREUM_TRANSFER_COST,
  CONTRACT_DEPLOY: CONTRACT_DEPLOY_COST,
  TOKEN_SWEEP: TOKEN_SWEEP_COST,
  TOKEN_TRANSFER: TOKEN_TRANSFER_COST,
}

export const TOKEN_WALLET_DATA_LEGACY: string =
  '0x608060405234801561001057600080fd5b5061032a806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c8063b8dc491b1461002d575b005b61008f6004803603604081101561004357600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506100a5565b6040518082815260200191505060405180910390f35b600073<address of owner>73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146100f357600080fd5b73<address of owner>73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461013f57600080fd5b600083905060008173ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff1660e01b8152600401808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060206040518083038186803b1580156101c357600080fd5b505afa1580156101d7573d6000803e3d6000fd5b505050506040513d60208110156101ed57600080fd5b810190808051906020019092919050505090508173ffffffffffffffffffffffffffffffffffffffff1663a9059cbb85836040518363ffffffff1660e01b8152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050600060405180830381600087803b15801561028757600080fd5b505af115801561029b573d6000803e3d6000fd5b505050508373ffffffffffffffffffffffffffffffffffffffff167f69ca02dd4edd7bf0a4abb9ed3b7af3f14778db5d61921c7dc7cd545266326de2826040518082815260200191505060405180910390a250509291505056fea265627a7a72315820744abee8c455537f572ad5bce76da343e87aad96f4459adbea41be853699b3bb64736f6c63430005110032'

export const TOKEN_WALLET_DATA: string =
  '0x6080604052600080546001600160a01b031916905534801561002057600080fd5b50600080546001600160a01b0319163317905561059e806100426000396000f3fe608060405234801561001057600080fd5b50600436106100565760003560e01c8062f55d9d1461005b5780632c8f55de146100835780638a6d2cc8146100bf578063b416663e146100f8578063beabacc814610175575b600080fd5b6100816004803603602081101561007157600080fd5b50356001600160a01b03166101ab565b005b6100816004803603608081101561009957600080fd5b508035906001600160a01b036020820135811691604081013590911690606001356101ff565b6100dc600480360360208110156100d557600080fd5b50356103b2565b604080516001600160a01b039092168252519081900360200190f35b610100610419565b6040805160208082528351818301528351919283929083019185019080838360005b8381101561013a578181015183820152602001610122565b50505050905090810190601f1680156101675780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6100816004803603606081101561018b57600080fd5b506001600160a01b03813581169160208101359091169060400135610470565b6000546001600160a01b0316156101f35760405162461bcd60e51b81526004018080602001828103825260238152602001806105476023913960400191505060405180910390fd5b806001600160a01b0316ff5b6000546001600160a01b031615610265576000546001600160a01b03163314610265576040805162461bcd60e51b815260206004820152601360248201527239b2b73232b91034b9903737ba1037bbb732b960691b604482015290519081900360640190fd5b606061026f610419565b90506000858251602084016000f590506001600160a01b0381166102da576040805162461bcd60e51b815260206004820152601960248201527f437265617465323a204661696c6564206f6e206465706c6f7900000000000000604482015290519081900360640190fd5b604080516317d5759960e31b81526001600160a01b0387811660048301528681166024830152604482018690529151839283169163beabacc891606480830192600092919082900301818387803b15801561033457600080fd5b505af1158015610348573d6000803e3d6000fd5b50506040805162f55d9d60e01b815233600482015290516001600160a01b038516935062f55d9d9250602480830192600092919082900301818387803b15801561039157600080fd5b505af11580156103a5573d6000803e3d6000fd5b5050505050505050505050565b600060ff816103bf610419565b80516020918201206040805160f89590951b6001600160f81b031916858401523060601b60218601526035850196909652605580850191909152855180850390910181526075909301909452508051920191909120919050565b60408051733d602d80600a3d3981f3363d3d373d3d3d363d7360601b60208201523060601b60348201526e5af43d82803e903d91602b57fd5bf360881b604882015281516037818303018152605790910190915290565b6000546001600160a01b0316156104d6576000546001600160a01b031633146104d6576040805162461bcd60e51b815260206004820152601360248201527239b2b73232b91034b9903737ba1037bbb732b960691b604482015290519081900360640190fd5b6040805163a9059cbb60e01b81526001600160a01b038481166004830152602482018490529151859283169163a9059cbb91604480830192600092919082900301818387803b15801561052857600080fd5b505af115801561053c573d6000803e3d6000fd5b505050505050505056fe6d617374657220636f6e74726163742063616e6e6f742062652064657374726f796564a265627a7a72315820c25d8d6c752e7c31557effc6f9c1c9a9e0e5e870ce370c111d5246f44635baa464736f6c63430005110032'

export const TOKEN_WALLET_ABI = JSON.parse(
  '[{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"constant":true,"inputs":[{"internalType":"uint256","name":"salt","type":"uint256"}],"name":"computeAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"addresspayable","name":"ethDestination","type":"address"}],"name":"destroy","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"getProxyBytecode","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"salt","type":"uint256"},{"internalType":"address","name":"erc20contract","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"proxyTransfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"erc20contract","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]',
)

export const TOKEN_WALLET_ABI_LEGACY = JSON.parse(
  '[{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_to","type":"address"},{"indexed":false,"internalType":"uint256","name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},{"payable":false,"stateMutability":"nonpayable","type":"fallback"},{"constant":false,"inputs":[{"internalType":"address","name":"erc20TokenSale","type":"address"},{"internalType":"address","name":"to","type":"address"}],"name":"sweep","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"}]',
)

export const TOKEN_PROXY_DATA: string =
  '0x3d602d80600a3d3981f3363d3d373d3d3d363d73<address to proxy>5af43d82803e903d91602b57fd5bf3'

export const TOKEN_METHODS_ABI = JSON.parse(
  '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"},{"indexed":false,"name":"data","type":"bytes"}],"name":"Transfer","type":"event"}]',
)

export const DEPOSIT_KEY_INDEX = 0

export const PUBLIC_CONFIG_OMIT_FIELDS: EthereumPaymentsConfigKeys[] = [
  'logger',
  'fullNode',
  'gasStation',
  'keyPairs',
  'hdKey',
  'providerOptions',
  'web3',
  'blockbookNode',
  'blockbookApi',
  'networkConstants',
]

export const DEFAULT_ADDRESS_FORMAT = EthereumAddressFormat.Lowercase

export const FULL_ERC20_TOKEN_METHODS_ABI = JSON.parse(
  '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]',
)

export const BALANCE_ACTIVITY_EVENT = 'activity'

export const DEFAULT_MAINNET_CONSTANTS: Required<NetworkConstants> = {
  networkName: 'Ethereum',
  nativeCoinName: 'ether',
  nativeCoinSymbol: 'ETH',
  nativeCoinDecimals: DEFAULT_DECIMALS,
  defaultDerivationPath: DEFAULT_DERIVATION_PATH,
  chainId: 1,
}

export const DEFAULT_TESTNET_CONSTANTS: Required<NetworkConstants> = {
  networkName: 'Ethereum Ropsten',
  nativeCoinName: 'ropsten ether',
  nativeCoinSymbol: 'ropstenETH',
  nativeCoinDecimals: DEFAULT_DECIMALS,
  defaultDerivationPath: DEFAULT_DERIVATION_PATH,
  chainId: 3,
}

export const WELL_FORMED_HEX_REGEX = /^0x[0-9a-fA-F]*$/
export const ETHEREUM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/
export const ETHEREUM_PUBKEY_REGEX = /^0x[0-9a-f]{66}$/
export const ETHEREUM_PRVKEY_REGEX = /^0x[0-9a-f]{64}$/
