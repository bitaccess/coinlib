import * as Stellar from 'stellar-sdk'
import StellarHD from 'stellar-hd-wallet'

import { setupTestnetPayments } from './utils'

async function main() {
  const payments = await setupTestnetPayments()
  const address = StellarHD.fromSeed('0').getPublicKey(123)
  return payments.getApi().loadAccount(address)
}

main()
  .then((result: any) => {
    if (result) console.log(result)
  })
  .catch(console.error)
