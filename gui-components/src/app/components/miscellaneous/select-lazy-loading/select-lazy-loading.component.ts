import {
  AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges, TemplateRef, ViewChild
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BackendService} from 'ngt-gui/core';
import {lastValueFrom} from 'rxjs';
import {NzSelectModule} from 'ng-zorro-antd/select';
import {NzSpinModule} from 'ng-zorro-antd/spin';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SharedModule} from 'ngt-gui/gui';
import {NzInputModule} from "ng-zorro-antd/input";
import {NzIconModule} from "ng-zorro-antd/icon";

@Component({
    selector: 'app-select-lazy-loading',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        SharedModule,
        NzSelectModule,
        NzSpinModule,
        FormsModule,
        ReactiveFormsModule,
        NzInputModule,
        NzSpinModule,
        NzIconModule,
    ],
    templateUrl: './select-lazy-loading.component.html',
    styleUrls: ['./select-lazy-loading.component.sass']
})
export class SelectLazyLoadingComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() value: any[] | any;
  @Input() variableValue: string;
  @Input() object_type: string;
  @Input() variableLabel: string | { template: string, variablesLabel: string[] };
  @Input() variableGroup: string;
  @Input() msWaitToLoadOnSearch: number;
  @Input() sizePage: number;
  @Input() disableSelect: boolean;
  @Input() placeholder: string;
  @Input() multiple: boolean;
  @Input() allowClear: boolean;
  @Input() customFilter: any;
  @Input() customParams: any;

  @Output() valueChange = new EventEmitter<any>();

  @ViewChild('loadingOption') loadingOption;

  pageIndex: number = 1;
  options: any[] = [];
  loadingData: boolean = false;
  totalPages: number = 0;
  timeoutOnSearch: NodeJS.Timeout;
  searchValue: string = "";
  firstLoad = false;
  loadOption;

  constructor(
    private readonly backendService: BackendService,
    private readonly cdRef: ChangeDetectorRef,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.loadingData = true;
    this.setDefaultInputsIfNull()
    await this.loadInitialValueData();
    await this.loadNewData();
    this.loadingData = false;
    this.firstLoad = true;
    this.cdRef.detectChanges();
  }

  setDefaultInputsIfNull() {
    this.msWaitToLoadOnSearch = this.msWaitToLoadOnSearch ?? 1000;
    this.sizePage = this.sizePage ?? 20;
    this.disableSelect = this.disableSelect ?? false;
    this.multiple = this.multiple ?? false;
    this.allowClear = this.allowClear ?? false;
    this.customFilter = this.customFilter ?? {};
    this.customParams = this.customParams ?? {};
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {

  }

  ngAfterViewInit() {
    this.loadOption = {
      label: this.loadingOption,
      value: -9999,
      disabled: true,
    };
  }

  async loadInitialValueData() {
    const response: any = await lastValueFrom(this.backendService.getGenericRequest(this.object_type, null, {
      filter: {
        [this.variableValue]: {
          op: this.multiple ? 'in' : 'eq',
          unary: this.value,
        },
        ...this.customFilter,
      },
      ...this.customParams,
    }));
    for (let element of response.content) {
      const item: any = {
        label: this.getLabel(element),
        value: element[this.variableValue],
      }
      this.options = [...this.options, item];
    }
    this.cdRef.detectChanges();
  }

  async loadNewData(searchValue?, options?): Promise<void> {
    const filter: any = {
      ...this.customFilter
    };
    if (this.value) filter[this.variableValue] = {
        op: this.multiple ? 'out' : 'ne',
        unary: this.value,
    };
    if (searchValue && searchValue !== '') {
      const variableSearch = typeof this.variableLabel === 'string' ? this.variableLabel : this.variableLabel.variablesLabel[0];
      filter[variableSearch] = {
        op: 'ilike',
        unary: `%${searchValue}%`,
      }
    }
    const response: any = await lastValueFrom(this.backendService.getGenericRequest(this.object_type, null, {
      filter,
      pagination: {
        pageIndex: this.pageIndex,
        pageSize: this.sizePage,
      },
      ...this.customParams,
    }));
    this.totalPages = Math.ceil(response.count / this.sizePage);
    const newElements = [];
    for (let element of response.content) {
      const item: any = {
        label: this.getLabel(element),
        value: element[this.variableValue],
      }
      if (this.variableGroup) {
        item.groupLabel = element[this.variableGroup]
      }
      newElements.push(item);
    }
    if (options && options.deleteLastElement) {
      this.options.pop();
    }
    this.options = [...this.options, ...newElements];
    this.cdRef.detectChanges();
    this.pageIndex++;
  }

  async scrollBottomEvent(event): Promise<void> {
    if (!this.loadingData && this.pageIndex <= this.totalPages) {
      this.loadingData = true;
      this.options = [...this.options, this.loadOption];
      this.cdRef.detectChanges();
      await this.loadNewData(this.searchValue, {deleteLastElement: true});
      this.loadingData = false;
    }
  }

  valueChangeEvent(event: any) {
    this.value = event;
    this.valueChange.emit(this.value);
  }

  onSearchChange(searchValue) {
    if (searchValue === this.searchValue) return;
    this.searchValue = searchValue;
    this.pageIndex = 1;
    this.options = [];
    this.options = [...this.options, this.loadOption];
    this.cdRef.detectChanges();
    this.loadingData = true;
    if (this.timeoutOnSearch) {
      clearTimeout(this.timeoutOnSearch);
    }
    this.timeoutOnSearch = setTimeout(async () => {
      if (!this.multiple) {
        this.options.pop();
        await this.loadInitialValueData();
        this.options = [...this.options, this.loadOption];
        this.cdRef.detectChanges();
      }
      await this.loadNewData(searchValue, {deleteLastElement: true});
      this.loadingData = false;
    }, this.msWaitToLoadOnSearch);
  }

  getLabel(option: any): string {
    if (typeof this.variableLabel === 'string') {
      return option[this.variableLabel];
    } else {
      let label = this.variableLabel.template;
      const variablesLabel = this.variableLabel.variablesLabel;
      for (let i = 0; i < variablesLabel.length; i++) {
        label = label.replace(`$${i}`, option[variablesLabel[i]]);
      }
      return label;
    }
  }


}
