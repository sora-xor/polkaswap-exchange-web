@Library('jenkins-library') _

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'polkaswap/exchange-web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu',
    dockerRegistryCred: 'bot-polkaswap-rw',
    pushToIPFS: true)
pipeline.runPipeline()
