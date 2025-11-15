@Library('jenkins-library')
def pipeline = new org.js.LibPipeline(
    steps:                this,
    packageManager:       'yarn',
    buildDockerImage:     'build-tools/node:20-ubuntu-cypress',
    npmLoginEmail:        'admin@soramitsu.co.jp',
    dockerFileName:       'next.Dockerfile',
    dockerImageName:      'soramitsu/soramitsu-js-ui-library',
    testCmds:             ['yarn test:all'],
    pushCmds:             ['yarn publish-workspaces --no-verify-access'],
    libPushBranches:      ['next'],
    dockerImageTags:      ['next':'next-serve'],
    libExamplesBuildCmds: ['yarn sb:build']
)
pipeline.runPipeline()
