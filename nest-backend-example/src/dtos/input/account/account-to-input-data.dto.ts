import {
  IsDefined,
  IsObject,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { IAccountPure } from '../../../interfaces/pure-and-base/account/account-pure.interface';
import { IAccountUpdate } from '../../../interfaces/with-child/account/account-update.interface';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO для создания аккаунта или авторизации аккаунта */
export class AccountToInputDataDto implements IAccountPure {
  @IsString({
    message: 'Логин аккаунта должен быть строкой',
  })
  @Length(3, 20, {
    message: 'Логин должен быть от 3 до 20 символов',
  })
  @ApiProperty({
    description: 'Логин для аккаунта',
    example: 'Tawer1337',
    type: String,
    minLength: 3,
    maxLength: 20,
  })
  login: string;

  @IsString({
    message: 'Пароль аккаунта должен быть строкой',
  })
  @Length(3, 30, {
    message: 'Пароль должен быть от 3 до 30 символов',
  })
  @ApiProperty({
    description: 'Пароль для аккаунта',
    example: 'my-password@1',
    type: String,
    minLength: 3,
    maxLength: 30,
  })
  password: string;
}

/** Все поля из AccountToInputDataDto становятся опциональными */
export class AccountToUpdateDto extends PartialType(AccountToInputDataDto) {
  @ApiPropertyOptional({
    description: 'Логин для аккаунта (опционально при обновлении)',
    example: 'NewLogin123',
    type: String,
    minLength: 3,
    maxLength: 20,
  })
  login?: string;

  @ApiPropertyOptional({
    description: 'Пароль для аккаунта (опционально при обновлении)',
    example: 'new-password@1',
    type: String,
    minLength: 3,
    maxLength: 30,
  })
  password?: string;
}

/** DTO для обновления аккаунта */
export class AccountToUpdateDataDto implements IAccountUpdate {
  @IsString({ message: 'ID должен быть строкой' })
  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}_[0-9]{13}$/,
    {
      message:
        'ID должен быть в формате uuidv4_unixtime13 (например: 550e8400-e29b-41d4-a716-446655440000_1700000000000)',
    },
  )
  @ApiProperty({
    description:
      'Идентификатор аккаунта, которому требуется установить новые данные',
    example: '09cb7054-3f6d-41f8-8281-94223b63f1c7_1755876784556',
    type: String,
    required: true,
  })
  id: string;

  @IsDefined({ message: 'accountData обязательно' })
  @IsObject({ message: 'accountData должен быть объектом' })
  @ValidateNested()
  @Type(() => AccountToUpdateDto)
  @ApiProperty({
    description: 'Новые данные которые требуется установить аккаунту',
    // example: '09cb7054-3f6d-41f8-8281-94223b63f1c7_1755876784556',
    type: () => AccountToUpdateDto,
    required: true,
  })
  accountData: AccountToUpdateDto;
}
