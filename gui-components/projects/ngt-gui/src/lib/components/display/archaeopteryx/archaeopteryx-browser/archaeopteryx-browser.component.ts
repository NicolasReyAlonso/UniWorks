import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CommonModule, Location} from "@angular/common";
import {MessageLogService} from "src/app/services/message-log.service";
import { HttpClient } from "@angular/common/http";
import { GlobalService } from 'ngt-gui/core';
import './archaeopteryx_dependencies/archaeopteryx';
import './archaeopteryx_dependencies/forester';
import {Observable, Subscription} from "rxjs";
import {BackendService} from 'ngt-gui/core';
import {v4 as uuid} from 'uuid';
import {NotificationService, TypeNotificationEnum} from "src/app/services/notification.service";
import {NzModalService} from "ng-zorro-antd/modal";
import {FilesService} from "src/app/services/files.service";
import {FormlyFieldConfig} from "@ngx-formly/core";
import {InternationalizationService} from "ngt-gui/core";
import { StateService } from 'ngt-gui/core';
import {DynamicInputModalComponent} from "../../../dynamics/dynamic-input-modal/dynamic-input-modal.component";
import {SharedModule} from "../../../../shared-module/shared.module";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzIconModule} from "ng-zorro-antd/icon";
import {ColorPickerModule} from "ngx-color-picker";
import {NzSelectModule} from "ng-zorro-antd/select";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

declare var archaeopteryx: any;
declare var d3: any;

enum NodeColorOptionsEnum {
  NODE = "NODE",
  NODES_CHILDREN = "NODES_CHILDREN",
  BRANCHES_CHILDREN = "BRANCHES_CHILDREN",
  NODES_AND_BRANCHES = "NODES_AND_BRANCHES",
}

@Component({
    selector: 'app-archaeopteryx-browser',
    imports: [
        CommonModule,
        DynamicInputModalComponent,
        SharedModule,
        NzButtonModule,
        NzIconModule,
        ColorPickerModule,
        NzSelectModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    templateUrl: './archaeopteryx-browser.component.html',
    styleUrls: ['./archaeopteryx-browser.component.sass'],
    encapsulation: ViewEncapsulation.None
})
export class ArchaeopteryxBrowserComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input('Url') Url: string;
  @Input() view: {};
  @Input('tree') tree;
  @Input() hiddenSaveProgress = true;

  private eventsSubscription: Subscription;
  public loading: boolean;
  private options = {};
  private settings = {};
  private branchColors = {};
  private nodeColors = {};
  private newickStr: string;
  private treeReceived = false;

  private totalBranches: number;
  private totalNodes: number;
  private windowListener: EventListener;
  private getState: any = {};

  static readonly DEFAULT_COLOR = '#909090';
  isVisibleSaveModal = false;
  isVisibleOverrideModal = false;
  saveModalFields: FormlyFieldConfig[];
  overrideModalFields: FormlyFieldConfig[];
  selectedSavedColor;
  color = ArchaeopteryxBrowserComponent.DEFAULT_COLOR;
  savedColors = [ArchaeopteryxBrowserComponent.DEFAULT_COLOR];
  nodeColorOptionSelected: NodeColorOptionsEnum = NodeColorOptionsEnum.NODE;
  readonly NODE_COLOR_OPTIONS = NodeColorOptionsEnum;

  oldText = '';

  constructor(
    private route: ActivatedRoute,
    private msg: MessageLogService,
    private http: HttpClient,
    private readonly globalVariablesServices: GlobalService,
    private readonly backendService: BackendService,
    private readonly notificationService: NotificationService,
    private readonly filesService: FilesService,
    private readonly location: Location,
    private modal: NzModalService,
    private internationalizationService: InternationalizationService,
    private readonly stateService: StateService,
  ) {
    this.loading = true;
  }

  ab2str(buf) {
    let str = "";
    for (const b of buf) {
      str += b;
    }
    return str;
  }

  async ngOnInit() {
    this.loading = true;
    this.saveModalFields = [
      {
        key: 'name',
        type: 'input',
        props: {
          required: true,
          label: await this.internationalizationService.translate('DISPLAY.PHYLOTREES.SAVE_MODAL.NAME')
        }
      }
    ];
    this.overrideModalFields = [
      {
        key: 'new_text',
        type: 'input',
        props: {
          required: true,
          label: await this.internationalizationService.translate('DISPLAY.PHYLOTREES.OVERRIDE_TEXT.NEW_TEXT'),
        }
      }
    ];
  }

  async ngAfterViewInit() {
    this.getState = await this.stateService.getStateCurrenView();
    if (this.getState &&
      (this.getState.trees && this.tree && btoa(this.tree) in this.getState.trees ||
        this.getState.views && this.view)) {
      let state;
      if (this.view) {
        state = this.getState.views[this.view['id']];
      } else {
        state = this.getState.trees[btoa(this.tree)];
      }
      this.treeReceived = true;
      this.savedColors = state.savedColors;
      this.settings = state.settings;
      this.options = state.options;
      this.branchColors = state.branchColors;
      this.nodeColors = state.nodeColors;
      this.newickStr = state.tree;
      await this.load(this.newickStr, true);
      this.loading = false;
    } else {
      this.getState = {views: {}, trees: {}};
      if (this.tree) {
        this.newickStr = this.tree;
        this.treeReceived = true;
        await this.load(this.newickStr, true);
        this.loading = false;
      } else {
        const textOption = {responseType: 'text'};
        const options = {...this.globalVariablesServices.authOptions, ...textOption};
        let obs: Observable<ArrayBuffer>;
        obs = this.http.get(this.Url, options);
        if (obs !== undefined) {
          obs.subscribe({
            next: async (newickBinary) => {
              this.newickStr = this.ab2str(newickBinary);
              await this.load(this.newickStr, false);
            },
            error: (error) => {
              this.loading = false;
              this.msg.error(error.message);
            },
            complete: () => {
              this.loading = false;
            }
          });
        } else {
          this.msg.error(await this.internationalizationService.translate("DISPLAY.PHYLOTREES.LOG.NO_TREE"))
        }
      }
    }
  }

  ngOnDestroy() {
    if (this.windowListener)
      window.removeEventListener("update_archaeopteryx", this.windowListener);
    const saveMap = {
      savedColors: this.savedColors,
      settings: this.settings,
      options: this.options,
      branchColors: this.branchColors,
      nodeColors: this.nodeColors,
      tree: this.newickStr,
    };
    if (this.view) {
      this.getState.views[this.view['id']] = saveMap;
    } else {
      if (this.tree)
        this.getState.trees[btoa(this.tree)] = saveMap;
      else
        this.getState.trees[btoa(this.newickStr)] = saveMap;
    }
    this.stateService.setStateCurrentView(this.getState);
  }

  async load(data, from_breadcrumb) {
    if (this.view) {
      const savedData = this.view['data'];
      this.settings = savedData['settings'];
      this.options = savedData['options'];
      this.branchColors = savedData['branchColors'];
      this.nodeColors = savedData['nodeColors'];
    } else {
      this.loadDefaultOptions();
    }

    let tree = null;
    try {
      tree = archaeopteryx.parseNewHampshire(data, true, false);
    } catch (e) {
      this.msg.error(await this.internationalizationService.translate("DISPLAY.PHYLOTREES.LOG.ERROR_PARSING") + e);
    }
    if (tree) {
      await this.launchArchaeopteryx(tree, from_breadcrumb);
    }
  }

  async launchArchaeopteryx(tree, from_breadcrumb) {
    try {
        await archaeopteryx.launch('#phylogram1', tree, this.options, this.settings, [],
          []);
        this.addListenersAndColors(true, from_breadcrumb);
        this.windowListener = () => {
          if (!this.loading)
            this.addListenersAndColors(false, from_breadcrumb);
        }
        setTimeout(() => //wait until the page is loaded
          window.addEventListener("update_archaeopteryx", this.windowListener), 3000);
      } catch (e) {
        console.log(e);
        this.msg.error(e);
      }
  }

  loadDefaultOptions(): void {
    this.options['alignPhylogram'] = false; // We should launch with "regular" phylogram.
    this.options['branchDataFontSize'] = 9;
    this.options['defaultFont'] = ['Arial', 'Helvetica', 'Times'];
    this.options['minBranchLengthValueToShow'] = 0.000001;
    this.options['phylogram'] = true; // We should launch with "regular" phylogram.
    this.options['showExternalLabels'] = true;
    this.options['showExternalNodes'] = true;
    this.options['showInternalNodes'] = true;
    this.options['showNodeName'] = true;
    this.options['showSequence'] = false; // Do not show "Sequence" upon launch.
    this.options['showSequenceAccession'] = true; // If user turns on "Sequence" display, accession will be shown.
    this.options['searchProperties'] = true;
    this.options['searchIsPartial'] = false;
    this.options['showVisualizationsLegend'] = false;
    this.options['visualizationsLegendOrientation'] = 'vertical';
    this.options['nodeSizeDefault'] = 5;
    this.options['internalNodeFontSize'] = '15px';
    this.options['externalNodeFontSize'] = '15px';
    this.options['branchDataFontSize'] = '15px';


    this.settings['border'] = '0px';
    this.settings['controls0Top'] = 10;
    this.settings['controls1Top'] = 10; // Should have both boxes in line['
    // this.settings['displayHeight'] = 700;
    // this.settings['displayWidth'] = 1200;
    this.settings['enableAccessToDatabases'] = false;
    this.settings['enableCollapseByFeature'] = false;
    this.settings['enableDownloads'] = true;
    this.settings['enableDynamicSizing'] = true;
    this.settings['enableSpecialVisualizations2'] = true;
    this.settings['enableSpecialVisualizations3'] = true;
    this.settings['enableSpecialVisualizations4'] = true;
    this.settings['nhExportWriteConfidences'] = true;
    this.settings['searchFieldWidth'] = '50px';
    this.settings['collapseLabelWidth'] = '36px';
    this.settings['textFieldHeight'] = '14px';
    this.settings['showShortenNodeNamesButton'] = true;
    this.settings['showDynahideButton'] = true;

    this.branchColors = {};
    this.nodeColors = {};
  }

  saveSettingsModal(outputModal) {
    const name = outputModal['name']
    this.saveSettings(name).then();
  }

  async saveSettings(name: string): Promise<void> {
    if (this.treeReceived) {
      const filename = uuid() + '.nwk';
      const path = 'phylotree-viewer';
      this.filesService.postString2FileApi('phylotree-viewer', filename, this.newickStr, 'text/x-nhx').subscribe(
        response => {
        }, error => {
          this.msg.error(error.error.message);

        }, () => {
        });
      this.Url = `${this.filesService.baseUrl}/files/${path}/${filename}.content`
    }

    const settingsJson = {
      settings: this.settings,
      options: this.options,
      branchColors: this.branchColors,
      nodeColors: this.nodeColors,
      filesApiUrl: this.view && this.view['data']['filesApiUrl'] ? this.view['data']['filesApiUrl'] : this.Url.toString(),
      savedColors: this.savedColors
    };
    const view = {
      name: name,
      type: 'phylotree-viewer',
      data: settingsJson
    };

    try {
      let response;
      if (!this.view) {
        response = await this.backendService.postView(view).toPromise();
      } else {
        response = await this.backendService.putView(this.view['id'], view).toPromise();
      }
      if (response.content && response.content.id) {
        this.view = response.content;
        this.location.replaceState(`/archaeopteryxBrowser?view_id=${this.view['id']}`);
      }
      if (response.issues) {
        this.msg.addIssues(response.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.success,
        'MOLECULAR_DATA.PHYLOTREES.ARCHAEOPTERYX.NOTIFICATION_CREATE_VIEW_CORRECTLY.TITLE',
        'MOLECULAR_DATA.PHYLOTREES.ARCHAEOPTERYX.NOTIFICATION_CREATE_VIEW_CORRECTLY.CONTENT',
        'bottomRight'
      ).then();
    } catch (e) {
      if (e.issues) {
        this.msg.addIssues(e.issues);
      }
      this.notificationService.createNotificationWithType(
        TypeNotificationEnum.error,
        'MOLECULAR_DATA.PHYLOTREES.ARCHAEOPTERYX.NOTIFICATION_CREATE_VIEW_ERROR.CONTENT',
        'MOLECULAR_DATA.PHYLOTREES.ARCHAEOPTERYX.NOTIFICATION_CREATE_VIEW_ERROR.TITLE',
        'bottomRight'
      ).then();
    }
  }

  updateMapKeys(map, old_text, new_text) {
    for (const key of Object.keys(map)) {
      if (key.includes(old_text)) {
        map[key.replace(old_text, new_text)] = map[key];
        delete map[key];
      }
    }
    return map;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async overrideTextModal(outputModal) {
    this.loading = true;
    const newText = outputModal['new_text'];
    this.nodeColors = this.updateMapKeys(this.nodeColors, this.oldText, newText);
    this.branchColors = this.updateMapKeys(this.branchColors, this.oldText, newText);
    const parsedNwk = this.newickStr.replaceAll('_', ' ');
    const regexSubStr = this.escapeRegExp(this.oldText);
    const regexp = new RegExp(`[(,]${regexSubStr}:`);
    const idxOfSubstr = parsedNwk.search(regexp);
    const before = this.newickStr.slice(0, idxOfSubstr + 1); // +1 because of the ( or ,
    const after = this.newickStr.slice(idxOfSubstr + this.oldText.length + 1); // +1 because of the :
    this.newickStr = before + newText.replaceAll(' ', '_') + after;
    const tree = archaeopteryx.parseNewHampshire(this.newickStr , true, false);
    let element = document.getElementById('phylogram1');
    element.innerHTML = '';
    element = document.getElementById('controls0');
    element.innerHTML = '';
    await this.launchArchaeopteryx(tree, true);
    this.loading = false;
  }

  getNodeId(node) {
    if (!('children' in node['__data__'])) {
      return node['__data__'].name;
    } else {
      const child_names = []
      let child_node;
      for (let child of node['__data__'].children) {
        child_node = {'__data__': child}
        child_names.push(this.getNodeId(child_node))
      }
      return child_names.sort().join('_');
    }
  }

  getBranchId(branch) {
    if (!('children' in branch['__data__']['target'])) {
      return branch['__data__']['target'].name;
    } else {
      const child_names = []
      let child_branch;
      for (let child of branch['__data__']['target'].children) {
        child_branch = {'__data__': {'target': child}}
        child_names.push(this.getBranchId(child_branch))
      }
      return child_names.sort().join('_');
    }
  }

  addListenersAndColors(isFirstTime: boolean, from_breadcrumb: boolean): void {
    let i = 0;
    const branches = Array.from(document.getElementsByClassName('link'));
    if (isFirstTime || branches.length > this.totalBranches) {
      this.totalBranches = branches.length;
    }
    branches.forEach((element) => {
      element.id = this.getBranchId(element);
      if (this.branchColors[element.id] !== undefined) {
        element.setAttribute("stroke", this.branchColors[element.id]);
      }
      element.addEventListener('click', (event) => {
        const target = (event.target as HTMLElement);
        target.setAttribute("stroke", this.color);
        this.branchColors[target.id] = this.color;
      });
      i++;
    });
    let defaultOnClick;
    i = 0;
    let style: {};
    const nodes = Array.from(document.getElementsByClassName('node'));
    if (isFirstTime || nodes.length > this.totalNodes) {
      this.totalNodes = nodes.length;
    }
    if (!isFirstTime) {
      nodes.forEach((element) => {
        if (style === undefined && element.children[1]['style']['stroke'] !== '') {
          style = element.children[1]['style'];
          style['stroke'] = 'rgb(144, 144, 144)';
          style['fill'] = 'rgb(144, 144, 144)';
        }
      });
    }
    let reloadedNode;
    nodes.forEach((element) => {
      reloadedNode = element.children[1]['style']['stroke'] === '' && !isFirstTime;
      element.id = this.getNodeId(element)
      defaultOnClick = element.eventListeners('click')[0];


      if (reloadedNode && style['cssText']) {
        element.children[1]['style'] = style['cssText'];
      }
      if (this.nodeColors[element.id] !== undefined && (isFirstTime || reloadedNode)) {
        element.children[1]['style']["stroke"] = this.nodeColors[element.id];
        element.children[1]['style']["fill"] = this.nodeColors[element.id];
      } else if (this.view || from_breadcrumb) {
        element.children[1]['style']["stroke"] = 'rgb(144, 144, 144)';
        element.children[1]['style']["fill"] = 'rgb(144, 144, 144)';
      }
      if (reloadedNode || isFirstTime) {
        element.removeEventListener("click", element.eventListeners('click')[0]);
        element.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        });
        element.addEventListener('contextmenu', defaultOnClick);

        element.addEventListener('click', (event) => {
          const children = event.target['__data__'].children;
          if (event.target['__data__'].children && this.nodeColorOptionSelected !== NodeColorOptionsEnum.NODE) {
            const objChildren = this.getAllChildren(children, [...d3.selectAll('.link')[0], ...d3.selectAll('.node')[0]]);
            for (let obj of objChildren) {
              if (obj.classList.contains('node')) {
                if (this.nodeColorOptionSelected === NodeColorOptionsEnum.NODES_CHILDREN || this.nodeColorOptionSelected === NodeColorOptionsEnum.NODES_AND_BRANCHES) {
                  const nodeCircle = obj.querySelector('.nodeCircle');
                  if (nodeCircle) {
                    nodeCircle['style']["stroke"] = this.color;
                    nodeCircle['style']["fill"] = this.color;
                  }
                }
              } else {
                if (this.nodeColorOptionSelected === NodeColorOptionsEnum.BRANCHES_CHILDREN || this.nodeColorOptionSelected === NodeColorOptionsEnum.NODES_AND_BRANCHES) {
                  obj['style']["stroke"] = this.color;
                }
              }
            }
          }
          if (this.nodeColorOptionSelected === NodeColorOptionsEnum.NODE
            || this.nodeColorOptionSelected === NodeColorOptionsEnum.NODES_AND_BRANCHES
            || this.nodeColorOptionSelected === NodeColorOptionsEnum.NODES_CHILDREN) {
            const target = (event.target as HTMLElement);
            if (target.tagName !== 'text' && target.tagName !== 'tspan') {
              this.nodeColors[target.parentElement.id] = this.color;
              target.parentElement.children[1]['style']["stroke"] = this.color;
              target.parentElement.children[1]['style']["fill"] = this.color;
            }
          }
        });
      }
      i++;
    });

    Array.from(document.getElementsByClassName('extlabel first')).forEach((element) => {
      element['style']['fill'] = '#041cac';
    });
    Array.from(document.getElementsByClassName('extlabel second')).forEach((element) => {
      element['style']['fill'] = '#000000';
    });
    Array.from(document.getElementsByClassName('extlabel third')).forEach((element) => {
      element['style']['fill'] = '#ac3235';
    });
    Array.from(document.getElementsByClassName('extlabel')).forEach((element) => {
      if (element.getAttribute('text-anchor') != undefined && element.getAttribute('text-anchor') == 'start') {
        element.addEventListener('dblclick', (event) => {
          this.oldText = element.textContent;
          this.isVisibleOverrideModal = true;
        });
      }
    });
  }

  getAllChildren(children, allItems: any[], idChildrenAux?) {
    let idChildren = [];
    if (idChildrenAux) idChildren = idChildrenAux;
    for (let item of children) {
      idChildren.push(item.id);
      if (item.children) this.getAllChildren(item.children, allItems, idChildren);
    }
    if (!idChildrenAux) {
      return allItems.filter(item => {
        if (item['__data__'].id) {
          return idChildren.includes(item['__data__'].id);
        } else if (item['__data__'].target) {
          return idChildren.includes(item['__data__'].target.id);
        } else {
          return false;
        }
      });
    }
  }

  setColorPicker() {
    this.selectedSavedColor = null;
  }

  removeColor() {
    const index = this.savedColors.indexOf(this.selectedSavedColor, 0);
    if (index > -1) {
      this.savedColors.splice(index, 1);
    }
    this.selectedSavedColor = null;
  }

  saveColor() {
    if (!this.savedColors.includes(this.color)) {
      this.savedColors.push(this.color);
      this.selectedSavedColor = this.color;
    }
  }

  setColor() {
    this.color = this.selectedSavedColor;
  }

  saveProgressEvent() {
    if (this.view) {
      this.saveSettings(this.view['name']).then();
    } else {
      this.isVisibleSaveModal = true;
    }
  }

}

