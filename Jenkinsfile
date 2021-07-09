@Library('jenkins-library@feature/DOPS-1380') _

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'polkaswap/exchange-web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu',
    dockerRegistryCred: 'bot-polkaswap-rw',
    pushToIPFS: true,
    ipfsProjectID: ipfsProjectID,
    ipfsProjectSecret: ipfsProjectSecret)
pipeline.runPipeline()
