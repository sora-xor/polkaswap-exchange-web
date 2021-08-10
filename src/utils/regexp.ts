const ws = 'wss?:\\/\\/'
const port = '(?::\\d{1,5})'
const dns = '(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]'
const ipv4part = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)'
const ipv4 = `^${ipv4part}(?:\\.${ipv4part}){3}$`

const exactStart = exp => `^${exp}`
const exact = exp => `^${exp}$`

export const wsRegexp = new RegExp(exactStart(ws))
export const dnsRegexp = new RegExp(exact(`${dns}${port}?/?`))
export const ipv4Regexp = new RegExp(exact(`${ipv4}${port}?/?`))
