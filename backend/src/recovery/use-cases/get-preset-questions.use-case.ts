import { Injectable } from '@nestjs/common';

/** Элемент пресет-списка вопросов восстановления. */
interface PresetQuestion {
  /** Стабильный ID пресет-вопроса (для аналитики). */
  readonly id: string;
  /** Текст вопроса. */
  readonly text: string;
}

/** Пресет-список вопросов восстановления доступа. */
const PRESET_QUESTIONS: PresetQuestion[] = [
  { id: 'preset_mother_maiden', text: 'Девичья фамилия матери' },
  { id: 'preset_first_pet', text: 'Кличка первого питомца' },
  { id: 'preset_birth_city', text: 'Город, в котором вы родились' },
  { id: 'preset_father_birth_city', text: 'Город рождения отца' },
  { id: 'preset_school_name', text: 'Название школы, где вы учились' },
  { id: 'preset_childhood_friend', text: 'Имя лучшего друга детства' },
  { id: 'preset_first_car', text: 'Марка вашего первого автомобиля' },
  { id: 'preset_favorite_teacher', text: 'Имя любимого учителя' },
  { id: 'preset_childhood_nickname', text: 'Ваше прозвище в детстве' },
  { id: 'preset_parents_met_city', text: 'Город, где познакомились ваши родители' },
];

/** Use-case получения пресет-списка вопросов восстановления (публичный). */
@Injectable()
export class GetPresetQuestionsUseCase {
  /**
   * Возвращает статический список пресет-вопросов.
   * @returns Массив объектов { id, text }.
   */
  public execute(): PresetQuestion[] {
    return PRESET_QUESTIONS;
  }
}
