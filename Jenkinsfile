@Library('jenkins-library') _

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'adar/web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu-extended',
    dockerRegistryCred: 'bot-adar-rw',
    copyStaticToBranch: true,
    sonarProjectName:   'adar-web',
    sonarProjectKey:    'jp.co.soramitsu:adar-web',
    stageDeploy: true,
    downstreamJob: '../deploy/web-stage1'
)
pipeline.runPipeline()
