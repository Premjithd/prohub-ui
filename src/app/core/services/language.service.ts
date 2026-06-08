import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLang = 'en' | 'ml' | 'hi';

const STORAGE_KEY = 'yph_lang';
const SUPPORTED: AppLang[] = ['en', 'ml', 'hi'];
const DEFAULT: AppLang = 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  constructor(private translate: TranslateService) {}

  init(): void {
    this.translate.addLangs(SUPPORTED);
    this.translate.setDefaultLang(DEFAULT);
    const saved = localStorage.getItem(STORAGE_KEY) as AppLang | null;
    const lang: AppLang = saved && SUPPORTED.includes(saved) ? saved : DEFAULT;
    this.translate.use(lang);
  }

  use(lang: AppLang): void {
    this.translate.use(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  get current(): AppLang {
    return (this.translate.currentLang ?? DEFAULT) as AppLang;
  }

  get supported(): AppLang[] {
    return SUPPORTED;
  }
}
