import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';
import type { WritableSignal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { HttpErrorResponse } from '@angular/common/http';
import { RecoveryApiService } from '../../../settings/services/recovery-api.service';
import type { LoginQuestion, ReadQuestionsForLoginResponse, CheckAnswerResponse } from '../../../settings/services/recovery-api.service';

/** Шаг восстановления */
type RecoveryStep = 'uin' | 'answer' | 'password';

/** Экран восстановления пароля */
@Component({
  imports: [FormsModule],
  selector: 'application-recovery',
  templateUrl: './recovery.component.html',
  styleUrl: './recovery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecoveryApplicationComponent {
  /** Текущий шаг */
  public readonly step: WritableSignal<RecoveryStep> = signal('uin');

  /** UIN введённый пользователем */
  public readonly uin: WritableSignal<string> = signal('');

  /** Вопросы аккаунта (заполняются после шага 1) */
  public readonly questions: WritableSignal<LoginQuestion[]> = signal([]);

  /** ID аккаунта (из ответа шага 1, нужен для check-answer) */
  public readonly accountId: WritableSignal<string> = signal('');

  /** Выбранный вопрос */
  public readonly selectedQuestion: WritableSignal<LoginQuestion | null> = signal(null);

  /** Ответ */
  public readonly answer: WritableSignal<string> = signal('');

  /** reset_token из check-answer (нужен для шага 3) */
  public readonly resetToken: WritableSignal<string> = signal('');

  /** Новый пароль */
  public readonly newPassword: WritableSignal<string> = signal('');

  /** Подтверждение нового пароля */
  public readonly confirmPassword: WritableSignal<string> = signal('');

  /** Показывать список вопросов */
  public readonly showQuestions: WritableSignal<boolean> = signal(false);

  /** Показывать новый пароль открытым текстом */
  public readonly showNewPassword: WritableSignal<boolean> = signal(false);

  /** Показывать подтверждение пароля открытым текстом */
  public readonly showConfirmPassword: WritableSignal<boolean> = signal(false);

  /** Идёт API-запрос */
  public readonly loading: WritableSignal<boolean> = signal(false);

  /** Сообщение об ошибке текущего шага */
  public readonly errorMessage: WritableSignal<string | null> = signal(null);

  /** Кнопка шага 1 активна */
  public readonly isStep1Valid: Signal<boolean> = computed((): boolean => this.uin().trim().length >= 4);

  /** Кнопка шага 2 активна */
  public readonly isStep2Valid: Signal<boolean> = computed(
    (): boolean => this.selectedQuestion() !== null && this.answer().trim().length > 0,
  );

  /** Кнопка шага 3 активна */
  public readonly isStep3Valid: Signal<boolean> = computed(
    (): boolean => this.newPassword().length >= 8 && this.newPassword() === this.confirmPassword(),
  );

  /** Роутер для навигации */
  private readonly _router: Router = inject(Router);

  /** API восстановления */
  private readonly _recoveryApi: RecoveryApiService = inject(RecoveryApiService);

  /** Шаг 1: получить вопросы аккаунта по UIN. */
  public submitUin(): void {
    if (!this.isStep1Valid() || this.loading()) return;
    this.errorMessage.set(null);
    this.loading.set(true);

    this._recoveryApi.readQuestionsForLogin(this.uin().trim()).subscribe({
      next: (res: ReadQuestionsForLoginResponse): void => {
        this.accountId.set(res.account_id);
        this.questions.set(res.questions);
        this.answer.set('');
        this.selectedQuestion.set(null);
        this.loading.set(false);
        this.step.set('answer');
      },
      error: (err: HttpErrorResponse): void => {
        this.loading.set(false);
        /* eslint-disable @typescript-eslint/no-unsafe-member-access -- HTTP error body */
        if (err.status === 404 && err.error?.code === 'recovery_not_configured') {
          this.errorMessage.set('Для этого аккаунта не настроено восстановление.');
        } else if (err.status === 423) {
          this.errorMessage.set('Слишком много попыток. Попробуйте позже.');
        } else if (err.status === 404) {
          this.errorMessage.set('Аккаунт не найден.');
        } else {
          this.errorMessage.set('Ошибка соединения. Попробуйте ещё раз.');
        }
        /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      },
    });
  }

  /**
   * Выбрать вопрос из списка.
   * @param q - выбранный вопрос
   */
  public selectQuestion(q: LoginQuestion): void {
    this.selectedQuestion.set(q);
    this.showQuestions.set(false);
  }

  /** Шаг 2: проверить ответ, получить reset_token. */
  public submitAnswer(): void {
    const question = this.selectedQuestion();
    if (!this.isStep2Valid() || question === null || this.loading()) return;
    this.errorMessage.set(null);
    this.loading.set(true);

    this._recoveryApi.checkAnswer(this.accountId(), question.id, this.answer().trim()).subscribe({
      next: (res: CheckAnswerResponse): void => {
        this.resetToken.set(res.reset_token);
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.loading.set(false);
        this.step.set('password');
      },
      error: (err: HttpErrorResponse): void => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Неверный ответ.');
        } else if (err.status === 423) {
          this.errorMessage.set('Слишком много попыток. Попробуйте позже.');
        } else {
          this.errorMessage.set('Ошибка соединения. Попробуйте ещё раз.');
        }
      },
    });
  }

  /** Шаг 3: сбросить пароль по reset_token. */
  public submitPassword(): void {
    if (!this.isStep3Valid() || this.loading()) return;
    this.errorMessage.set(null);
    this.loading.set(true);

    this._recoveryApi.resetPassword(this.resetToken(), this.newPassword()).subscribe({
      next: (): void => {
        this.loading.set(false);
        void this._router.navigate(['/application/auth/login']);
      },
      error: (err: HttpErrorResponse): void => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Ссылка восстановления устарела. Начните заново.');
        } else {
          this.errorMessage.set('Ошибка соединения. Попробуйте ещё раз.');
        }
      },
    });
  }

  /** Назад */
  public goBack(): void {
    const current = this.step();
    if (current === 'answer') { this.errorMessage.set(null); this.step.set('uin'); return; }
    if (current === 'password') { this.errorMessage.set(null); this.step.set('answer'); return; }
    void this._router.navigate(['/application/auth/login']);
  }
}
