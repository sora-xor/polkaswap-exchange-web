@Library('jenkins-library') _

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'noir/exchange-web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu',
    dockerRegistryCred: 'bot-noir-rw',
    pushToIPFS: true,
    dockerImageTags: ['noir-exchange':'latest'])
pipeline.runPipeline()
