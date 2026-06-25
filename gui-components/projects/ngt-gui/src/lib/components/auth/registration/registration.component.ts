import {Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormControl} from '@angular/forms';
import { NzModalService } from 'ng-zorro-antd/modal';
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzAvatarModule} from "ng-zorro-antd/avatar";

//Library Services
import {AuthService} from "ngt-gui/core";

//Library modules
import {SharedModule} from "../../../modules/shared.module";
import { CoreModule } from 'ngt-gui/core';
import { AuthServiceInterface } from 'ngt-gui/core';
import { AUTH_SERVICE_TOKEN } from 'ngt-gui/core';

@Component({
    selector: 'app-registration',
    imports: [
        CommonModule,
        SharedModule,
        NzSpinModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzAvatarModule,
        FormsModule,
        ReactiveFormsModule,
        CoreModule
    ],
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.sass']
})
export class RegistrationComponent implements OnInit {

  @Output('desactiveRegister') desactiveRegister = new EventEmitter();

  loading = false;
  registerFormGroup;

  hasBasic = false;
  hasFirebase = false;

  constructor(
    private fb: UntypedFormBuilder,
    @Inject(AUTH_SERVICE_TOKEN) private authService: AuthServiceInterface,
    private readonly nzModalService: NzModalService,
  ) { }

  ngOnInit(): void {
    this.registerFormGroup = this.fb.group({
      email: [null, this.requiredValidator],
      password: [null, this.passwordValidator],
    });
    this.loadProviders();
  }

  requiredValidator(control: UntypedFormControl): { [s: string]: any } {
    if (!control.value || String(control.value).trim() === '') {
      return { required: true };
    }
    return {};
  }

  passwordValidator(control: UntypedFormControl): { [s: string]: any } {
    if (!control.value || control.value === '') {
      return { invalidPassword: true };
    }
    if (typeof control.value !== 'string' || control.value.length < 8) {
      return { invalidPassword: true };
    }
    return {};
  }

  private loadProviders() {
    this.authService.getAuthProviders().subscribe({
      next: (res: any) => {
        const providers = (res && res.content) || [];
        this.hasBasic = providers.some((p: any) => p.id === 'basic');
        this.hasFirebase = providers.some((p: any) => p.id === 'firebase');
      },
      error: () => {
        this.hasBasic = true;
      },
    });
  }

  async submitRegister() {
    for (const i in this.registerFormGroup.controls) {
      this.registerFormGroup.controls[i].markAsDirty();
      this.registerFormGroup.controls[i].updateValueAndValidity();
    }
    if (!this.registerFormGroup.valid) {
      return;
    }
    this.loading = true;
    const identifier = this.registerFormGroup.get('email').value;
    const password = this.registerFormGroup.get('password').value;
    try {
      if (this.hasBasic) {
        // Basic provider: register and auto-login.
        await this.authService.registerBasic({ username: identifier, password });
        this.desactiveRegister.emit();
      } else {
        await this.authService.createUserWithEmailAndPassword(identifier, password);
        this.nzModalService.info({
          nzTitle: 'Verificación',
          nzContent: 'Se ha enviado a su email un correo para verificar el usuario.',
          nzCentered: true,
        });
        this.desactiveRegister.emit();
      }
    } catch (e: any) {
      this.loading = false;
      this.handleRegisterError(e);
    }
  }

  private handleRegisterError(e: any) {
    if (e && e.status === 409 || e?.code === 'auth/email-already-in-use') {
      this.nzModalService.error({
        nzTitle: 'Error',
        nzContent: 'El usuario ya existe.',
        nzCentered: true,
      });
      return;
    }
    if (e && e.status === 400) {
      this.nzModalService.error({
        nzTitle: 'Error',
        nzContent: 'La contraseña no cumple los requisitos mínimos.',
        nzCentered: true,
      });
      return;
    }
    this.nzModalService.error({
      nzTitle: 'Error',
      nzContent: 'No se ha podido completar el registro.',
      nzCentered: true,
    });
  }

  onClickLinkLogin() {
    this.desactiveRegister.emit();
  }
}

