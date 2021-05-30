# polkaswap-exchange-web

## Project deploy info
There is `public/env.json` file which contains `BASE_API_URL` and `DEFAULT_NETWORKS` variables.

`BASE_API_URL` will be used for the address of the current stand.

`DEFAULT_NETWORKS` variable has the following format:

```
"DEFAULT_NETWORKS": [
    {
        "chain": "SORA-staging Testnet",
        "name": "SORA",
        "address": "wss://ws.stage.sora2.soramitsu.co.jp"
    }
]
```

`"chain"` is used as the chain name.
`"name"` is used as the node name.
`"address"` is used for the address of the node to which the frontend project will be connected.

`DEFAULT_NETWORKS[0]` must be a Soramitsu trusted node. App used it's `genesisHash` to check custom user node for connection

## Project setup
```
yarn install
```

### Compiles and hot-reloads for development
```
yarn serve
```

### Compiles and minifies for production
```
yarn build
```

### Run your unit tests
```
yarn test:unit
```

### Run your end-to-end tests
```
yarn test:e2e
```

### Lints and fixes files
```
yarn lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
