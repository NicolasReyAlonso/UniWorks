import {Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {NzSpinModule} from "ng-zorro-antd/spin";
import {Observable} from "rxjs";
import {AbstractControl, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzFormModule} from "ng-zorro-antd/form";
import {NzGridModule} from "ng-zorro-antd/grid";
import {NzInputModule} from "ng-zorro-antd/input";
import {ContainerizationImageItem} from "@models/containerization-images.model";
import {TranslateModule} from "@ngx-translate/core";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
    selector: 'app-containerization-images-detail-general-tab',
    imports: [CommonModule, NzSpinModule, ReactiveFormsModule, NzFormModule, NzGridModule, NzInputModule, FormsModule, TranslateModule],
    templateUrl: './containerization-images-detail-general-tab.component.html',
    styleUrls: ['./containerization-images-detail-general-tab.component.sass']
})
export class ContainerizationImagesDetailGeneralTabComponent implements OnInit {

  private readonly _destroyRef = inject(DestroyRef)

  @Input({required: true}) loading$: Observable<boolean>
  @Input({required: true}) formGroup: FormGroup
  @Input({required: true}) $containerizationImageDetailOriginalData: Observable<ContainerizationImageItem>

  protected containerizationImageDetailOriginalData: ContainerizationImageItem

  public ngOnInit(): void {
    this.$containerizationImageDetailOriginalData.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((value) => {
      this.containerizationImageDetailOriginalData = value
      this.updateFormByOriginalData()
    })
  }

  private updateFormByOriginalData() {
    this.formGroup.patchValue({
      name: this.containerizationImageDetailOriginalData.name,
      imageType: this.containerizationImageDetailOriginalData.image_type,
      recipe: this.containerizationImageDetailOriginalData.recipe,
      location: this.containerizationImageDetailOriginalData.location
    }, {emitEvent: false})
  }

  protected getErrorInputMessage(args: {control: AbstractControl, translateKey: string}): string[] {
    let messages: string[] = []
    const prefix = `PROCESSES_ADMIN.CONTAINERIZATION_IMAGES.DETAIL.INPUTS.${args.translateKey}.`

    if (args.control.errors) {
      messages = Object.keys(args.control.errors).map(errorKey => `${prefix}${errorKey}`)
    }

    return messages
  }


}
