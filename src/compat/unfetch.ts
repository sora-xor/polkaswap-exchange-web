export default function unfetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  if (typeof fetch !== 'undefined') {
    return fetch(input, init);
  }
  throw new Error('Fetch API is not available in this environment.');
}
