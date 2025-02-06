import axiosInstance from '@/api';

export const getRpcEndpoint = (wsEndpoint: string): string => {
  return wsEndpoint.replace(/^ws(s)?:/, 'http$1:');
};

export async function fetchRpc(url: string, method: string, params?: any): Promise<any> {
  const throwError = (fnName, arg) => {
    throw new Error(`${fnName}: argument ${arg} is required`);
  };

  if (!url) return throwError(fetchRpc.name, 'url');
  if (!method) return throwError(fetchRpc.name, 'method');

  const { data } = await axiosInstance.post(url, {
    id: 1,
    jsonrpc: '2.0',
    method,
    params,
  });

  return data.result;
}
