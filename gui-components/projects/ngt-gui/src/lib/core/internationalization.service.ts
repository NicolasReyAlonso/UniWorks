import {EventEmitter, Injectable} from '@angular/core';
import {LangChangeEvent, TranslateService} from '@ngx-translate/core';
import { InternationalizationServiceInterface, LANGUAGE_OPTION_TYPES } from '../interfaces/internacionalization/internationalization.interface';

@Injectable({
  providedIn: 'root'
})
export class InternationalizationService implements  InternationalizationServiceInterface{

  constructor(public translateService: TranslateService) { }

  getCurrentLanguage(): string {
    return this.translateService.currentLang;
  }

  changeCurrentLanguage(value: string): void {
    this.translateService.use(value);
  }

  getLangChangeEvent(): EventEmitter<LangChangeEvent> {
    return this.translateService.onLangChange;
  }

  async translate(key, interpolateParams?): Promise<string> {
    return await this.translateService.get(key, interpolateParams).toPromise();
  }

  setDefaultLanguage(language : string): void {
    this.translateService.setDefaultLang(language);
  }
}
