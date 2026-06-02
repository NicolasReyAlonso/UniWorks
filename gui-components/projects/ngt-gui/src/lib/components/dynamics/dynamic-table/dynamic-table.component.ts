import {Component, Input, Output, OnInit, OnDestroy, EventEmitter} from '@angular/core';
import { StateService } from 'ngt-gui/core';
import {ActivatedRoute} from '@angular/router';
import {CommonModule} from '@angular/common';
import {SharedModule} from "../../../shared-module/shared.module";
import {NzDropDownModule} from "ng-zorro-antd/dropdown";
import {NzIconModule} from "ng-zorro-antd/icon";
import {NzListModule} from "ng-zorro-antd/list";
import {NzCheckboxModule} from "ng-zorro-antd/checkbox";
import {NzTableModule} from "ng-zorro-antd/table";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzSwitchModule} from "ng-zorro-antd/switch";
import {NzButtonModule} from "ng-zorro-antd/button";

export interface ICustomActionButton {
  iconType: string,
  type: 'default' | 'dropdown',
  eventEmitter: EventEmitter<{ event: string, data: any }>,
  event?,
  dropdownItems?: { event: string, label: string }[],
}

@Component({
    selector: 'app-dynamic-table',
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzDropDownModule,
        NzIconModule,
        NzListModule,
        NzCheckboxModule,
        NzTableModule,
        NzSelectModule,
        NzSwitchModule,
        NzButtonModule,
    ],
    templateUrl: './dynamic-table.component.html',
    styleUrls: ['./dynamic-table.component.sass']
})
export class DynamicTableComponent implements OnInit, OnDestroy {

  sort = {
    sortOrder: null,
    sortFn: (a, b) => {
      a.name.localeCompare(b.name)
    },
    sortDirections: ['ascend', 'descend', null],
  };

  constructor(private stateService: StateService,
              private activeRoute: ActivatedRoute) {
  }

  @Output() PaginationEvent: any = new EventEmitter();
  @Output() SortEvent = new EventEmitter();
  @Output() OpenEvent = new EventEmitter();
  @Output() ModifyEvent = new EventEmitter();
  @Output() ExportEvent = new EventEmitter();
  @Output() DeleteEvent = new EventEmitter();
  @Output() PermissionEvent = new EventEmitter();
  @Output() ClickRowEvent = new EventEmitter();
  @Output() ResetSelectionEvent = new EventEmitter();
  @Output() CheckedChangeEvent: EventEmitter<{ items: Set<number>, checkedAll: boolean }> = new EventEmitter();

  @Input() hiddenPaginationSwitch = true;
  @Input() hiddenOpenAction = false;
  @Input() hiddenModifyAction = false;
  @Input() hiddenExportAction = false;
  @Input() hiddenDeleteAction = false;
  @Input() hiddenPermissionAction = false;
  @Input() ClickRowEventActive = false;
  @Input() CheckableAll = false;

  @Input() Loading: boolean = true;
  @Input() PageData: any[] = [];
  @Input() DataSize: number = 0;
  @Input() DataFieldID: string = 'id';
  @Input() DataFields: string[] = [];
  @Input() ExcludeFields: string[] = [];
  @Input() DefaultShowFields: string[] = [];
  @Input() Checkable: boolean = true;
  @Input() CanMultipleCheckItems: boolean = true;
  @Input() CustomActionButtons: ICustomActionButton[] = [];
  @Input() HiddenDeleteItemFunc: (item: any) => boolean;

  paginationSwitch = true;
  pageIndex = 1;
  pageSize = 10;
  checkedItems = new Set<number>();
  checkedItemsObject = new Map<number, any>();
  checkedAll = false;
  selectedFields = [];
  sortedFields = new Map();
  showOnlySelected = false;

  // PERSISTENCE
  ngOnInit(): void {
    console.log(this.CustomActionButtons);
  }

  ngOnDestroy(): void {

  }

  getState() {
    return {
      'pageIndex': this.pageIndex,
      'pageSize': this.pageSize,
      'checkedItems': this.checkedItems,
      'checkedAll': this.checkedAll,
      'selectedFields': this.selectedFields,
      'sortedFields': this.sortedFields,
    };
  }

  setState(s: any) {
    if (s) {
      if (s.pageIndex) {
        this.pageIndex = s.pageIndex;
      }
      if (s.pageSize) {
        this.pageSize = s.pageSize;
      }
      if (s.checkedItems) {
        this.checkedItems = s.checkedItems;
      }
      if (s.checkedAll) {
        this.checkedAll = s.checkedAll;
      }
      if (s.selectedFields) {
        this.selectedFields = s.selectedFields;
      }
      if (s.sortedFields) {
        this.sortedFields = s.sortedFields;
      }
    }
  }

  // GETTERS
  getPagination() {
    return {'pageIndex': this.pageIndex, 'pageSize': this.pageSize};
  }

  getSelectionFilter() {
    let filter = {};
    if (!this.checkedItems.size) return filter;
    let op = this.checkedAll ? 'out' : 'in';
    filter[this.DataFieldID] = {'op': op, 'unary': Array.from(this.checkedItems)};
    return filter;
  }

  getOrder() {
    let order = [];
    this.sortedFields.forEach((value, key, map) => {
      order.push({'field': key, 'order': value});
    });
    return order;
  }

  // RESET
  restart() {
    this.pageIndex = 1;
    this.selectedFields = [];
    this.sortedFields = new Map();
  }

  // VISIBLES FIELDS
  changePageData(data): void {
    this.DataFields = [];
    for (const key in data[0]) {
      if (!this.ExcludeFields.includes(key))
        if (key != 'residues' && !key.startsWith('_') && !key.endsWith('_id')) this.DataFields.push(key);
    }
    if (this.selectedFields.length < 1) {
      this.selectedFields = this.DefaultShowFields.length > 0 ? this.DefaultShowFields.filter(value => this.DataFields.includes(value)) : ['name', 'accession',
        'uniquename', 'timeaccessioned',
        'program', 'programversion',
        'genus', 'species',
        'organism', 'gene',
      ].filter(value => {
        return this.DataFields.includes(value);
      });
    }
  }

  // PAGINATION CHANGE
  changePageIndex(value) {
    this.pageIndex = value;
    this.PaginationEvent.emit(this.getPagination());
  }

  changePageSize(value) {
    this.pageSize = value;
    this.PaginationEvent.emit(this.getPagination());
  }

  // CHECKLIST LOGIC
  onItemChecked(item: any, value): void {
    if (this.checkedAll) value = !value;
    if (value) {
      if (!this.CanMultipleCheckItems) {
        this.checkedItems.clear();
        this.checkedItemsObject.clear();
      }
      this.checkedItems.add(item[this.DataFieldID]);
      this.checkedItemsObject.set(item[this.DataFieldID], item);
    } else {
      this.checkedItems.delete(item[this.DataFieldID]);
      this.checkedItemsObject.delete(item[this.DataFieldID]);
    }
    this.CheckedChangeEvent.emit({items: this.checkedItems, checkedAll: this.checkedAll});
  }

  onAllChecked(value): void {
    this.checkedAll = value;
    this.checkedItems.clear();
    this.checkedItemsObject.clear();
    this.CheckedChangeEvent.emit({items: this.checkedItems, checkedAll: this.checkedAll});
  }

  isItemChecked(item): boolean {
    return this.checkedAll ? !this.checkedItems.has(item[this.DataFieldID]) : this.checkedItems.has(item[this.DataFieldID]);
  }

  clearItemsChecked() {
    this.checkedItems.clear();
    this.checkedItemsObject.clear();
  }

  removeItemByKey(key) {
    this.checkedItemsObject.delete(key);
    this.checkedItems.delete(key);
  }

  clickRow(item): void {
    if (this.ClickRowEventActive) {
      this.ClickRowEvent.emit(item);
    }
  }

  // EVENTS
  open(item) {
    this.OpenEvent.emit(item);
  }

  modify(item) {
    this.ModifyEvent.emit(item);
  }

  export(item) {
    this.ExportEvent.emit(item);
  }

  delete(item) {
    this.DeleteEvent.emit(item);
  }

  permission(item) {
    this.PermissionEvent.emit(item);
  }

  sorting(field, order) {
    this.sortedFields.set(field, order);
    if (order == null) this.sortedFields.delete(field);
    this.SortEvent.emit(this.getOrder());
  }

  isHiddenAction(): boolean {
    if (!this.hiddenOpenAction && this.OpenEvent.observers.length > 0) {
      return false;
    }
    if (!this.hiddenModifyAction && this.ModifyEvent.observers.length > 0) {
      return false;
    }
    if (!this.hiddenExportAction && this.ExportEvent.observers.length > 0) {
      return false;
    }
    if (!this.hiddenDeleteAction && this.DeleteEvent.observers.length > 0) {
      return false;
    }
    if (!this.hiddenPermissionAction && this.PermissionEvent.observers.length > 0) {
      return false;
    }
    return true;
  }

  paginationSwitchChange(event: boolean): void {
    this.PaginationEvent.emit(this.getPagination());
  }

  getPaginationSwitch(): boolean {
    return this.paginationSwitch;
  }

  async clickCustomActionButton(item: any, customActionButton: ICustomActionButton, event: string) {
    customActionButton.eventEmitter.emit({
      event,
      data: item,
    });
  }

  showOnlySelectedSwitchChange(event: boolean) {
    this.showOnlySelected = event;
    this.pageIndex = 1;
    this.PaginationEvent.emit(this.getPagination());
  }

  resetSelected() {
    this.checkedItems.clear();
    this.checkedItemsObject.clear();
    this.ResetSelectionEvent.emit()
    if (this.showOnlySelected) {
      this.showOnlySelected = false;
      this.pageIndex = 1;
      this.PaginationEvent.emit(this.getPagination());
    }
  }
}

