import axios from '@/api'

export const getRpcEndpoint = (wsEndpoint: string): string => {
  // for soramitsu nodes
  if (/^wss:\/\/ws\.(?:.+\.)*(sora\.org|sora2\.soramitsu\.co\.jp)\/?$/.test(wsEndpoint)) {
    return wsEndpoint.replace(/^wss:\/\/ws/, 'https://rpc')
  }
  return wsEndpoint.replace(/^ws(s)?:/, 'http$1:')
}

export async function fetchRpc (url: string, method: string, params?: any): Promise<any> {
  const throwError = (fnName, arg) => {
    throw new Error(`${fnName}: argument ${arg} is required`)
  }

  if (!url) return throwError(fetchRpc.name, 'url')
  if (!method) return throwError(fetchRpc.name, 'method')

  const { data } = await axios.post(url, {
    id: 1,
    jsonrpc: '2.0',
    method,
    params
  })

  return data.result
}
