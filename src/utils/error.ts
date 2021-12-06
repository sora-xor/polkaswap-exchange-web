export class AppHandledError extends Error {
  public translationKey: string;
  public translationPayload: any;

  constructor({ key = '', payload = {} } = {}, ...params) {
    super(...params);
    this.name = 'AppHandledError';
    this.translationKey = key;
    this.translationPayload = payload;
  }
}
