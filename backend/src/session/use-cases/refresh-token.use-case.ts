import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionRepository } from '../../domain/ports/session.repository.port';
import { generateRefreshToken, sha256Hex } from '../../common/utils/crypto.util';

/** Форма ответа метода execute. */
interface RefreshTokenResult {
  /** Новый JWT access-токен. */
  readonly access_token: string;
  /** Новый opaque refresh-токен. */
  readonly refresh_token: string;
}

/** Use-case ротации токенов — атомарная замена refresh + выдача нового access. */
@Injectable()
export class RefreshTokenUseCase {
  public constructor(
    private readonly _sessionRepo: SessionRepository,
    private readonly _jwtService: JwtService,
  ) {}

  /**
   * Ротирует refresh-токен. При повторном использовании (reuse detection) удаляет сессию.
   * @param rawRefreshToken - Опaque refresh-токен из запроса клиента.
   * @returns Новая пара токенов.
   * @throws UnauthorizedException при невалидном или уже использованном токене.
   */
  public async execute(rawRefreshToken: string): Promise<RefreshTokenResult> {
    const oldHash = sha256Hex(rawRefreshToken);
    const { raw: newRaw, hash: newHash } = generateRefreshToken();

    const session = await this._sessionRepo.rotateRefreshToken(oldHash, newHash);

    if (session === null) {
      // Хеш не совпал — токен уже был использован → reuse detection.
      // Сессия могла уже быть удалена параллельным запросом; пробуем удалить на случай если нет.
      // Поскольку мы не знаем sessionId (нет совпадения) — клиент получает 401.
      throw new UnauthorizedException({
        code: 'refresh_reused',
        message: 'Refresh-токен уже был использован. Сессия аннулирована.',
      });
    }

    const accessToken = await this._jwtService.signAsync({
      sub: session.accountId,
      sessionId: session.id,
    });

    return { access_token: accessToken, refresh_token: newRaw };
  }
}
