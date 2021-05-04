import axios from '@/api'

export const getRpcEndpoint = (wsEndpoint: string): string => {
  // for soramitsu nodes
  if (/^wss:\/\/ws/.test(wsEndpoint)) {
    return wsEndpoint.replace(/^wss:\/\/ws/, 'https://rpc')
  }
  return wsEndpoint.replace(/^ws(s)?:/, 'http$1:')
}

export async function fetchRpc (url: string, method: string, params?: any): Promise<any> {
  const logError = (fnName, arg) => {
    console.error(`${fnName}: argument ${arg} is required`)
    return null
  }

  if (!url) return logError(fetchRpc.name, 'url')
  if (!method) return logError(fetchRpc.name, 'method')

  try {
    const { data } = await axios.post(url, {
      id: 1,
      jsonrpc: '2.0',
      method,
      params
    })

    return data.result
  } catch (error) {
    console.error(error)
    return null
  }
}
