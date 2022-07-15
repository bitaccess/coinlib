import Web3 from 'web3'
import { TOKEN_PROXY_DATA } from '../constants'
import { prepend0x, strip0x } from '../utils'

const web3 = new Web3()

// deterministically computes the smart contract deposit address given
// the account the will deploy the contract (factory contract)
// the salt as uint256 and the contract bytecode
export function deriveCreate2Address(creatorAddress: string, salt: string, hashed: boolean = false): string {
  const address = strip0x(creatorAddress).toLowerCase()
  const proxy = strip0x(web3.utils.sha3(TOKEN_PROXY_DATA.replace(/<address to proxy>/g, address))!)
  let saltHash = strip0x((hashed ? salt : web3.utils.sha3(prepend0x(salt))!))
  while (saltHash.length < 64) {
    saltHash = `0${saltHash}`
  }

  return prepend0x(web3.utils.sha3(`0xff${address}${saltHash}${proxy}`)!.slice(-40))
}

