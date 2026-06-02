import {ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, Inject} from '@angular/core';
import {v4 as uuid} from 'uuid';
import { CommonModule } from '@angular/common';
import {NzIconModule} from "ng-zorro-antd/icon";
import {CdkDrag, CdkDropList, moveItemInArray} from "@angular/cdk/drag-drop";
import {InfoModalComponent} from "../info-modal/info-modal.component";
import {NzButtonModule} from "ng-zorro-antd/button";
import {NzUploadModule} from "ng-zorro-antd/upload";
import {FilesService} from "../../../services/files.service";
import {MessageLogService} from "ngt-gui/core";
import { MESSAGE_LOG_SERVICE, FILES_SERVICE } from 'ngt-gui/core';
import { MessageLogServiceInterface, } from 'ngt-gui/core';
import { FilesServiceInterface } from 'ngt-gui/core';


@Component({
    selector: 'app-upload-2-files-api',
    imports: [
        CommonModule,
        NzIconModule,
        CdkDrag,
        CdkDropList,
        InfoModalComponent,
        NzButtonModule,
        NzUploadModule,
    ],
    templateUrl: './upload2filesAPI.component.html',
    styleUrls: ['./upload2filesAPI.component.sass']
})
export class Upload2filesAPIComponent implements OnInit{


  readonly FILESAPI_FOLDER = 'jobs_input';
  @Output()
  readonly filesEvent = new EventEmitter<any>();
  isVisibleModal = false;
  readonly contentParamsModal = {
    name: ''
  };
  modalTitle: string;
  modalContent: string;
  uploadLoading = false;
  disableUpload = true;
  acceptedExtensionsString: string;
  header: string;
  @Input()
  readonly inputHeader: string;
  @Input()
  readonly files = [];
  @Input()
  readonly remoteName: string;
  @Input()
  readonly contentType: string;
  @Input()
  readonly extension: string;
  @Input()
  readonly numFilesLimit: number;//0 no limit
  @Input()
  readonly fileExtensions: string;

  constructor(@Inject(FILES_SERVICE) private readonly filesService: FilesServiceInterface,
              @Inject(MESSAGE_LOG_SERVICE) private msg: MessageLogServiceInterface,
              private readonly cdr: ChangeDetectorRef){};

  beforeUploadFile = (file: any) => {
    const periodMatches = file.name.match(/\./g);
    if (this.files.length > this.numFilesLimit && this.numFilesLimit > 0) {
      this.isVisibleModal = true;
      this.modalTitle = "Files Limit Error";
      this.modalContent = "The limit of the allowed number of files has been exceeded.";
    } else if (periodMatches !== null && periodMatches.length <= 1) {
        const reader = new FileReader();
        const filesAPIFileName = `${uuid()}.${this.extension}`;
        reader.onload = (ev) => {
          this.uploadLoading = true;
          this.filesService.postDataUrl2FileApi(this.FILESAPI_FOLDER, filesAPIFileName, reader.result as string).subscribe({
              next: (value) => {
                this.files.push({
                  filename: file.name,
                  remote_name: this.remoteName != null ? this.remoteName : file.name,
                  object_type: {filesAPI: `/${this.FILESAPI_FOLDER}/${filesAPIFileName}`},
                  type: this.extension
                });
                this.uploadLoading = false;
                if (this.files.length > this.numFilesLimit) {
                  this.disableUpload = true;
                }
                this.filesEvent.emit(this.files);
              },
              error: (err) => {
                this.msg.error(err);
                this.uploadLoading = false;
              }
            }
          );

          this.cdr.detectChanges();
        };

        reader.readAsDataURL(file);
    } else {
      this.isVisibleModal = true;
      this.modalTitle = "File Name Error";
      this.modalContent = "The file name must have a maximum of one point.";
    }
  }

  drop(event) {
    moveItemInArray(this.files, event.previousIndex, event.currentIndex);
    this.filesEvent.emit(this.files);
  }

  removeFile(index: number) {
    const deletedFiles = this.files.splice(index, 1);
    for (let f of deletedFiles) {
      this.filesService.deleteFileInFileApi(this.FILESAPI_FOLDER, f.filename).subscribe();
    }
    this.disableUpload = false;
    this.filesEvent.emit(this.files);
  }

  orderFiles() {
    this.files.sort((a, b) => {
      if (a['filename'] < b['filename']) {
        return -1;
      }
      if (a['filename'] > b['filename']) {
        return 1;
      }
      return 0;
    });
    this.filesEvent.emit(this.files);
  }

  ngOnInit(): void {
    const extensions = this.fileExtensions.split(',');
    this.acceptedExtensionsString = `Only ${extensions.slice(0, extensions.length - 2).join(',')} and ${extensions[extensions.length - 1]} extensions are accepted.`
    if (this.inputHeader == undefined) {
      this.header = `${this.extension} File`;
      if (this.numFilesLimit != 1) this.header += 's';
    } else {
      this.header = this.inputHeader;
    }
  }

}
