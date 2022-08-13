@Library('jenkins-library') _

if (env.BRANCH_NAME == "master" || env.BRANCH_NAME == "develop") {
    buildEnvironment = ['VUE_CLI_KEEP_TEST_ATTRS': true]
} else {
    buildEnvironment = [:]
}

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'adar/web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu-extended',
    dockerRegistryCred: 'bot-polkaswap-rw',
    buildEnvironment: buildEnvironment,
    sonarProjectName: 'adar-web',
    sonarProjectKey: 'jp.co.soramitsu:adar-web',
    copyStaticToBranch: true,
    copyToBranches: ['fleek-pre', 'fleek'],
    copyFile: 'env.json',
    stageDeploy: true,
    downstreamJob: '../deploy/web-stage1')
pipeline.runPipeline()
