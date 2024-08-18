@Library('jenkins-library@feature/DOPS-2516') _

if (env.BRANCH_NAME == "master" || env.BRANCH_NAME == "develop") {
    buildEnvironment = ['VUE_CLI_KEEP_TEST_ATTRS': true]
} else {
    buildEnvironment = [:]
}

cat "/var/jenkins_home/workspace/polkaswap_exchange-web_PR-1497/requestBody"
echo processing
def jsonPayload = readFile file: "/var/jenkins_home/workspace/polkaswap_exchange-web_PR-1497/requestBody"
echo "Payload: ${jsonPayload}"

if (env.GITHUB_EVENT_NAME == 'pull_request') {
  echo "this is pr"
} else {
  // Skip the pipeline
  echo "this is not pr"
}

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'polkaswap/exchange-web',
    buildDockerImage: 'build-tools/node:20-alpine',
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
    sonarSrcPath: 'src',
    sonarTestsPath: 'tests',
    dojoProductType: 'polkaswap',
    movingFiles: [ "*":"./", ".well-known/":"./"]
)
pipeline.runPipeline()
