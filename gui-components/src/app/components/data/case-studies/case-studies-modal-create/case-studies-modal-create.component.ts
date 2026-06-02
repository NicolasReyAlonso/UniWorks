import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {
  AbstractControl, FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors
} from '@angular/forms';
import {NzModalModule, NzModalService} from 'ng-zorro-antd/modal';
import {forkJoin, lastValueFrom} from 'rxjs';
import {BackendService} from 'ngt-gui/core';
import {NotificationService, TypeNotificationEnum} from 'src/app/services/notification.service';
import {InternationalizationService} from "ngt-gui/core";import { CommonModule } from '@angular/common';
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzInputModule} from "ng-zorro-antd/input";
import {TopAreaService} from "../../../../services/top-area.service";

@Component({
    selector: 'app-case-studies-modal-create',
    imports: [
        CommonModule,
        SharedModule,
        NzButtonModule,
        NzFormModule,
        ReactiveFormsModule,
        FormsModule,
        NzSpinModule,
        NzModalModule,
        NzInputModule,
    ],
    templateUrl: './case-studies-modal-create.component.html',
    styleUrls: ['./case-studies-modal-create.component.sass']
})
export class CaseStudiesModalCreateComponent implements OnInit, OnDestroy {

  loading = false;
  showModal = false;
  formGroup: UntypedFormGroup;
  disabledLayersSelect = false;
  @Output() createCaseStudySuccessEvent = new EventEmitter();

  errorMessageEmptyName: string = "";
  changeLanguageEvent: EventEmitter<any>;

  layers = [];

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
    private readonly nzModalService: NzModalService,
    private readonly notificationService: NotificationService,
    private readonly internationalizationService: InternationalizationService,
    private readonly topAreaService: TopAreaService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.errorMessageEmptyName = await this.internationalizationService.translate('STUDY_CASES.CREATE_MODAL.INPUTS.NAME.ERROR_MESSAGE_EMPTY');
    this.changeLanguageEvent = this.internationalizationService.getLangChangeEvent();
    this.changeLanguageEvent.subscribe(async () => {
      this.errorMessageEmptyName = await this.internationalizationService.translate('STUDY_CASES.CREATE_MODAL.INPUTS.NAME.ERROR_MESSAGE_EMPTY');
    });
    this.formGroup = this.fb.group({
      name: [""],
      layers: [[]],
    }, {
      validators: [
        this.nameValidator,
      ]
    });
  }

  ngOnDestroy() {

  }

  async openModal(layersIds?): Promise<void> {
    this.loading = true;
    this.showModal = true;
    if (layersIds) {
      this.disabledLayersSelect = true;
      this.formGroup.get("layers").setValue(layersIds);
      this.formGroup.get("layers").disable();
    } else {
      this.disabledLayersSelect = false;
    }
    try {
      const layersResponse = await this.backendService.getLayerGIS().toPromise();
      const layersContent = layersResponse["content"];
      this.layers = layersContent;
      this.loading = false;
    } catch (error) {
      this.showModal = false;
      this.loading = false;
      this.nzModalService.error({
        nzTitle: 'Error',
        nzContent: 'No se ha conseguido  cargar la lista de las capas .',
        nzCentered: true,
      });
    }
  }

  async cancelModal(): Promise<void> {
    this.showModal = false;
    this.loading = false;
  }

  async createCaseStudy(): Promise<void> {
    if (this.formGroup.valid) {
      this.loading = true;
      let step_err = 0;
      try {
        const caseStudyResponse: any = await lastValueFrom(this.backendService.postCaseStudy({
          name: this.formGroup.get("name").value,
          attributes: {},
        }));
        this.topAreaService.topAreaEventEmitter.emit({type: 'load-case-studies', value: null});
        step_err = 1;
        const caseStudyContent = caseStudyResponse["content"];
        const caseStudiesId = caseStudyContent["id"];
        const oberserversRelationship = {}
        for (const layerId of this.formGroup.get("layers").value) {
          oberserversRelationship[layerId] = (this.backendService.postCaseStudiesItem({"case_study_id": caseStudiesId, "functional_object_id": layerId}));
        }
        this.createCaseStudySuccessEvent.emit();
        await forkJoin(oberserversRelationship).toPromise();
        this.showModal = false;
        this.loading = false;
        this.notificationService.createNotificationWithType(TypeNotificationEnum.success, "Creado caso de estudio", "Se ha creado el caso de estudio correctamente", "bottomRight");
      } catch (err) {
        switch (step_err) {
          case 0:
            this.nzModalService.error({
              nzTitle: 'Error',
              nzContent: 'No se ha conseguido crear el caso de estudio.',
              nzCentered: true,
            });
            this.loading = false;
            break;
          case 1:
            this.nzModalService.error({
              nzTitle: 'Error',
              nzContent: 'No se ha conseguido relacionar las capas con el caso de estudio.',
              nzCentered: true,
            });
            this.loading = false;
            this.showModal = false;
        }
      }
      this.loading = false;
      this.showModal = false;
    }

  }

  // Name
  private nameValidator(control: AbstractControl): ValidationErrors | null {
    let error = false;
    let emptyError = false;
    const name = control.get('name').value;
    if (!name || name == "") {
      error = true;
      emptyError = true;
    }
    return error ? {
      nameError: {
        empty: emptyError,
      }
    } : null;
  }

  showNameError(): boolean {
    if (!this.formGroup.errors || !this.formGroup.errors.nameError) {
      return false;
    }
    return true;
  }

  getMessageNameError(): string {
    let message = '';
    if (!this.formGroup.errors || !this.formGroup.errors.nameError) {
      return null;
    }
    if (this.formGroup.errors.nameError.empty) {
      message += this.errorMessageEmptyName;
    }
    console.log(message);
    return message;
  }

}

