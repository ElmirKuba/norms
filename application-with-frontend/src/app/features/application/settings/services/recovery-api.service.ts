/* eslint-disable @typescript-eslint/naming-convention -- snake_case JSON */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../core/api/api-config';

/** Вопрос аккаунта для экрана «Забыл пароль». */
export interface LoginQuestion {
  /** ID вопроса (используется в check-answer). */
  readonly id: string;
  /** Текст вопроса. */
  readonly question: string;
}

/** Ответ GET /recovery/read-questions-for-login. */
export interface ReadQuestionsForLoginResponse {
  /** ID аккаунта (нужен для check-answer). */
  readonly account_id: string;
  /** Вопросы аккаунта. */
  readonly questions: LoginQuestion[];
}

/** Ответ POST /recovery/check-answer. */
export interface CheckAnswerResponse {
  /** Одноразовый токен для сброса пароля (TTL 10 мин). */
  readonly reset_token: string;
  /** ISO-8601 дата истечения. */
  readonly expires_at: string;
}

/** Пресет-вопрос восстановления от бэка. */
export interface PresetQuestion {
  /** Стабильный ID пресет-вопроса. */
  readonly id: string;
  /** Текст вопроса. */
  readonly text: string;
}

/** Q/A пара из списка своих вопросов. */
export interface RecoveryQuestion {
  /** ID вопроса. */
  readonly id: string;
  /** Текст вопроса. */
  readonly question: string;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
  /** ISO-8601 дата обновления. */
  readonly updated_at: string;
}

/** Ответ на создание Q/A пары. */
export interface CreateRecoveryQuestionResult {
  /** ID созданного вопроса. */
  readonly id: string;
  /** Текст вопроса. */
  readonly question: string;
  /** ISO-8601 дата создания. */
  readonly created_at: string;
}
/* eslint-enable @typescript-eslint/naming-convention */

/** HTTP-клиент для эндпоинтов /recovery/question/*. */
@Injectable({ providedIn: 'root' })
export class RecoveryApiService {
  /** HTTP-клиент для запросов. */
  private readonly _http: HttpClient = inject(HttpClient);

  /** Base URL бэкенда. */
  private readonly _baseUrl: string = inject(API_BASE_URL);

  /**
   * Возвращает статический список пресет-вопросов (GET /recovery/preset-questions).
   * @returns Массив пресет-вопросов.
   */
  public getPresetQuestions(): Observable<PresetQuestion[]> {
    return this._http.get<PresetQuestion[]>(`${this._baseUrl}/recovery/preset-questions`);
  }

  /**
   * Возвращает список своих Q/A пар (GET /recovery/question/read-list).
   * @returns Массив Q/A пар без хешей ответов.
   */
  public readList(): Observable<RecoveryQuestion[]> {
    return this._http.get<RecoveryQuestion[]>(`${this._baseUrl}/recovery/question/read-list`);
  }

  /**
   * Создаёт новую Q/A пару (POST /recovery/question/create).
   * @param question - Текст вопроса.
   * @param answer - Ответ в открытом виде.
   * @returns Созданный вопрос (id, question, created_at).
   */
  public createQuestion(question: string, answer: string): Observable<CreateRecoveryQuestionResult> {
    return this._http.post<CreateRecoveryQuestionResult>(
      `${this._baseUrl}/recovery/question/create`,
      { question, answer },
    );
  }

  /**
   * Обновляет вопрос и ответ (PATCH /recovery/question/update/:id).
   * @param id - ID вопроса.
   * @param question - Новый текст вопроса.
   * @param answer - Новый ответ (обязателен).
   * @returns Пустой Observable.
   */
  public updateQuestion(id: string, question: string, answer: string): Observable<unknown> {
    return this._http.patch(`${this._baseUrl}/recovery/question/update/${id}`, { question, answer });
  }

  /**
   * Удаляет Q/A пару (DELETE /recovery/question/delete/:id).
   * @param id - ID вопроса.
   * @returns Пустой Observable.
   */
  public deleteQuestion(id: string): Observable<unknown> {
    return this._http.delete(`${this._baseUrl}/recovery/question/delete/${id}`);
  }

  /**
   * Возвращает вопросы аккаунта для флоу восстановления (GET /recovery/read-questions-for-login).
   * @param login - UIN или username.
   * @returns account_id + список вопросов аккаунта.
   */
  public readQuestionsForLogin(login: string): Observable<ReadQuestionsForLoginResponse> {
    return this._http.get<ReadQuestionsForLoginResponse>(
      `${this._baseUrl}/recovery/read-questions-for-login?login=${encodeURIComponent(login)}`,
    );
  }

  /**
   * Проверяет ответ на вопрос (POST /recovery/check-answer).
   * @param accountId - ID аккаунта.
   * @param questionId - ID вопроса.
   * @param answer - Ответ в открытом виде.
   * @returns reset_token + expires_at.
   */
  public checkAnswer(accountId: string, questionId: string, answer: string): Observable<CheckAnswerResponse> {
    /* eslint-disable @typescript-eslint/naming-convention -- snake_case API fields */
    return this._http.post<CheckAnswerResponse>(`${this._baseUrl}/recovery/check-answer`, {
      account_id: accountId,
      question_id: questionId,
      answer,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }

  /**
   * Сбрасывает пароль по reset_token (POST /recovery/reset-password).
   * @param resetToken - Одноразовый токен из check-answer.
   * @param newPassword - Новый пароль.
   * @returns Пустой Observable.
   */
  public resetPassword(resetToken: string, newPassword: string): Observable<unknown> {
    /* eslint-disable @typescript-eslint/naming-convention -- snake_case API fields */
    return this._http.post(`${this._baseUrl}/recovery/reset-password`, {
      reset_token: resetToken,
      new_password: newPassword,
    });
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}
