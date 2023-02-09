@Library('jenkins-library') _

if (env.BRANCH_NAME == "master" || env.BRANCH_NAME == "develop") {
    buildEnvironment = ['VUE_CLI_KEEP_TEST_ATTRS': true]
} else {
    buildEnvironment = [:]
}

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'polkaswap/exchange-web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu-extended',
    dockerRegistryCred: 'bot-polkaswap-rw',
    buildEnvironment: buildEnvironment,
    sonarProjectName: 'polkaswap-exchange-web',
    sonarProjectKey: 'jp.co.soramitsu:polkaswap-exchange-web',
    secretScannerExclusion: 'Jenkinsfile-UCAN',
    copyStaticToBranch: true,
    copyToBranches: ['fleek-pre', 'fleek'],
    copyFile: 'env.json',
    ipfsHashNotification: true,
    fleekDefaultSiteName: 'long-firefly-8047',
    ipfsHashChatID: '-1001375555544'
)
pipeline.runPipeline()
