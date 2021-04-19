export const getRpcEndpoint = (wsEndpoint: string): string => {
  return wsEndpoint.replace(/^wss:\/\/ws/, 'https://rpc')
}

export async function fetchRpc (url: string, method: string, params?: any): Promise<any> {
  const logError = (fnName, arg) => {
    console.error(`${fnName}: argument ${arg} is required`)
    return null
  }

  if (!url) return logError(fetchRpc.name, 'url')
  if (!method) return logError(fetchRpc.name, 'method')

  try {
    const response = await (window as any).fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method,
        params
      })
    })

    const data = await response.json()

    return data.result
  } catch (error) {
    console.error(error)
    return null
  }
}
