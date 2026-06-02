import {Injectable} from '@angular/core';
import { ThemeServiceInterface, ThemeType } from '../interfaces/theme/theme.interface';

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements ThemeServiceInterface{

  currentTheme: any;

  constructor() { }

  private removeUnusedTheme(theme: ThemeType): void {
    document.documentElement.classList.remove(theme);
    const removedThemeStyle = document.getElementById(theme);
    if (removedThemeStyle) {
      document.head.removeChild(removedThemeStyle);
    }
  }

  private loadCss(href: string, id: string): Promise<Event> {
    return new Promise((resolve, reject) => {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = href;
      style.id = id;
      style.onload = resolve;
      style.onerror = reject;
      document.head.append(style);
    });
  }

  public loadTheme(theme): Promise<Event> {
    document.documentElement.classList.add(theme);
    return new Promise<Event>((resolve, reject) => {
      this.loadCss(`${theme}.css`, theme).then(
        (e) => {
          if (this.currentTheme) {
            this.removeUnusedTheme(this.currentTheme);
          }
          this.currentTheme = theme;
          resolve(e);
        },
        (e) => reject(e)
      );
    });
  }
}
