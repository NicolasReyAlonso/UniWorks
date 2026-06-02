import {Component, Input, OnInit } from '@angular/core';
import {BackendService} from 'ngt-gui/core';import { NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { NzFormatEmitEvent, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import {UntypedFormGroup} from "@angular/forms";
import {FieldType, FormlyFieldConfig, FormlyFormOptions} from '@ngx-formly/core';

@Component({
    selector: 'app-wooded-selector',
    templateUrl: './wooded-selector.component.html',
    styleUrls: ['./wooded-selector.component.sass'],
    standalone: false
})
export class WoodedSelectorComponent extends FieldType implements OnInit {

  constructor(private backendService: BackendService) {
    super();
  }

  searchValue = '';
  tree = []
  fileList = [];
  file: any;
  loading = true;
  step = 0;
  expandFiles = false;
  processes: any;
  selectedProcess: any = {};
  resources: any;
  selectedResource: any = {};
  selectedPriority = 'Media';
  jobContext: any = {};
  path?: string;
  @Input() fields: FormlyFieldConfig[];



  ngOnInit(): void {
    let data: any = [];
    let cv_filter = {'filter':{'name':{'op':'eq','unary':'taxonomy'}}}
    this.backendService.getOntologies(undefined, cv_filter).subscribe(
      response => { cv_filter = response['content']; },
      error => { this.loading = false; },
      () => {
        this.backendService.getCvterms(cv_filter[0].cv_id).subscribe(
          response => { data = response['content']; },
          error => { this.loading = false; },
          () => {
            this.tree = this.item2nztree(data);
          });
      });
    // this.backendService.getOrganisms().subscribe(
    //   response => { data = response['content']; },
    //   error => { this.loading = false; },
    //   () => {
    //     this.tree = this.item2nztree(data);
    //     this.searchValue = "";
    //     this.loading = false;
    //   }
    // );
  }

  onIndexChange(event: number): void {
    this.step = event;
  }

  onExpandChange(event) {
    this.expandFiles=event;
  }

  // TREE SELECTOR [{title: '0-0', key: '0-0', children: [], isLeaf: true}]
  private cvterm2nztree(items) {
    let res = [];
    let tmp = {};
    for (const i of items) {
      tmp = {title: i.name, key: i.cvterm_id, children: []};
      res.push(tmp);
    }
    return res;
  }

  // TREE SELECTOR [{title: '0-0', key: '0-0', children: [], isLeaf: true}]
  private item2nztree(items) {
    let res = [];
    let tmp = {};
    for (const i of items) {
      tmp = {title: JSON.stringify(i), key: i.id, children: []};
      res.push(tmp);
    }
    return res;
  }

  nzEvent(event: NzFormatEmitEvent): void {
    console.log(event);
    // load child async
    if (event.eventName === 'expand') {
      const node = event.node;
      if (node?.getChildren().length === 0 && node?.isExpanded) {
        this.loadNode(node).then(data => {
          node.addChildren(data);
        });
      }
    }
  }

  loadNode(org): Promise<NzTreeNodeOptions[]> {
    return new Promise(resolve => {
      let tmp;
      console.log(org);
      this.backendService.getSequences(undefined, this.backendService.filter({'organism_id': org.key})).subscribe(
        response => {tmp = response['content'];},
        error => {},
        () => {
          resolve(this.item2nztree(tmp));
        });
    });
  }

  // FILE LOADER
  beforeUpload = (file): boolean => {
    this.fileList = this.fileList.concat(file);
    return false;
  }

  removeFile = (event): void => {
    for (let index = 0; index < this.fileList.length; index++) {
      if (event['uid'] == this.fileList[index]['uid']) {
        this.fileList.splice(index, 1);
      }
    }
  }

  importFiles(): void {
    this.loading = true;
    for (const file of this.fileList) {
    }
    this.backendService.importSequences(this.fileList).subscribe(
      response => {
      }, error => {
        this.loading = false;
      }, () => {
        this.loading = false;
        this.fileList = [];
      });
  }

  handleChange({ file, fileList }: NzUploadChangeParam): void {
    const status = file.status;
    if (status !== 'uploading') {
      console.log(file, fileList);
    }
    if (status === 'done') {
     this.fileList = fileList;
    } else if (status === 'error') {
    }
  }


}
