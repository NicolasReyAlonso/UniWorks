import {Component, EventEmitter, Input, Output} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup} from "@angular/forms";
import {BackendService} from 'ngt-gui/core';
export interface INextgendemGeoLayerModalMapSettingsFormValue {
  baseLayer: string | { url: string, label: string };
  baseLayerType: string;
  projection: string;
}


@Component({
    selector: 'app-nextgendem-geolayer-map-settings',
    templateUrl: './nextgendem-geolayer-map-settings.component.html',
    styleUrls: ['./nextgendem-geolayer-map-settings.component.sass'],
    standalone: false
})
export class NextgendemGeolayerMapSettingsComponent {

  projectionsMap = [];
  @Input() isVisible = true;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Input() loading = false;
  @Output() loadingChange = new EventEmitter<boolean>();
  @Output() acceptEmmiter = new EventEmitter<INextgendemGeoLayerModalMapSettingsFormValue>();

  formGroup: UntypedFormGroup;
  baseLayerDefaultOptions: { label: string, value: string }[] = [];

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly backendService: BackendService,
  ) {
  }

  ngOnInit(): void {
    this.initFormGrop();
  }

  initFormGrop() {
    this.formGroup = this.fb.group({
      baseLayer: [''],
      baseLayerType: ['default'],
      projection: [''],
    });
    this.formGroup.get('baseLayerType').valueChanges.subscribe((value) => {

    });
  }

  async openModal(): Promise<void> {
    this.loading = true
    this.changeVisibleState(true);
    try {
      const response: any = await this.backendService.getHierarchyNodes(null, {hierarchy_id: 4}).toPromise();
      const content = response.content;
      const options = [];
      for (const baseLayerDefault of content) {
        const baseLayerControl = this.formGroup.get('baseLayer');
        const baseLayerTypeControl = this.formGroup.get('baseLayerType');
        const nameSplit = baseLayerDefault.name.split('-');
        const url = nameSplit[1].trim();
        const value = {
          label: nameSplit[0].trim(),
          url
        };
        if (typeof baseLayerControl.value === 'string' && baseLayerControl.value.startsWith(url) && baseLayerTypeControl.value === 'default') {
          baseLayerControl.setValue(value);
        }
        options.push({
          label: nameSplit[0].trim(),
          value,
        });
      }
      options.unshift({
        label: 'OpenStreetMap',
        value: '',
      });
      this.baseLayerDefaultOptions = options;
    } catch (e) {

    }
    this.loading = false;
  }

  changeVisibleState(value): void {
    this.isVisible = value;
    this.isVisibleChange.emit(this.isVisible);
  }

  changebaseLayerTypeEvent(event): void {
    this.formGroup.get('baseLayer').setValue('');
  }

  onCancelClick() {
    this.changeVisibleState(false);
  }

  onAcceptClick() {
    const value: INextgendemGeoLayerModalMapSettingsFormValue = {
      baseLayer: this.formGroup.get('baseLayer').value,
      baseLayerType: this.formGroup.get('baseLayerType').value,
      projection: this.formGroup.get('projection').value,
    };
    this.acceptEmmiter.emit(value);
  }

}
