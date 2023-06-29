@Library('jenkins-library@fix/js') _

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'adar/web',
    buildDockerImage: 'docker.soramitsu.co.jp/build-tools/node:14-ubuntu-extended',
    dockerRegistryCred: 'bot-adar-rw',
    // buildEnvironment: buildEnvironment,
    dockerImageTags: ['adar': 'latest', 'adar-dev': 'dev'],
    sonarProjectName: 'adar-web',
    sonarProjectKey: 'jp.co.soramitsu:adar-web',
    fleekDeployProd: true,
    fleekDeployStage: true,
    fleekDefaultSiteNameStage: 'dawn-block-3896',
    fleekDefaultSiteNameProd: 'wild-hat-6209',
    fleekBranchesStage: ['fleek-pre'],
    fleekBranchesProd: ['fleek'],
    copyFileStage: 'env-stage.json',
    copyFileProd: 'env.json',
    ipfsHashNotificationStage: false,
    ipfsHashNotificationProd: false,
    ipfsHashChatIDStage: '',
    ipfsHashChatIDProd: '',
    // ipfsHashChatID: '-1001375555544',
    secretScannerExclusion: '.*env.json\$|.*env-stage.json\$'
)
pipeline.runPipeline()
