export enum ThemeType {
  themeGold = 'themeGold',
  themeGrassGreen = 'themeGrassGreen',
  themeCyan = 'themeCyan',
  themeCyan2 = 'themeCyan2',
  themeGray = 'themeGray',
  themeGeneral = 'themeGeneral',
  themeGreenNextgendem = 'themeGreenNextgendem',
  themeBlueNextgendem = 'themeBlueNextgendem',
}

export interface ThemeServiceInterface {
  currentTheme: any;
  loadTheme(theme): Promise<Event>;
}
