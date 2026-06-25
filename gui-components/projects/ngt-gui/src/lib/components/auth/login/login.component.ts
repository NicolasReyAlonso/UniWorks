import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {NzInputModule} from "ng-zorro-antd/input";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzModalModule, NzModalService} from "ng-zorro-antd/modal";
import {NzAvatarModule} from "ng-zorro-antd/avatar";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzButtonModule} from "ng-zorro-antd/button";

//Library Services
import { NotificationService } from 'ngt-gui/core';
import { CoreModule } from 'ngt-gui/core';
import { AuthServiceInterface } from 'ngt-gui/core';
import { AUTH_SERVICE_TOKEN } from 'ngt-gui/core';

//Library modules
import {SharedModule} from "../../../modules/shared.module";

//Library components
import {AnonymousSvgComponent} from "../../miscellaneous/icons/anonymous-svg/anonymous-svg.component";
import {GoogleSvgComponent} from "../../miscellaneous/icons/google-svg/google-svg.component";

@Component({
    selector: 'app-login',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzModalModule,
        NzInputModule,
        NzFormModule,
        NzAvatarModule,
        NzSpinModule,
        AnonymousSvgComponent,
        GoogleSvgComponent,
        NzButtonModule,
        CoreModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.sass']
})
export class LoginComponent implements OnInit {
  title = 'bcs-gui';
  loading = false;
  loginFormGroup: UntypedFormGroup;
  forgetPasswordFormGroup: UntypedFormGroup;
  @Output('validityChange') validityChange = new EventEmitter();
  @Output('activeRegister') activeRegister = new EventEmitter();

  isVisibleForgetPasswordModal = false;

  // Available auth providers, discovered from the backend.
  hasBasic = false;
  hasFirebase = false;
  supportsRegister = false;

  constructor(
    @Inject(AUTH_SERVICE_TOKEN) public authService: AuthServiceInterface,
    private router: Router,
    private fb: UntypedFormBuilder,
    private notificationService: NotificationService,
    private readonly nzModalService: NzModalService,
  ) { }

  ngOnInit() {
    this.loginFormGroup = this.fb.group({
      email: [null, this.requiredValidator],
      password: [null, this.passwordValidator],
    });
    this.loadProviders();

    this.forgetPasswordFormGroup = this.fb.group({
      email: ["", this.emailValidator],
    });

    this.loginFormGroup.statusChanges.subscribe((value) => {
      switch (value) {
        case "INVALID":
          this.validityChange.emit(false);
          break;
        case "VALID":
          this.validityChange.emit(true);
          break;
      }
    });

    this.authService.changeUserEvent.subscribe( (user) => {
      this.loading = false;
    });
  }

  emailValidator(control: UntypedFormControl): { [s: string]: any } {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!re.test(String(control.value).toLowerCase())) {
      return { invalidEmail: true };
    }
    return {};
  }

  passwordValidator(control: UntypedFormControl): { [s: string]: any } {
    if (!control.value || control.value == "") {
      return { invalidPassword: true };
    }
    return {};
  }

  async loginWithGoogle() {
    this.loading = true;
    await this.authService.loginWithGoogle();
  }

  async loginAnonymous() {
    this.loading = true;
    await this.authService.loginAnonymous();
  }

  requiredValidator(control: UntypedFormControl): { [s: string]: any } {
    if (!control.value || String(control.value).trim() === "") {
      return { required: true };
    }
    return {};
  }

  private loadProviders() {
    this.authService.getAuthProviders().subscribe({
      next: (res: any) => {
        const providers = (res && res.content) || [];
        this.hasBasic = providers.some((p: any) => p.id === 'basic');
        this.hasFirebase = providers.some((p: any) => p.id === 'firebase');
        this.supportsRegister = providers.some((p: any) => p.supports_register);
      },
      error: () => {
        // Fallback so the demo stays usable if discovery fails.
        this.hasBasic = true;
        this.supportsRegister = true;
      },
    });
  }

  async submitLogin() {
    for (const i in this.loginFormGroup.controls) {
      this.loginFormGroup.controls[i].markAsDirty();
      this.loginFormGroup.controls[i].updateValueAndValidity();
    }
    if (!this.loginFormGroup.valid) {
      return;
    }
    this.loading = true;
    const identifier = this.loginFormGroup.get('email').value;
    const password = this.loginFormGroup.get('password').value;
    try {
      // Basic provider takes precedence when available (the framework default);
      // Firebase email/password is used when only Firebase is configured.
      if (this.hasBasic) {
        await this.authService.loginWithBasic(identifier, password);
      } else {
        await this.authService.loginWithEmailAndPassword(identifier, password);
      }
      this.loginFormGroup.get('email').setValue("");
      this.loginFormGroup.get('password').setValue("");
    } catch (e) {
      this.loading = false;
      this.handleLoginError(e);
    }
  }

  private handleLoginError(e: any) {
    if (e && (e.status === 401 || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found')) {
      this.nzModalService.error({
        nzTitle: 'Error',
        nzContent: 'Usuario o contraseña incorrectos.',
        nzCentered: true,
      });
      return;
    }
    if (e && e.code === 'auth/email-not-verified') {
      this.nzModalService.error({
        nzTitle: 'Error',
        nzContent: 'El email no está verificado. Se le ha enviado un correo de verificación.',
        nzCentered: true,
      });
      return;
    }
    this.nzModalService.error({
      nzTitle: 'Error',
      nzContent: 'No se ha podido iniciar sesión.',
      nzCentered: true,
    });
  }

  error(event) {
    this.router.navigateByUrl('/login');
  }

  onClickLinkRegister() {
    this.activeRegister.emit();
  }

  onClickForgetPassword(): void {
    this.isVisibleForgetPasswordModal = true;
  }

  closeForgetPasswordModal(): void {
    this.forgetPasswordFormGroup.get("email").setValue("");
    this.isVisibleForgetPasswordModal = false;
  }

  async sumbitForgetPassword(): Promise<void> {
    const emailControl = this.forgetPasswordFormGroup.get("email");
    this.loading = true;
    this.isVisibleForgetPasswordModal = false;
    try {
      await this.authService.forgetPassword(emailControl.value);
      this.nzModalService.success({
        nzTitle: 'Recuperación de contraseña',
        nzContent: `Se ha enviado un correo al email ${emailControl.value} para recuperar la contraseña.`,
        nzCentered: true,
      });
    } catch (e) {
      if (e.code) {
        switch (e.code) {
          case "auth/user-not-found":
            this.nzModalService.error({
              nzTitle: 'Error',
              nzContent: 'No existe ningún usuario con ese email.',
              nzCentered: true,
            });
            break;
        }
      }
    }
    emailControl.setValue("");
    this.loading = false;
  }
}

