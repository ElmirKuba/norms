import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MOCK_RECOVERY_QA, RECOVERY_PRESET_QUESTIONS } from '../../types/settings.types';
import type { MockRecoveryQA, RecoveryPresetQuestion } from '../../types/settings.types';

/** Подэкран настроек — Восстановление доступа */
@Component({
  imports: [FormsModule],
  selector: 'application-settings-recovery',
  templateUrl: './recovery-questions.component.html',
  styleUrl: './recovery-questions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRecoveryQuestionsComponent {
  private readonly _router: Router = inject(Router);

  /** Preset-вопросы */
  public readonly presetQuestions: RecoveryPresetQuestion[] = RECOVERY_PRESET_QUESTIONS;

  /** Список настроенных Q&A (мок) */
  public readonly qaList = signal<MockRecoveryQA[]>(MOCK_RECOVERY_QA);

  /** Показывать форму добавления */
  public readonly showAddForm = signal<boolean>(false);

  /** Выбранный preset-вопрос или свой */
  public readonly selectedPreset = signal<RecoveryPresetQuestion | null>(null);

  /** Свой вопрос */
  public customQuestion: string = '';

  /** Ответ */
  public newAnswer: string = '';

  /** Принято предупреждение */
  public readonly warningAccepted = signal<boolean>(false);

  /** Назад к настройкам */
  public goBack(): void {
    void this._router.navigate(['/application/main/settings']);
  }

  /** Выбрать preset */
  public selectPreset(q: RecoveryPresetQuestion): void {
    this.selectedPreset.set(q);
    this.customQuestion = '';
  }

  /** Сохранить новый Q&A (мок) */
  public saveQA(): void {
    const question = this.selectedPreset()?.text ?? this.customQuestion.trim();
    if (!question || !this.newAnswer.trim()) return;

    const newQA: MockRecoveryQA = {
      id: `mock_${Date.now()}`,
      question,
      createdAt: new Date().toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    this.qaList.update((list) => [...list, newQA]);
    this.showAddForm.set(false);
    this.selectedPreset.set(null);
    this.customQuestion = '';
    this.newAnswer = '';
    this.warningAccepted.set(false);
  }

  /** Удалить Q&A (мок) */
  public deleteQA(id: string): void {
    this.qaList.update((list) => list.filter((qa) => qa.id !== id));
  }
}
