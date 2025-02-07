# analog-bridge-frontend

## Project deploy info
There is `public/env.json` file which contains `DEFAULT_NETWORKS` variables.

`DEFAULT_NETWORKS` variable has the following format:

```
"DEFAULT_NETWORKS": [
    {
        "chain": "Analog Timechain",
        "name": "Analog",
        "address": "wss://rpc-sora.development.analog.one"
    }
]
```

`"chain"` is used as the chain name.
`"name"` is used as the node name.
`"address"` is used for the address of the node to which the frontend project will be connected.

`DEFAULT_NETWORKS[0]` must be a trusted node. App used it's `genesisHash` to check custom user node for connection

`CHAIN_GENESIS_HASH` should be defined for 'prod' environments, to not polling nodes for getting it (because genesis hash for these env's not changing).

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

### Run all tests
```
yarn test:all
```

### Lints and fixes files
```
yarn lint
```

## Desktop scripts

### Compiles and hot-reloads for development
```
yarn electron:serve
```

### Compiles and minifies for production
```
yarn electron:build
```

### Build for all platforms

```
yarn electron:build --linux --mac zip dmg --win portable --x64 --ia32
```

Executable files (`.exe`, `.dmg` or `.snap`) will be located in `dist_electron` folder.


## How to add translations?
1) Add your translations to `src/lang/messages.ts`.
2) Run script to generate `en.json` file from `src/lang/messages.ts`. This will update `en.json` file with new translations, arranged in alphabetical order.
```
yarn lang:generate
```
3) Load updated `en.json` file to `Lokalise`.
4) Add translations for other languages in `Localise`.
5) Download translations from `Localise`, update these files in project.
6) Run script to order translations alphabetical in `en.json` file (Localise has it's own translations order).
```
yarn lang:fix
```