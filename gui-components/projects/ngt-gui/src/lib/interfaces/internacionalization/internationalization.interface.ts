import {EventEmitter} from '@angular/core';
import {LangChangeEvent} from '@ngx-translate/core';

export const LANGUAGE_OPTION_TYPES = {
  spanish: {
    id: 'private-es',
  },
  english: {
    id: 'private-en',
  },
  portuguese: {
    id: 'private-pt',
  },
  french: {
    id: 'private-fr',
  }

};

export interface InternationalizationServiceInterface {
  getCurrentLanguage(): string;
  changeCurrentLanguage(value: string): void;
  getLangChangeEvent(): EventEmitter<LangChangeEvent>;
  translate(key, interpolateParams?): Promise<string>;
  setDefaultLanguage(language : string): void;
}
