import { LocalDbService } from './local-db.service';

/** Заглушка LocalDbService для веб-платформы — чаты в браузере недоступны. */
export class LocalDbWebService extends LocalDbService {
  /** @inheritdoc */
  public initialize(_accountId: string): Promise<void> {
    return Promise.resolve();
  }

  /** @inheritdoc */
  public run(_sql: string, _params?: readonly unknown[]): Promise<void> {
    return Promise.resolve();
  }

  /** @inheritdoc */
  public all<T>(_sql: string, _params?: readonly unknown[]): Promise<readonly T[]> {
    return Promise.resolve([]);
  }

  /** @inheritdoc */
  public get<T>(_sql: string, _params?: readonly unknown[]): Promise<T | undefined> {
    return Promise.resolve(undefined);
  }
}
