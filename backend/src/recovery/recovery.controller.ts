import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { GetPresetQuestionsUseCase } from './use-cases/get-preset-questions.use-case';
import { CreateQuestionUseCase } from './use-cases/create-question.use-case';
import { ReadQuestionsUseCase } from './use-cases/read-questions.use-case';
import { UpdateQuestionUseCase } from './use-cases/update-question.use-case';
import { DeleteQuestionUseCase } from './use-cases/delete-question.use-case';
import { ReadQuestionsForLoginUseCase } from './use-cases/read-questions-for-login.use-case';
import { CheckAnswerUseCase } from './use-cases/check-answer.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CheckAnswerDto } from './dto/check-answer.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

/** Контроллер восстановления доступа: Q/A CRUD и поток сброса пароля. */
@Controller('recovery')
export class RecoveryController {
  public constructor(
    private readonly _getPresetQuestionsUseCase: GetPresetQuestionsUseCase,
    private readonly _createQuestionUseCase: CreateQuestionUseCase,
    private readonly _readQuestionsUseCase: ReadQuestionsUseCase,
    private readonly _updateQuestionUseCase: UpdateQuestionUseCase,
    private readonly _deleteQuestionUseCase: DeleteQuestionUseCase,
    private readonly _readQuestionsForLoginUseCase: ReadQuestionsForLoginUseCase,
    private readonly _checkAnswerUseCase: CheckAnswerUseCase,
    private readonly _resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  /**
   * Возвращает статический список пресет-вопросов (публичный).
   * @returns Массив { id, text }.
   */
  @Get('preset-questions')
  public getPresetQuestions(): ReturnType<GetPresetQuestionsUseCase['execute']> {
    return this._getPresetQuestionsUseCase.execute();
  }

  /**
   * Создаёт новую Q/A пару для текущего аккаунта.
   * @param user - Payload текущего JWT.
   * @param dto - Вопрос и ответ.
   * @returns Созданный вопрос (id, question, created_at).
   */
  @Post('question/create')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.CREATED)
  public createQuestion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateQuestionDto,
  ): ReturnType<CreateQuestionUseCase['execute']> {
    return this._createQuestionUseCase.execute(user.sub, dto);
  }

  /**
   * Возвращает список Q/A текущего аккаунта (без хешей ответов).
   * @param user - Payload текущего JWT.
   * @returns Массив { id, question, created_at, updated_at }.
   */
  @Get('question/read-list')
  @UseGuards(JwtGuard)
  public readQuestions(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<ReadQuestionsUseCase['execute']> {
    return this._readQuestionsUseCase.execute(user.sub);
  }

  /**
   * Обновляет вопрос и/или ответ Q/A пары.
   * @param user - Payload текущего JWT.
   * @param id - ID вопроса.
   * @param dto - Новые значения.
   * @returns Промис без значения.
   */
  @Patch('question/update/:id')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public updateQuestion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ): ReturnType<UpdateQuestionUseCase['execute']> {
    return this._updateQuestionUseCase.execute(user.sub, id, dto);
  }

  /**
   * Удаляет Q/A пару по ID.
   * @param user - Payload текущего JWT.
   * @param id - ID вопроса.
   * @returns Промис без значения.
   */
  @Delete('question/delete/:id')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public deleteQuestion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): ReturnType<DeleteQuestionUseCase['execute']> {
    return this._deleteQuestionUseCase.execute(user.sub, id);
  }

  /**
   * Возвращает список вопросов аккаунта для экрана «Забыл пароль» (публичный).
   * @param login - UIN или username (query param).
   * @returns account_id и список вопросов без хешей.
   */
  @Get('read-questions-for-login')
  public readQuestionsForLogin(
    @Query('login') login: string,
  ): ReturnType<ReadQuestionsForLoginUseCase['execute']> {
    return this._readQuestionsForLoginUseCase.execute(login);
  }

  /**
   * Проверяет ответ на секретный вопрос. При успехе выдаёт reset_token (TTL 10 мин).
   * @param dto - account_id, question_id, answer.
   * @returns { reset_token, expires_at }.
   */
  @Post('check-answer')
  public checkAnswer(
    @Body() dto: CheckAnswerDto,
  ): ReturnType<CheckAnswerUseCase['execute']> {
    return this._checkAnswerUseCase.execute(dto);
  }

  /**
   * Сбрасывает пароль по одноразовому reset_token.
   * @param dto - reset_token и новый пароль.
   * @returns Промис без значения.
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  public resetPassword(
    @Body() dto: ResetPasswordDto,
  ): ReturnType<ResetPasswordUseCase['execute']> {
    return this._resetPasswordUseCase.execute(dto);
  }
}
