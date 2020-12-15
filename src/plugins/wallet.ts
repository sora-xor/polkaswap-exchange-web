import Vue from 'vue'
import Wallet, { dexApi } from '@soramitsu/soraneo-wallet-web'

import * as env from '../../public/env.json'
import store from '@/store'

dexApi.endpoint = env.BLOCKCHAIN_URL

Vue.use(Wallet, { store })
