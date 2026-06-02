import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output } from '@angular/core';
import { es_ES, en_US, pt_PT, NzI18nService } from 'ng-zorro-antd/i18n';
import { Subscription } from 'rxjs';
import {AuthService} from "ngt-gui/core";
import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import { ThemeService, ThemeType } from 'src/app/services/theme.service';
import { InternationalizationService, LANGUAGE_OPTION_TYPES } from 'ngt-gui/core';
import { LangChangeEvent } from '@ngx-translate/core';
import {BackendService} from 'ngt-gui/core';import { MessageLogService } from "src/app/services/message-log.service";
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from "@angular/forms";
import { StateService } from 'ngt-gui/core';
import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../shared-module/shared.module";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzListModule} from "ng-zorro-antd/list";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzButtonModule} from "ng-zorro-antd/button";
import {KeyValueCustomPipe} from "../../../pipes/key-value-custom.pipe";

interface IPreferencesValue {
  language: string;
  theme: ThemeType;
}

interface IMenuItem {
  icon: string;
  title: string;
  hidden: boolean;
}

export const MENU_ITEM_TYPES = {
  PROFILE: 1,
  THEME: 2,
  LANGUAGES: 3,
  API_KEYS: 4,
};

interface IThemeOption {
  title: string;
  color: string;
}

@Component({
    selector: 'preferences-modal',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzSelectModule,
        NzFormModule,
        NzInputModule,
        NzModalModule,
        NzListModule,
        NzTableModule,
        NzIconModule,
        NzSpinModule,
        NzButtonModule,
        KeyValueCustomPipe,
    ],
    templateUrl: './preferences-modal.component.html',
    styleUrls: ['./preferences-modal.component.sass']
})
export class PreferencesModalComponent implements OnInit, OnDestroy, OnChanges {

  @Input() isVisible: boolean;
  @Output() isVisibleChange = new EventEmitter<boolean>();

  previousPreferencesValue: IPreferencesValue;
  isVisibleConfirmCancelModal = false;
  loadingPreferencesModal = false;

  private changeUserSubscription: Subscription;

  selectedMenuItem = this.MenuItemType.PROFILE;
  readonly menuItems: Map<number, IMenuItem> = new Map([
    [this.MenuItemType.PROFILE, {
      icon: 'user',
      title: 'PREFERENCES_MODAL.PROFILE.TITLE',
      hidden: true,
    }],
    [this.MenuItemType.THEME, {
      icon: 'format-painter',
      title: 'PREFERENCES_MODAL.THEMES.TITLE',
      hidden: false,
    }],
    [this.MenuItemType.LANGUAGES, {
      icon: 'translation',
      title: 'PREFERENCES_MODAL.LANGUAGES.TITLE',
      hidden: false,
    }],
    [this.MenuItemType.API_KEYS, {
      icon: 'key',
      title: 'PREFERENCES_MODAL.API_KEYS.TITLE',
      hidden: true,
    }],
  ]);

  selectedOptionThemes: ThemeType = ThemeType.themeGrassGreen;
  readonly optionThemes: Map<ThemeType, IThemeOption> = new Map([
    [ThemeType.themeCyan, {
      title: 'PREFERENCES_MODAL.THEMES.TYPES.CYAN_1',
      color: '#073642',
    }],
    [ThemeType.themeGreenNextgendem, {
      title: 'PREFERENCES_MODAL.THEMES.TYPES.GREEN_NEXTGENDEM',
      color: '#016959',
    }],
    [ThemeType.themeBlueNextgendem, {
      title: 'PREFERENCES_MODAL.THEMES.TYPES.BLUE_NEXTGENDEM',
      color: '#0077B3',
    }],
    [ThemeType.themeCyan2, {
      title: 'PREFERENCES_MODAL.THEMES.TYPES.CYAN_2',
      color: '#073642',
    }],
    [ThemeType.themeGold, {
      title: 'PREFERENCES_MODAL.THEMES.TYPES.GOLD',
      color: '#bcbe6a',
    }],
    [ThemeType.themeGrassGreen, {
      title: 'PREFERENCES_MODAL.THEMES.TYPES.GRASS_GREEN',
      color: '#7DB46CFF',
    }],
    [ThemeType.themeGray, {
      title: 'PREFERENCES_MODAL.THEMES.TYPES.GRAY',
      color: '#606060',
    }],
  ]);

  selectedOptionLanguage: string = this.LanguageItemType.spanish.id;
  changeLanguageEvent: EventEmitter<LangChangeEvent>;

  apiKeysUser = [];
  generateApiKeyModalVisible = false;
  generateApiKeyFormGroup: UntypedFormGroup;

  get MenuItemType() {
    return MENU_ITEM_TYPES;
  }

  get LanguageItemType() {
    return LANGUAGE_OPTION_TYPES;
  }

  constructor(
    public readonly authService: AuthService,
    public themeService: ThemeService,
    private i18n: NzI18nService,
    private notificationService: NotificationService,
    private readonly internationalizationService: InternationalizationService,
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
    private readonly fb: UntypedFormBuilder,
    private readonly stateService: StateService,
  ) {

  }

  ngOnInit(): void {
    this.stateService.stateServiceEvent.subscribe((event) => {
      switch (event.type) {
        case 'cfg':
          if (event.event.theme) {
            this.selectedOptionThemes = event.event.theme;
            this.previousPreferencesValue.theme = event.event.theme;
          }
          if (event.event.language) {
            this.selectedOptionLanguage = event.event.language;
            this.previousPreferencesValue.language = event.event.language;
          }
          break;
      }
    });
    this.selectedOptionLanguage = this.internationalizationService.getCurrentLanguage();
    this.changeLanguageEvent = this.internationalizationService.getLangChangeEvent();
    this.changeLanguageEvent.subscribe((value) => {
      this.selectedOptionLanguage = value.lang;
    });
    this.selectedOptionThemes = this.themeService.currentTheme;
    this.previousPreferencesValue = {
      language: this.selectedOptionLanguage,
      theme: this.selectedOptionThemes,
    };
    this.changeUserSubscription = this.authService.changeUserEvent.subscribe((user) => {
      if (user) {
        const menuItemProfile = this.menuItems.get(this.MenuItemType.PROFILE);
        const menuItemApiKeys = this.menuItems.get(this.MenuItemType.API_KEYS);
        menuItemProfile.hidden = user.isAnonymous;
        if (user.isAnonymous) {
          this.selectedMenuItem = this.MenuItemType.THEME;
        } else {
          this.selectedMenuItem = this.MenuItemType.PROFILE;
        }
        menuItemApiKeys.hidden = !this.authService.haveOnePermissionForApiKeys();
      }
    });
    this.generateApiKeyFormGroup = this.fb.group({
      roles: [[]]
    }, {
      validators: [this.generateApiKeyFormGroupRoleValidator.bind(this)]
    });
  }

  ngOnChanges(changes) {
    if (changes.isVisible && changes.isVisible.currentValue) {
      if (this.authService.user) {
        if (this.authService.user.isAnonymous) {
          this.selectedMenuItem = this.MenuItemType.THEME;
        } else {
          this.selectedMenuItem = this.MenuItemType.PROFILE;
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.changeUserSubscription.unsubscribe();
    this.changeLanguageEvent.unsubscribe();
  }

  ngClassMenuActiveJson(id): any {
    return {
      'theme-primary-background': id == this.selectedMenuItem
    };
  }

  changeSelectedMenuItem(id): void {
    this.selectedMenuItem = id;
    switch (id) {
      case this.MenuItemType.API_KEYS:
        this.changeSelectedMenuItemApiKeys().then();
        break;
    }
  }

  async changeSelectedMenuItemApiKeys(): Promise<void> {
    this.loadingPreferencesModal = true;
    try {
      const responseApiKeys: any = await this.backendService.getCurrentUserApiKeys().toPromise();
      const contentApiKeys = responseApiKeys.content ? responseApiKeys.content : [];
      this.apiKeysUser = [];
      for (const apiKeyResponse of contentApiKeys) {
        let roles = '';
        let valid_from = '';
        for (const role of apiKeyResponse.roles) {
          roles += `${role} `;
        }
        roles.trim();
        if (apiKeyResponse.valid_from && apiKeyResponse.valid_from !== '') {
          valid_from = new Date(apiKeyResponse.valid_from).toDateString();
        }
        this.apiKeysUser = [
          ...this.apiKeysUser, {
            key_idx: apiKeyResponse.key_idx,
            roles: roles,
            valid_from: valid_from,
            valid_until: apiKeyResponse.valid_until,
          }];
      }
    } catch (e) {
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'PREFERENCES_MODAL.API_KEYS.GET_NOTIFICATION_ERROR.TITLE',
        'PREFERENCES_MODAL.API_KEYS.GET_NOTIFICATION_ERROR.CONTENT',
        'bottomRight'
      ).then();
    }
    this.loadingPreferencesModal = false;
  }

  swicthLanguage(value): void {
    console.log('switch language event');
    this.internationalizationService.changeCurrentLanguage(value);
  }

  async onClickThemeItem(themeId: ThemeType): Promise<void> {
    this.loadingPreferencesModal = true;
    this.selectedOptionThemes = themeId;
    await this.themeService.loadTheme(themeId);
    this.loadingPreferencesModal = false;
  }

  haveChanges(): boolean {
    if (this.previousPreferencesValue.theme != this.selectedOptionThemes) {
      return true;
    }
    if (this.previousPreferencesValue.language != this.selectedOptionLanguage) {
      return true;
    }
    return false;
  }

  modalCancel(): void {
    if (this.haveChanges()) {
      this.isVisibleConfirmCancelModal = true;
    } else {
      this.isVisibleChange.emit(false);
    }
  }

  saveChanges() {
    this.previousPreferencesValue.theme = this.selectedOptionThemes;
    this.previousPreferencesValue.language = this.selectedOptionLanguage;
    this.setState();
    this.notificationService.createNotificationWithType(
      TypeNotificationEnum.success,
      'Cambios realizados',
      'Sus cambios se han realizado satisfactoriamente.',
      'bottomRight'
    );
  }

  saveChangesModal() {
    this.loadingPreferencesModal = true;
    this.isVisibleConfirmCancelModal = false;
    this.loadingPreferencesModal = true;
    this.saveChanges();
    this.isVisibleChange.emit(false);
    this.loadingPreferencesModal = false;
  }

  async discardChanges(): Promise<void> {
    this.loadingPreferencesModal = true;
    this.isVisibleConfirmCancelModal = false;
    this.selectedOptionLanguage = this.previousPreferencesValue.language;
    this.internationalizationService.changeCurrentLanguage(this.selectedOptionLanguage);
    this.selectedOptionThemes = this.previousPreferencesValue.theme;
    await this.themeService.loadTheme(this.selectedOptionThemes);
    this.isVisibleChange.emit(false);
    this.loadingPreferencesModal = false;
  }

  cancelClosePreferences() {
    this.isVisibleConfirmCancelModal = false;
  }

  getLanguageTypeLabel(key): string {
    return `PREFERENCES_MODAL.LANGUAGES.LANGUAGE_TYPES.${key}`;
  }

  async setState() {
    const value: any = {};
    value.theme = this.selectedOptionThemes;
    value.language = this.selectedOptionLanguage;
    this.stateService.setState('cfg', value);
  }

  cancelGenerateApiKey() {
    this.generateApiKeyModalVisible = false;
    this.generateApiKeyFormGroup.get('roles').setValue([]);
  }

  openGenerateApiKeyModal() {
    this.generateApiKeyFormGroup.get('roles').setValue([]);
    this.generateApiKeyModalVisible = true
  }

  async generateApiKey() {
    this.loadingPreferencesModal = true;
    this.generateApiKeyModalVisible = false;
    const rolesValue = this.generateApiKeyFormGroup.get('roles').value;
    try {
      const response: any = await this.backendService.postCurrentUserApiKey({
        roles: rolesValue
      }).toPromise();
      const content = response.content;
      const copy = Object.assign(content);
      delete copy.hash;
      const file = new Blob([JSON.stringify(copy, null, "\t")], { type: 'application/json' });
      const a = document.createElement('a');
      const url = URL.createObjectURL(file);
      a.href = url;
      a.download = 'api_key.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
      let roles = '';
      let valid_from = '';
      for (const role of content.roles) {
        roles += `${role} `;
      }
      roles.trim();
      if (content.valid_from && content.valid_from !== '') {
        valid_from = new Date(content.valid_from).toDateString();
      }
      this.messageLogService.addIssues(response.issues);
      this.apiKeysUser = [
        ...this.apiKeysUser, {
          key_idx: content.key_idx,
          roles: roles,
          valid_from: valid_from,
          valid_until: content.valid_until,
        }];
    } catch (e) {
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'PREFERENCES_MODAL.API_KEYS.POST_NOTIFICATION_ERROR.TITLE',
        'PREFERENCES_MODAL.API_KEYS.POST_NOTIFICATION_ERROR.CONTENT',
        'bottomRight'
      ).then();
    }
    this.loadingPreferencesModal = false;
  }

  async removeApiKey(data): Promise<void> {
    this.loadingPreferencesModal = true;
    try {
      const response: any = await this.backendService.removeCurrentUserApiKey(data.key_idx).toPromise();
      if (response.issues) {
        this.messageLogService.addIssues(response.issues);
      }
      this.apiKeysUser = this.apiKeysUser.filter(item => item.key_idx !== data.key_idx);
    } catch (e) {
      console.log(e);
      if (e.issues) {
        this.messageLogService.addIssues(e.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'PREFERENCES_MODAL.API_KEYS.DELETE_NOTIFICATION_ERROR.TITLE',
        'PREFERENCES_MODAL.API_KEYS.DELETE_NOTIFICATION_ERROR.CONTENT',
        'bottomRight'
      ).then();
    }
    this.loadingPreferencesModal = false;
  }

  generateApiKeyFormGroupRoleValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const roles = control.get('roles').value;
    if (!roles || roles.length === 0) {
      error = true;
      emptyError = true;
    }
    return error ? {
      roleError: {
        empty: emptyError,
      }
    } : null;
  }

  showGenerateModalRoleError(): boolean {
    if (!this.generateApiKeyFormGroup.errors || !this.generateApiKeyFormGroup.errors.roleError) {
      return false;
    }
    return true;
  }

  getMessageGenerateModalNameError(): string[] {
    const message = [];
    if (!this.generateApiKeyFormGroup.errors || !this.generateApiKeyFormGroup.errors.roleError) {
      return null;
    }
    if (this.generateApiKeyFormGroup.errors.roleError.empty) {
      message.push('PREFERENCES_MODAL.API_KEYS.GENERATE_MODAL.CONTENT.ROLE_INPUT.ERROR_EMPTY');
    }
    return message;
  }

}

