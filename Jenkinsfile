@Library('jenkins-library') _

if (env.GIT_BRANCH == "master" || env.GIT_BRANCH == "develop") {
    buildEnvironment = ['NODE_ENV': 'test']
} else {
    buildEnvironment = [:]
}
def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'polkaswap/exchange-web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu-extended',
    dockerRegistryCred: 'bot-polkaswap-rw',
    buildEnvironment: buildEnvironment,
    pushToIPFS: true)
pipeline.runPipeline()
