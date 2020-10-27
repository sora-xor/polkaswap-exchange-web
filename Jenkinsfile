@Library('jenkins-library' ) _

def pipeline = new org.js.AppPipeline(steps: this,
    dockerImageName: 'polkaswap/exchange-web',
    dockerRegistryCred: 'bot-polkaswap-rw')
pipeline.runPipeline()
