import { Injectable, Inject, BadRequestException, NotFoundException, GoneException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import type { Platform } from '../../common/types/platform.type';
import { generateRefreshToken } from '../../common/utils/crypto.util';
import { generateId } from '../../common/utils/id.util';
import { DRIZZLE_DB } from '../../persistence/drizzle.module';
import type { DrizzleDb, DrizzleTransaction } from '../../persistence/drizzle.module';
import { accounts, sessions, invites, referrals } from '../../persistence/schemas';
import { UinService } from '../../uin/uin.service';
import type { CreateAccountDto } from '../dto/create-account.dto';

/** Данные аккаунта в ответе на регистрацию. */
interface CreateAccountResponseAccount {
  /** ID аккаунта. */
  readonly id: string;
  /** UIN — null до асинхронного назначения очередью. */
  readonly uin: null;
  /** Юзернейм. */
  readonly username: string | null;
  /** Начальное количество инвайтов. */
  readonly invites_remaining: number;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}

/** Данные сессии в ответе на регистрацию. */
interface CreateAccountResponseSession {
  /** ID сессии. */
  readonly id: string;
  /** Системное имя устройства. */
  readonly system_name: string;
  /** Платформа. */
  readonly platform: Platform;
  /** JWT access-токен. */
  readonly access_token: string;
  /** Opaque refresh-токен (возвращается один раз). */
  readonly refresh_token: string;
}

/** Форма ответа метода execute. */
interface CreateAccountResult {
  /** Данные созданного аккаунта. */
  readonly account: CreateAccountResponseAccount;
  /** Данные созданной сессии с токенами. */
  readonly session: CreateAccountResponseSession;
}

/** Данные, возвращаемые из транзакции. */
interface TransactionResult {
  /** ID аккаунта. */
  readonly accountId: string;
  /** Юзернейм аккаунта. */
  readonly accountUsername: string | null;
  /** Количество оставшихся инвайтов. */
  readonly accountInvitesRemaining: number;
  /** Дата создания аккаунта. */
  readonly accountCreatedAt: Date;
  /** ID сессии. */
  readonly sessionId: string;
  /** Системное имя устройства. */
  readonly sessionSystemName: string;
  /** Платформа устройства. */
  readonly sessionPlatform: Platform;
}

/** Use-case регистрации нового аккаунта — атомарная транзакция инвайт + аккаунт + сессия. */
@Injectable()
export class CreateAccountUseCase {
  public constructor(
    @Inject(DRIZZLE_DB) private readonly _db: DrizzleDb,
    private readonly _config: ConfigService,
    private readonly _jwtService: JwtService,
    private readonly _uinService: UinService,
  ) {}

  /**
   * Регистрирует аккаунт, потребляет инвайт и создаёт первую сессию.
   * @param dto - Данные регистрации.
   * @returns Данные аккаунта и сессии с токенами.
   * @throws BadRequestException если инвайт-код обязателен но не передан.
   * @throws NotFoundException если инвайт-код не найден.
   * @throws GoneException если инвайт-код истёк.
   * @throws ConflictException если инвайт-код уже был использован (race condition).
   */
  public async execute(dto: CreateAccountDto): Promise<CreateAccountResult> {
    const freeReg = this._config.get<string>('FEATURE_FREE_REGISTRATION', 'false') === 'true';
    const inviteCode: string | null = dto.invite_code ?? null;

    if (!freeReg && inviteCode === null) {
      throw new BadRequestException({
        code: 'invite_required',
        message: 'Код приглашения обязателен',
      });
    }

    const passwordHash = await argon2.hash(dto.password);
    const { raw: rawRefresh, hash: refreshHash } = generateRefreshToken();

    const result = await this._db.transaction(
      async (tx: DrizzleTransaction): Promise<TransactionResult> => {
        let inviteAccountId: string | null = null;

        if (!freeReg && inviteCode !== null) {
          const inviteRows = await tx
            .select()
            .from(invites)
            .where(eq(invites.code, inviteCode))
            .limit(1);

          const invite = inviteRows[0];
          if (invite === undefined) {
            throw new NotFoundException({ code: 'invite_not_found', message: 'Инвайт не найден' });
          }
          if (invite.expiresAt < new Date()) {
            throw new GoneException({ code: 'invite_expired', message: 'Инвайт истёк' });
          }

          const deletedRows = await tx
            .delete(invites)
            .where(eq(invites.id, invite.id))
            .returning({ id: invites.id });

          if (deletedRows.length === 0) {
            throw new ConflictException({
              code: 'invite_already_used',
              message: 'Инвайт уже был использован',
            });
          }

          inviteAccountId = invite.accountId;
        }

        const accountRows = await tx
          .insert(accounts)
          .values({
            id: generateId(),
            passwordHash,
            username: null,
            invitesRemaining: 3,
            isAdmin: false,
          })
          .returning();

        const account = accountRows[0];
        if (account === undefined) {
          throw new Error('INSERT account не вернул строк');
        }

        if (inviteAccountId !== null) {
          await tx.insert(referrals).values({
            id: generateId(),
            inviterId: inviteAccountId,
            inviteeId: account.id,
          });
        }

        const sessionRows = await tx
          .insert(sessions)
          .values({
            id: generateId(),
            accountId: account.id,
            systemName: dto.system_name,
            platform: dto.platform,
            nickname: null,
            refreshTokenHash: refreshHash,
          })
          .returning();

        const session = sessionRows[0];
        if (session === undefined) {
          throw new Error('INSERT session не вернул строк');
        }

        return {
          accountId: account.id,
          accountUsername: account.username,
          accountInvitesRemaining: account.invitesRemaining,
          accountCreatedAt: account.createdAt,
          sessionId: session.id,
          sessionSystemName: session.systemName,
          sessionPlatform: session.platform,
        };
      },
    );

    await this._uinService.enqueueGeneration(result.accountId);

    const accessToken = await this._jwtService.signAsync({
      sub: result.accountId,
      sessionId: result.sessionId,
      platform: result.sessionPlatform,
      isAdmin: false,
    });

    return {
      account: {
        id: result.accountId,
        uin: null,
        username: result.accountUsername,
        invites_remaining: result.accountInvitesRemaining,
        created_at: result.accountCreatedAt.toISOString(),
      },
      session: {
        id: result.sessionId,
        system_name: result.sessionSystemName,
        platform: result.sessionPlatform,
        access_token: accessToken,
        refresh_token: rawRefresh,
      },
    };
  }
}
