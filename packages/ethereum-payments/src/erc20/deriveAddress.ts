// deterministically computes the smart contract deposit address given
// the account the will deploy the contract (factory contract)
// the salt as uint256 and the contract bytecode
const Web3 = require('web3')
const web3 = new Web3({})
import { deriveSignatory as getSignatory } from '../bip44'
import { EthereumSignatory } from '../types'
import { TOKEN_PROXY_DATA } from '../constants'

export function deriveAddress(creatorAddress: string, salt: string, hashed: boolean = false): string {
  const address = creatorAddress.replace(/0x/, '').toLowerCase()
  const proxy = web3.utils.sha3(TOKEN_PROXY_DATA.replace(/<address to proxy>/g, address))
    .replace(/0x/, '').toLowerCase()
  let saltHash = (hashed ? salt : web3.utils.sha3(`0x${salt}`)).replace(/0x/, '').toLowerCase()
  while (saltHash.length < 64) {
    saltHash = `0${saltHash}`
  }

  return `0x${web3.utils.sha3(`0xff${address}${saltHash}${proxy}`).slice(-40)}`.toLowerCase()
}

