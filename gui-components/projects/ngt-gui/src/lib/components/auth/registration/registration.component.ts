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

  constructor(
    private fb: UntypedFormBuilder,
    @Inject(AUTH_SERVICE_TOKEN) private authService: AuthServiceInterface,
    private readonly nzModalService: NzModalService,
  ) { }

  ngOnInit(): void {
    this.registerFormGroup = this.fb.group({
      email: [null, this.emailValidator],
      password: [null, this.passwordValidator],
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
    if (!control.value || control.value === '') {
      return { invalidPassword: true };
    }
    if (typeof control.value !== 'string' || control.value.length < 6) {
      return { invalidPassword: true };
    }
    return {};
  }

  async submitRegister() {
    for (const i in this.registerFormGroup.controls) {
      this.registerFormGroup.controls[i].markAsDirty();
      this.registerFormGroup.controls[i].updateValueAndValidity();
    }
    if (this.registerFormGroup.valid) {
      this.loading = true;
      try {
        await this.authService.createUserWithEmailAndPassword(this.registerFormGroup.get('email').value, this.registerFormGroup.get('password').value);
        this.nzModalService.info({
          nzTitle: 'Verifición',
          nzContent: 'Se ha enviado a su email un correo para verificar el usuario.',
          nzCentered: true,
        });
        this.desactiveRegister.emit();
      } catch (e) {
        console.log(e);
        if (e.code) {
          switch (e.code) {
            case "auth/email-already-in-use":
              this.nzModalService.error({
                nzTitle: 'Error',
                nzContent: 'El email ya esta en uso o esta a la espera de verificación.',
                nzCentered: true,
              });
              break;
          }
        }
      }
      this.loading = false;
    }
  }

  onClickLinkLogin() {
    this.desactiveRegister.emit();
  }
}

