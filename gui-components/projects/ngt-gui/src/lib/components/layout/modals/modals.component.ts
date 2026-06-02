import {ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, Inject, OnInit} from '@angular/core';
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzModalModule} from "ng-zorro-antd/modal";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzMessageModule} from "ng-zorro-antd/message";
import {NzNotificationModule} from "ng-zorro-antd/notification";
import {NzIconModule} from "ng-zorro-antd/icon";
import {AngularFireAuthModule} from "@angular/fire/compat/auth";
import {CommonModule} from "@angular/common";

//Library Services
import {AUTH_SERVICE_TOKEN, AuthService, AuthServiceInterface} from "ngt-gui/core";
import {InternationalizationService, LANGUAGE_OPTION_TYPES} from 'ngt-gui/core';

//Library Modules
import {SharedModule} from "../../../modules/shared.module";

//Library Components
import {LoginComponent} from "../../auth/login/login.component";
import {RegistrationComponent} from "../../auth/registration/registration.component";

@Component({
  selector: 'app-modals',
  imports: [
    CommonModule,
    SharedModule,
    NzSelectModule,
    FormsModule,
    ReactiveFormsModule,
    NzModalModule,
    NzSpinModule,
    NzMessageModule,
    NzNotificationModule,
    NzIconModule,
    AngularFireAuthModule,
    // Components
    RegistrationComponent,
    LoginComponent
  ],
  templateUrl: './modals.component.html',
  styleUrl: './modals.component.sass'
})
export class ModalsComponent {
  validateLogin = false;
  isActiveRegister = false;
  showSidebar = true;
  navigate = false;
  selectedOptionLanguage;
  constructor(
    @Inject(AUTH_SERVICE_TOKEN) public readonly auth: AuthServiceInterface,
    private readonly cdf: ChangeDetectorRef,
    private readonly internacionalizationService: InternationalizationService,
  ) {
  
  }
    get LanguageItemType() {
    return LANGUAGE_OPTION_TYPES;
  }

  swicthLanguage(value): void {
    this.internacionalizationService.changeCurrentLanguage(value);
  }
    getLanguageTypeLabel(key): string {
    return `AUTH_MODAL.INPUTS.LANGUAGE.TYPES.${key}`;
  }

  showModal(): boolean {
    return (!this.auth.isEmailVerified && !this.auth.isAnonymous) && !this.auth.hiddenAuthModal && !this.navigate;
  }

}