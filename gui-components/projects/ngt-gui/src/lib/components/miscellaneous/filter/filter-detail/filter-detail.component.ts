import {Component, Input, EventEmitter, OnInit, Output, ChangeDetectorRef} from '@angular/core';
import {FormlyFieldConfig, FormlyModule} from '@ngx-formly/core';
import {FormsModule, ReactiveFormsModule, UntypedFormGroup} from '@angular/forms';
import {BackendService} from 'ngt-gui/core';
import {MessageLogService} from 'ngt-gui/core';
import { CommonModule } from '@angular/common';
import {NzFormModule} from "ng-zorro-antd/form";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzButtonModule} from "ng-zorro-antd/button";
import {SharedModule} from "../../../../modules/shared.module";
import {NzSelectModule} from "ng-zorro-antd/select";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
import {NzDrawerModule} from "ng-zorro-antd/drawer";
import {NzIconModule} from "ng-zorro-antd/icon";

@Component({
    selector: 'app-filter-detail',
    imports: [
        CommonModule,
        SharedModule,
        FormlyModule,
        FormsModule,
        ReactiveFormsModule,
        NzFormModule,
        NzInputModule,
        NzButtonModule,
        NzSelectModule,
        NzPageHeaderModule,
        NzDrawerModule,
        NzIconModule
    ],
    templateUrl: './filter-detail.component.html',
    styleUrls: ['./filter-detail.component.sass']
})
export class FilterDetailComponent implements OnInit {

  constructor(private backendService: BackendService,
              // private stateService: StateService,
              // private activeRoute: ActivatedRoute,
              private readonly  changeDetectorRef: ChangeDetectorRef,
              private logService: MessageLogService) {}

  @Input()  browserType: string;
  @Output() applyFilterEvent = new EventEmitter<any>();

  showFilter: boolean = false;
  filters: any = [];

  @Input() selectedFilter: string = '';
  @Output() selectedFilterChange = new EventEmitter<string>();

  @Input() filterState: any = {};
  @Output() filterStateChange = new EventEmitter<any>();

  form = new UntypedFormGroup({});
  fields: FormlyFieldConfig[] = [];

  ngOnInit(): void {
    this.loadSavedFilters();
    this.backendService.getBrowserFilterForms(this.browserType).subscribe(
      response => {
        this.fields = response['content'] as any;
        this.logService.addIssues(response['issues']);
        for (let field of this.fields) {
          if (field.defaultValue !== null && field.defaultValue !== undefined && !Array.isArray(field.key) && !this.filterState[field.key]) {
            this.filterState[field.key] = field.defaultValue;
            this.filterStateChange.emit(this.filterState);
          }
        }
        this.applyFilterEvent.emit(this.getFilter());
      },
      error => { this.logService.addIssues(error['issues']); },
      () => {});
  }

  onSubmit() {
    this.applyFilterEvent.emit(this.getFilter());
    this.closeDrawer();
  }

  showDrawer() {
    this.showFilter = true;
  }

  closeDrawer() {
    this.showFilter = false;
  }

  newFilter(name: string) {
    if (!name) return;
    this.backendService.postBrowserFilters(this.browserType, name, this.filterState).subscribe(
      response => {this.logService.addIssues(response['issues'])},
      error => {this.logService.addIssues(error['issues'])},
      () => { this.loadSavedFilters(); });
  }

  private loadSavedFilters() {
    this.backendService.getBrowserFilters(this.browserType).subscribe(
      response => { this.filters = response['content'];},
      error => {}, () => {});
  }

  selectedFilterEvent() {
    this.filters.forEach(value => {
      if (value.id == this.selectedFilter) this.filterState = Object.assign({}, value.value);
    });
    this.selectedFilterChange.emit(this.selectedFilter);
    this.filterStateChange.emit(this.filterState);
  }

  modifiedFilterEvent() {
    this.filterStateChange.emit(this.filterState);
  }

  overwriteFilter() {
    this.backendService.putBrowserFilters(this.browserType, this.selectedFilter, this.filterState).subscribe(
      response => {this.logService.addIssues(response['issues'])},
      error => {this.logService.addIssues(error['issues'])},
      () => { this.loadSavedFilters(); });
  }

  deleteFilter(id) {
    this.backendService.deleteBrowserFilters(this.browserType, id).subscribe(
      response => {this.logService.addIssues(response['issues'])},
      error => {this.logService.addIssues(error['issues'])},
      () => { this.loadSavedFilters(); this.selectedFilter=''; });
  }

  getFilter() {
    let filter = {}
    for (const field of this.fields) {
      let key = field.key.toString();
      if(this.filterState[key] !== undefined && this.filterState[key] !== null) {
        if (!Array.isArray(this.filterState[key])) {
          if (key.endsWith('-to')) filter[key] = {'op': 'le', 'unary': this.filterState[key]};
          else if (key.endsWith('-from')) filter[key] = {'op': 'ge', 'unary': this.filterState[key]};
          else filter[key] = {'op': 'eq', 'unary': this.filterState[key]};
        } else if (field.type == 'customRange') {
          filter[key] = {'op': 'between', 'left': this.filterState[key][0], 'right': this.filterState[key][1]}
        } else if (this.filterState[key].length) filter[key] = {'op': 'in', 'unary': this.filterState[key]};
      }
    }
    return filter;
  }
}

