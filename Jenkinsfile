@Library('jenkins-library@feature/SNE-245/DefectDojo-SNE-341') _

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
    secretScannerExclusion: 'Jenkinsfile-UCAN|.*env.json',
    fleekDeployProd: true,
    fleekBranchesProd: ['fleek', 'fleek-pre'],
    copyFileProd: 'env.json',
    fleekDefaultSiteNameProd: 'long-firefly-8047',
    ipfsHashNotificationProd: true,
    ipfsHashChatIDProd: '-1001375555544',
    k8sPrDeploy: true,
    vaultPrPath: "argocd-cc/src/charts/sora2/polkaswap-exchange-web/environments/tachi/",
    vaultUser: "polkaswap-rw",
    vaultCredId: "pswapVaultCreds",
    valuesDestPath: "argocd-cc/src/charts/sora2/polkaswap-exchange-web/",
    devValuesPath: "dev/dev/",
    initialSecretName: "sora2-dev-polkaswap-exchange-polkaswap-exchange-web-eso-base",
    initialNameSpace: "sora2-dev-web",
    targetNameSpace: "sora2-${env.CHANGE_ID}-web",
    targetSecretName: "sora2-${env.CHANGE_ID}-polkaswap-exchange-pr-polkaswap-exchange-web-eso-base",
    downstreamJob: 'polkaswap/e2e-tests/hash_test',
    noIndex: true,
    dojoProductType: 'sora'
)
pipeline.runPipeline()
