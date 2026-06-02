import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AlignmentSelectorComponent, AlignmentSelectorValidator, AlignmentSelectorValidatorMessage,
} from 'src/app/components/formly-components/alignment-selector/alignment-selector.component';
import {
  SequenceSelectorComponent,
  SequenceSelectorValidator,
  SequenceSelectorValidatorMessage
} from "src/app/components/formly-components/sequence-selector/sequence-selector.component";
import {
  PhylotreeSelectorComponent,
  PhylotreeSelectorValidator, PhylotreeSelectorValidatorMessage
} from "src/app/components/formly-components/phylotree-selector/phylotree-selector.component";
import {
  MultipleSelectorComponent,
  MultipleSelectorValidator,
  MultipleSelectorValidatorMessage
} from "src/app/components/formly-components/multiple-selector/multiple-selector.component";
import {
  FileAdditionSelectorComponent,
  FileAdditionSelectorValidator,
  FileAdditionSelectorValidatorMessage,
} from './file-addition-selector/file-addition-selector.component';
import {DataWrapperComponent} from "src/app/components/formly-components/data-wrapper/data-wrapper.component";
import {
  SubprocessWrapperComponent
} from "src/app/components/formly-components/subprocess-wrapper/subprocess-wrapper.component";
import {AdvancedParametersWrapperComponent} from "./advanced-parameters-wrapper/advanced-parameters-wrapper.component";
import {GeolayerSelectorComponent} from "src/app/components/formly-components/geolayer-selector/geolayer-selector.component";
import {TaxsetFieldComponent} from "src/app/components/formly-components/taxset-field/taxset-field.component";
import {MonophylyComponent} from "src/app/components/formly-components/monophyly/monophyly.component";
import {LabelComponent} from "src/app/components/formly-components/label/label.component";
import {SelectComponent} from "src/app/components/formly-components/select/select.component";
import {InputFormlyComponent} from "src/app/components/formly-components/input-formly/input-formly.component";
import {
  AnnotationTextFieldComponent
} from "src/app/components/formly-components/annotations/annotation-text-field/annotation-text-field.component";
import {
  AnnotationTextFieldReadComponent
} from "src/app/components/formly-components/annotations/annotation-text-field-read/annotation-text-field-read.component";
import {
  AnnotationTextOptionsComponent
} from "src/app/components/formly-components/annotations/annotation-text-options/annotation-text-options.component";
import {
  AnnotationTextOptionsReadComponent
} from "src/app/components/formly-components/annotations/annotation-text-options-read/annotation-text-options-read.component";
import {WoodedSelectorComponent} from "src/app/components/formly-components/wooded-selector/wooded-selector.component";
import {FormlyModule} from "@ngx-formly/core";
import {TaxsetComponent} from "./taxset/taxset.component";
import {DynamicBrowseComponent} from "../dynamics/dynamic-browse/dynamic-browse.component";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzSpinModule} from "ng-zorro-antd/spin";
import {NzTreeModule} from "ng-zorro-antd/tree";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzUploadModule} from "ng-zorro-antd/upload";
import {NzCollapseModule} from "ng-zorro-antd/collapse";
import {NzCardModule} from "ng-zorro-antd/card";
import {CollectionsBrowseComponent} from "../../pages/molecular-data/collections/collections-browse/collections-browse.component";
import {SuperMatrixBrowseComponent} from "../../pages/molecular-data/super-matrix/super-matrix-browse/super-matrix-browse.component";
import {SharedModule} from "../../shared-module/shared.module";
import {NzListModule} from "ng-zorro-antd/list";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzTagModule} from "ng-zorro-antd/tag";
import {NzTabsModule} from "ng-zorro-antd/tabs";
import {FormlyNgZorroAntdModule} from "@ngx-formly/ng-zorro-antd";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzRadioModule} from "ng-zorro-antd/radio";
import { SelectLazyLoadingFormlyComponent } from './select-lazy-loading-formly/select-lazy-loading-formly.component';
import {SelectLazyLoadingComponent} from "../miscellaneous/select-lazy-loading/select-lazy-loading.component";
import {NzDatePickerModule} from "ng-zorro-antd/date-picker";
import { InputRangeFormlyComponent } from './input-range-formly/input-range-formly.component';
import {NzInputNumberModule} from "ng-zorro-antd/input-number";
import {DragDropModule} from "@angular/cdk/drag-drop";
import {NzCheckboxModule} from "ng-zorro-antd/checkbox";
import {NzGridModule} from "ng-zorro-antd/grid";
import {InfoModalComponent} from "../miscellaneous/info-modal/info-modal.component";
import {Upload2filesAPIComponent} from "../miscellaneous/upload2filesAPI/upload2filesAPI.component";


@NgModule({
  declarations: [
    AlignmentSelectorComponent,
    SequenceSelectorComponent,
    PhylotreeSelectorComponent,
    MultipleSelectorComponent,
    DataWrapperComponent,
    SubprocessWrapperComponent,
    GeolayerSelectorComponent,
    TaxsetFieldComponent,
    MonophylyComponent,
    LabelComponent,
    SelectComponent,
    InputFormlyComponent,
    AnnotationTextFieldComponent,
    AnnotationTextFieldReadComponent,
    AnnotationTextOptionsComponent,
    AnnotationTextOptionsReadComponent,
    WoodedSelectorComponent,
    AdvancedParametersWrapperComponent,
    SelectLazyLoadingFormlyComponent,
    InputRangeFormlyComponent,
    FileAdditionSelectorComponent
  ],
  imports: [
    SelectLazyLoadingComponent,
    CommonModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    NzSpinModule,
    NzTreeModule,
    NzInputModule,
    NzUploadModule,
    NzCollapseModule,
    NzCardModule,
    NzSelectModule,
    TaxsetComponent,
    DynamicBrowseComponent,
    CollectionsBrowseComponent,
    SuperMatrixBrowseComponent,
    NzListModule,
    NzIconModule,
    NzTableModule,
    NzTagModule,
    NzTabsModule,
    NzButtonModule,
    NzRadioModule,
    NzDatePickerModule,
    NzCheckboxModule,
    NzGridModule,
    FormlyNgZorroAntdModule,
    FormlyModule.forRoot({
      validators: [
        {name: 'sequence-selector', validation: SequenceSelectorValidator},
        {name: 'phylotree-selector', validation: PhylotreeSelectorValidator},
        {name: 'alignment-selector', validation: AlignmentSelectorValidator},
        {name: 'multiple-selector', validation: MultipleSelectorValidator},
        {name: 'file-addition-selector', validation: FileAdditionSelectorValidator},
      ],
      validationMessages: [
        {name: 'required', message: 'This field is required'},
        {name: 'sequence-selector', message: SequenceSelectorValidatorMessage},
        {name: 'phylotree-selector', message: PhylotreeSelectorValidatorMessage},
        {name: 'alignment-selector', message: AlignmentSelectorValidatorMessage},
        {name: 'multiple-selector', message: MultipleSelectorValidatorMessage},
        {name: 'file-addition-selector', message: FileAdditionSelectorValidatorMessage},
      ],
      wrappers: [
        {name: 'data-wrapper', component: DataWrapperComponent},
        {name: 'subprocess-wrapper', component: SubprocessWrapperComponent},
        {name: 'advanced-parameters-wrapper', component: AdvancedParametersWrapperComponent}
      ],
      types: [
        {name: 'wooded-selector', component: WoodedSelectorComponent},
        {name: 'sequence-selector', component: SequenceSelectorComponent, wrappers: ['data-wrapper']},
        {name: 'phylotree-selector', component: PhylotreeSelectorComponent, wrappers: ['data-wrapper']},
        {name: 'alignment-selector', component: AlignmentSelectorComponent},
        {name: 'multiple-selector', component: MultipleSelectorComponent, wrappers: ['data-wrapper']},
        {name: 'geolayer-selector', component: GeolayerSelectorComponent, wrappers: ['data-wrapper']},
        {name: 'taxset-field', component: TaxsetFieldComponent},
        {name: 'monophyly', component: MonophylyComponent},
        {name: 'label', component: LabelComponent},
        {name: 'customSelect', component: SelectComponent},
        {name: 'customInput', component: InputFormlyComponent},
        {name: 'annotation-text', component: AnnotationTextFieldComponent},
        {name: 'annotation-text-read', component: AnnotationTextFieldReadComponent},
        {name: 'annotation-text-options', component: AnnotationTextOptionsComponent},
        {name: 'annotation-text-options-read', component: AnnotationTextOptionsReadComponent},
        {name: 'file-addition-selector', component: FileAdditionSelectorComponent},
        {name: 'select-lazy-loading', component: SelectLazyLoadingFormlyComponent},
        {name: 'customRange', component: InputRangeFormlyComponent}
      ],
    }),
    NzInputNumberModule,
    DragDropModule,
    InfoModalComponent,
    Upload2filesAPIComponent,
  ],
  exports: [
    FormlyNgZorroAntdModule,
    FormlyModule,
  ]
})
export class FormlyComponentsModule { }
