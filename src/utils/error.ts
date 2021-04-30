export class AppHandledError extends Error {
  public translationKey: string

  constructor (translationKey = '', ...params) {
    super(...params)
    this.name = 'AppHandledError'
    this.translationKey = translationKey
  }
}
