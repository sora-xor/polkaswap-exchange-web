## UCAN token generation script

The script is intended to emit UCAN tokens each 10 days. The output file (token) should be hosted at public route without any risk for the end-users. It will establish secure communication channel between NFT.Storage and Marketplace, and Marketplace and its end-users.

### Setup

Before UCAN token generation it is neccessary to set API*KEY environment variable for this directory. (API_KEY could be get at \_nft.storage/manage* website per account)
After that, installing dependencies is required by running:

```
npm install
```

Once the dependencies are installed it is possible to generate UCAN token. The output file (_ucan.json_) will be located in the same directory where scripts resides.

### UCAN generation

Run the command below to emit this file:

```
node generateNftServiceKeypair.js
```
