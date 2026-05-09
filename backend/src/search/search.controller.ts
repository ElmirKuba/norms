import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { SearchUseCase } from './use-cases/search.use-case';

/** Контроллер глобального поиска аккаунтов. */
@Controller('search')
@UseGuards(JwtGuard)
export class SearchController {
  public constructor(private readonly _searchUseCase: SearchUseCase) {}

  /**
   * Поиск аккаунтов по UIN (точный) или username (префикс).
   * @param q - Строка запроса.
   * @param limit - Максимальное количество результатов (по умолчанию 20).
   * @returns Массив найденных аккаунтов.
   */
  @Get()
  public search(
    @Query('q') q: string = '',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): ReturnType<SearchUseCase['execute']> {
    return this._searchUseCase.execute(q, limit);
  }
}
