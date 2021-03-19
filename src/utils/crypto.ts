import { AES, enc } from 'crypto-js'

// TODO: add random generator and think how to store it
const key = 'U2FsdGVkX18ZUVvShFSES21qHsQEqZXMxQ9zgHy'

export const encrypt = (message: string) => AES.encrypt(message, key).toString()

export const decrypt = (message: string) => AES.decrypt(message, key).toString(enc.Utf8)
