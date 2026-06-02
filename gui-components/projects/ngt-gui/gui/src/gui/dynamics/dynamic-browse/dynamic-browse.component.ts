import {Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, AfterViewInit, Inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  BackendServiceInterface,
  BACKEND_SERVICE,
  MESSAGE_LOG_SERVICE,
  MessageLogServiceInterface,
  STATE_SERVICE,
  StateServiceInterface

} from 'ngt-gui/core';
import {DynamicTableComponent, ICustomActionButton} from '../dynamic-table/dynamic-table.component';
import {FilterDetailComponent} from '../../miscellaneous/filter/filter-detail/filter-detail.component';
import {CommonModule} from "@angular/common";
import {SharedModule} from "../../../modules/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzSpaceModule} from "ng-zorro-antd/space";
import {NzPageHeaderModule} from "ng-zorro-antd/page-header";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {NzInputModule} from "ng-zorro-antd/input";
import {NzIconModule} from "ng-zorro-antd/icon";
import {TopAreaService} from "../../../services/top-area.service";
import {Subscription} from "rxjs";

@Component({
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        ReactiveFormsModule,
        NzButtonModule,
        NzSpaceModule,
        NzPageHeaderModule,
        NzInputModule,
        NzIconModule,
        DynamicTableComponent,
        FilterDetailComponent,
    ],
    selector: 'app-dynamic-browse',
    templateUrl: './dynamic-browse.component.html',
    styleUrls: ['./dynamic-browse.component.sass']
})
export class DynamicBrowseComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    @Inject(BACKEND_SERVICE) private backendService: BackendServiceInterface,
    @Inject(MESSAGE_LOG_SERVICE) private logService: MessageLogServiceInterface,
    @Inject(STATE_SERVICE) private stateService: StateServiceInterface,
    private activeRoute: ActivatedRoute,
    private readonly topAreaService: TopAreaService,
  ) {
  }

  @ViewChild(DynamicTableComponent, {static: true})
  dynamicTable: DynamicTableComponent;

  @ViewChild(FilterDetailComponent, {static: true})
  browserFilter: FilterDetailComponent;

  // BROWSER STATE
  @Input() BrowserTitle: string;
  @Input() BrowserType: string;
  @Input() Loading: boolean = false;
  loadingChadoRequest = true;
  searchValue: string = '';
  fieldID: any;
  pageData: any = [];
  totalSize = 0;
  confirmState = false;
  itemsSelectionWhenConfirmed: { items: Set<number>, checkedAll: boolean } = null;

  // BROWSER CUSTOM BUTTONS
  @Input() CustomButtonsBrowser: {
    title: string,
    eventEmitter: EventEmitter<any>,
    minimumNumberCheckedItem?: number,
    cantCheckedAllItem?: boolean,
    canOnlyCheckOne?: boolean,
    cantOnlyCheckOne?: boolean,
    funcCondition?: () => boolean,
    getObject?: boolean,
  }[] = [];

  // HIDDEN BROWSER EVENT EMITTERS
  @Input() HiddenImport = false;
  @Input() HiddenCreate = false;
  @Input() HiddenExport = false;
  @Input() HiddenDelete = false;
  @Input() HiddenPermissions = false;
  @Input() HiddenOpen = false;
  @Input() HiddenSelect = false;
  @Input() HiddenModify = false;
  @Input() HiddenBulkInsert = true;
  @Input() HiddenDeleteItemFunc: (item: any) => boolean

  // BROWSER EVENT EMITTERS
  @Output() CreateEvent: EventEmitter<any> = new EventEmitter();
  @Output() BulkInsertEvent: EventEmitter<any> = new EventEmitter();
  @Output() ImportEvent: EventEmitter<any> = new EventEmitter();
  @Output() ExportSelectedEvent: EventEmitter<any> = new EventEmitter();
  @Output() DeleteSelectedEvent: EventEmitter<any> = new EventEmitter();
  @Output() SetSelectedEvent: EventEmitter<any> = new EventEmitter();
  @Input() CustomActionButtons: ICustomActionButton[] = [];

  // TABLE EVENT EMITTERS
  // @Output() SortEvent: EventEmitter<any> = new EventEmitter();
  @Output() OpenItemEvent: EventEmitter<any> = new EventEmitter();
  @Output() ModifyItemEvent: EventEmitter<any> = new EventEmitter();
  @Output() ExportItemEvent: EventEmitter<any> = new EventEmitter();
  @Output() DeleteItemEvent: EventEmitter<any> = new EventEmitter();
  @Output() PermissionItemEvent: EventEmitter<any> = new EventEmitter();

  @Output() UpdateDataEvent: EventEmitter<{ type: string, data: any }> = new EventEmitter();

  // TABLE INPUTS
  @Input() HiddenPaginationSwitch = true;
  @Input() ExcludeFields: string[] = [];
  @Input() DefaultShowFields: string[] = [];
  @Input() Checkable = true;
  @Input() CanMultipleCheckItems = true;
  @Input() CheckableAll = true;

  // CUSTOM PARAMETERS
  @Input() CustomParametersRequest: any = {};
  @Input() CustomFiltersRequest: any = {};

  // FILTER STATE
  selectedFilter: string = '';
  filterState: any = {};

  caseStudiesSubscription: Subscription;

  ngOnInit(): void {
    this.fieldID = this.backendService.getFieldID(this.BrowserType);
    this.initCaseStudiesSubscriptionSubscription();
    if (this.stateService.states.gbl_cs) {
      this.addCaseStudiesInCustomFilter();
    }
  }

  initCaseStudiesSubscriptionSubscription() {
    this.caseStudiesSubscription = this.stateService.stateServiceEvent.subscribe((event: {
      type: string,
      value: any
    }) => {
      if (this.stateService.states.gbl_cs) {
        this.addCaseStudiesInCustomFilter();
      } else {
        if (this.CustomFiltersRequest.case_studies_) {
          delete this.CustomFiltersRequest.case_studies_;
        }
      }
      this.dynamicTable.pageIndex = 1;
      this.changePage();
    });
  }

  addCaseStudiesInCustomFilter() {
    this.CustomFiltersRequest.case_studies_ = {
      op: 'in',
      unary: [this.stateService.states.gbl_cs],
    };
  }

  ngAfterViewInit(): void {

  }

  ngOnDestroy(): void {
    if(this.caseStudiesSubscription !== undefined) {
      this.caseStudiesSubscription.unsubscribe();
    }
  }

  getState() {
    return {searchValue: this.searchValue};
  }

  setState(s: any) {
    if (s) {
      if (s.searchValue) {
        this.searchValue = s.searchValue;
      }
    }
  }

  newSearch() {
    this.dynamicTable.restart();
    this.searchEvent();
  }

  applyFilter(filter) {
    // this.filterState = filter;
    this.newSearch();
  }

  changePage() {
    this.searchEvent();
  }

  checkedChangeEvent(event: { items: Set<number>, checkedAll: boolean }): void {
    if (!this.itemsSelectionWhenConfirmed) {
      this.confirmState = false;
      return;
    }
    if (this.itemsSelectionWhenConfirmed.checkedAll != event.checkedAll) {
      this.confirmState = false;
      return;
    }
    if (this.itemsSelectionWhenConfirmed.items.size != event.items.size) {
      this.confirmState = false;
      return;
    }
    for (const item of this.itemsSelectionWhenConfirmed.items) {
      if (!event.items.has(item)) {
        this.confirmState = false;
        return;
      }
    }
    this.confirmState = true;
  }

  private searchEvent() {
    this.UpdateDataEvent.emit({type: "startUpdate", data: null});
    this.loadingChadoRequest = true;
    const filters = this.browserFilter.getFilter();
    for (const key in this.CustomFiltersRequest) {
      filters[key] = this.CustomFiltersRequest[key];
    }
    const params = {
      'filter': filters,
      'order': this.dynamicTable.getOrder(),
      'searchValue': this.searchValue,
      ...this.CustomParametersRequest,
    };
    if (this.dynamicTable.getPaginationSwitch()) {
      params.pagination = this.dynamicTable.getPagination();
    }
    if (this.dynamicTable.showOnlySelected) {
      params.filter[this.fieldID] = {
        op: 'in',
        unary: Array.from(this.dynamicTable.checkedItems.values()),
      }
    }
    this.backendService.getGenericRequest(this.BrowserType, undefined, params).subscribe({
      next: (response: any) => {
        this.pageData = response['content'] ? response['content'] : [];
        this.totalSize = response['count'];
        this.logService.addIssues(response['issues']);
        this.loadingChadoRequest = false;
        this.UpdateDataEvent.emit({type: "endUpdate", data: null});
      },
      error: (error) => {
        this.totalSize = 0;
        this.logService.addIssues(error['issues']);
        this.loadingChadoRequest = false;
        this.UpdateDataEvent.emit({type: "endUpdate", data: null});
      }
    });
  }

  sortEvent(event) {
    this.searchEvent();
  }

  selectedEvent() {
    let selectionFilter = this.dynamicTable.getSelectionFilter();
    if (this.dynamicTable.checkedAll) {
      selectionFilter = {...this.browserFilter.getFilter(), ...selectionFilter};
    }
    this.SetSelectedEvent.emit({filter: selectionFilter});
    this.itemsSelectionWhenConfirmed = {
      items: new Set(this.dynamicTable.checkedItems),
      checkedAll: this.dynamicTable.checkedAll,
    };
    this.confirmState = true;
  }

  exportSelection(selection, order) {
    let filter = {...selection, ...this.browserFilter.getFilter()};
    this.ExportSelectedEvent.emit({'filter': filter, 'order': order});
  }

  deleteSelection(selection) {
    let filter = {...selection, ...this.browserFilter.getFilter()};
    this.stateService.states.gbl_cs && (filter['case_study_id'] = this.stateService.states.gbl_cs)
    this.DeleteSelectedEvent.emit({'filter': filter});
  }

  clickCustomButton(item) {
    if (item.getObject) {
      item.eventEmitter.emit({
        objects: this.dynamicTable.checkedItemsObject,
        filter: this.dynamicTable.getSelectionFilter(),
      });
      return;
    }
    item.eventEmitter.emit(this.dynamicTable.getSelectionFilter());
  }

  disableCustomButton(button) {
    if (!button.needCheckedItem) {
      return false;
    }
    if (this.dynamicTable.checkedItems.size === 0) {
      if (!this.dynamicTable.checkedAll) {
        return true;
      }
    }
    if (this.dynamicTable.checkedAll && button.cantCheckedAllItem) {
      return true;
    }
    if (button.cantOnlyCheckOne && this.dynamicTable.checkedItems.size == 1) {
      return true;
    }
    return false;
  }

}
