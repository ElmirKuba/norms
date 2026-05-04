import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';
import type { WritableSignal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RECOVERY_PRESET_QUESTIONS } from '../../../settings/types/settings.types';
import type { RecoveryPresetQuestion } from '../../../settings/types/settings.types';

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
  /** Preset-вопросы (мок) */
  public readonly presetQuestions: RecoveryPresetQuestion[] = RECOVERY_PRESET_QUESTIONS;

  /** Текущий шаг */
  public readonly step: WritableSignal<RecoveryStep> = signal('uin');

  /** UIN введённый пользователем */
  public readonly uin: WritableSignal<string> = signal('');

  /** Выбранный вопрос */
  public readonly selectedQuestion: WritableSignal<RecoveryPresetQuestion | null> = signal(null);

  /** Ответ */
  public readonly answer: WritableSignal<string> = signal('');

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

  /** Шаг 1 → 2 */
  public submitUin(): void {
    if (!this.isStep1Valid()) return;
    this.step.set('answer');
    this.answer.set('');
    this.selectedQuestion.set(null);
  }

  /**
   * Выбрать вопрос.
   * @param q - выбранный preset-вопрос
   */
  public selectQuestion(q: RecoveryPresetQuestion): void {
    this.selectedQuestion.set(q);
    this.showQuestions.set(false);
  }

  /** Шаг 2 → 3 */
  public submitAnswer(): void {
    if (!this.isStep2Valid()) return;
    this.step.set('password');
  }

  /** Шаг 3 → завершение (мок) */
  public submitPassword(): void {
    if (!this.isStep3Valid()) return;
    void this._router.navigate(['/application/auth/login']);
  }

  /** Назад */
  public goBack(): void {
    const current = this.step();
    if (current === 'answer') { this.step.set('uin'); return; }
    if (current === 'password') { this.step.set('answer'); return; }
    void this._router.navigate(['/application/auth/login']);
  }
}
