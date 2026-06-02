import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Input,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core'
import {CommonModule} from '@angular/common'
import {TranslateModule} from "@ngx-translate/core"
import {NzUploadFile, NzUploadModule} from 'ng-zorro-antd/upload'
import {NzIconModule} from "ng-zorro-antd/icon"
import {NzButtonModule} from "ng-zorro-antd/button"
import {
  IProcessTypesSourceCodeFileListNode,
  ProcessesSourceCode,
  ProcessesSourceCodeResponse
} from "@interfaces/process-types.interfaces"
import {FilesService} from "@services/files.service"
import {MessageLogService} from "@services/message-log.service";
import {NotificationService, TypeNotificationEnum} from "@services/notification.service"
import {NzInputModule} from "ng-zorro-antd/input";
import {v4 as uuidv4} from 'uuid'
import {FormsModule} from "@angular/forms"
import {AutofocusDirective} from "@directives/autofocus.directive"
import {NzFormatEmitEvent, NzTreeComponent, NzTreeModule, NzTreeNode} from "ng-zorro-antd/tree"
import {BehaviorSubject, Observable} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop"
import {BackendService} from 'ngt-gui/core';import {DomSanitizer, SafeResourceUrl} from "@angular/platform-browser";
import {NzSelectModule} from "ng-zorro-antd/select";

@Component({
    selector: 'app-processes-types-detail-source-code-tab',
    imports: [
        CommonModule,
        TranslateModule,
        NzUploadModule,
        NzIconModule,
        NzButtonModule,
        NzInputModule,
        FormsModule,
        NzTreeModule,
        AutofocusDirective,
        NzSelectModule
    ],
    templateUrl: './processes-types-detail-source-code-tab.component.html',
    styleUrls: ['./processes-types-detail-source-code-tab.component.sass'],
    encapsulation: ViewEncapsulation.None
})
export class ProcessesTypesDetailSourceCodeTabComponent implements OnInit {

  private readonly _filesService = inject(FilesService)
  private readonly _messageLogService = inject(MessageLogService)
  private readonly _notificationService = inject(NotificationService)
  private readonly _destroyRef = inject(DestroyRef)
  private readonly _changeDetectorRef = inject(ChangeDetectorRef)
  private readonly _backendService = inject(BackendService)
  private readonly _sanitizer = inject(DomSanitizer)

  @Input() public processTypeId: any
  @Input({required: true}) public sourceCodeOriginalData$: Observable<ProcessesSourceCode[] | null>

  @ViewChild('nzTreeSourceCode', {static: false}) nzTreeSourceCode!: NzTreeComponent;

  private readonly SOURCE_CODE_PATH_FILES = 'process_sources'

  uploadFiles = []
  protected readonly nodes = new BehaviorSubject<IProcessTypesSourceCodeFileListNode[]>([])
  protected selectedKeysNodes = new BehaviorSubject<string[]>([])
  protected selectedNode: NzTreeNode | null;
  protected selectedNodePath: null | SafeResourceUrl
  protected editSelectedNode: boolean = false
  protected mainFileOptions: { path: string, sourceCodeId: number, fileName: string }[] = []
  protected selectedMainFile: string = null
  protected selectNodeHaveZipParent: boolean = false

  ngOnInit() {
    this.selectedKeysNodesChange()
    this.sourceCodeOriginalDataChange()
    this.nodesChange()
  }

  private selectedKeysNodesChange(): void {
    this.selectedKeysNodes.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(value => {
      this.selectedNode = value[0] ? this.nzTreeSourceCode.getTreeNodeByKey(value[0]) : null
      const originalNode = this.selectedNode ? this.getNodeByKey(this.selectedNode.key) : null
      if (originalNode && originalNode.type == 'file') {
        const originalNode = this.getNodeByKey(this.selectedNode.key)
        this.selectedNodePath = originalNode ? this._sanitizer.bypassSecurityTrustResourceUrl(`https://sys.nextgendem.eu/api/files/${originalNode.path}/${originalNode.title}.content?format=html`) : null
      } else {
        this.selectedNodePath = null
      }

      if (originalNode) {
        this.selectNodeHaveZipParent = false
        const searchParentZip = (node: IProcessTypesSourceCodeFileListNode) => {
          if (node.parent) {
            node.parent.type === 'zip' ?  this.selectNodeHaveZipParent = true : searchParentZip(node.parent)
          }
        }
        searchParentZip(originalNode)
      } else {
        this.selectNodeHaveZipParent = false
      }
    })
  }

  private sourceCodeOriginalDataChange(): void {
    this.sourceCodeOriginalData$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(value => {
      if (value) {
        this.loadSourceCodesByOriginalData(value)
      }
    })
  }

  private nodesChange(): void {
    this.nodes.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(value => {
      const files: { path: string, sourceCodeId: number, fileName: string }[] = []
      const getFiles = (nodesChildren: IProcessTypesSourceCodeFileListNode[]) => {
        for (const node of nodesChildren) {
          if (node.type === 'file') {
            files.push({
              path: `${node.path}/${node.title}`.replace(`process_sources/${this.processTypeId}/`, ''),
              sourceCodeId: node.sourceCodeId,
              fileName: node.title
            })
          }
          if (node.children && node.children.length > 0) {
            getFiles(node.children)
          }
        }
      }
      getFiles(value)
      this.mainFileOptions = files
    })
  }

  private loadSourceCodesByOriginalData(sourceCodeOriginalData: ProcessesSourceCode[]): void {
    this.nodes.next([])
    let newSelectedMainFile: string = null
    for (const sourceCode of sourceCodeOriginalData) {
      this.createStructureByFsoPath({fsoPath: sourceCode.fso_path, sourceCode})
    }
    this.nodes.next([...this.nodes.value])
    this._changeDetectorRef.detectChanges()
    this.selectedMainFile = newSelectedMainFile
  }

  private convertFsoPathToNodePath(fsoPath: string): string {
    return fsoPath.split('/').filter((element) => element != "").slice(0, -1).join("/")
  }

  private createStructureByFsoPath(args: { fsoPath: string, isMain?: boolean, sourceCode: ProcessesSourceCode }): void {
    const pathWithoutPrefix = args.fsoPath.replace(`/${this.SOURCE_CODE_PATH_FILES}/${this.processTypeId}/`, '')
    const pathArray = pathWithoutPrefix.split('/')
    let parentNode: IProcessTypesSourceCodeFileListNode = null;
    for (let i = 0; i < pathArray.length; i++) {
      if (i == pathArray.length - 1) {
        if (pathArray[i].endsWith('.zip')) {
          this.createZipByPath({path: pathArray[i], parent: parentNode, sourceCode: args.sourceCode})
        } else {
          this.createFileByPath({path: pathArray[i], parent: parentNode, sourceCode: args.sourceCode})
        }
      } else {
        parentNode = this.createFolderByPath({path: pathArray[i], parent: parentNode})
      }
    }
  }

  private createFileByPath(args: {
    path: string,
    parent?: IProcessTypesSourceCodeFileListNode,
    sourceCode?: ProcessesSourceCode
  }): void {
    let sameName = false
    let newFile: IProcessTypesSourceCodeFileListNode = {
      title: args.path,
      type: 'file',
      key: uuidv4(),
      level: 0,
      isLeaf: true,
      needCreate: false,
      expandable: false,
      sourceCodeId: args.sourceCode?.id,
      path: args.sourceCode ? this.convertFsoPathToNodePath(args.sourceCode.fso_path) : null
    }
    if (args.parent) {
      for (const child of args.parent.children) {
        if (child.title == args.path) sameName = true
      }
      if (!sameName) {
        newFile = {
          ...newFile,
          parent: args.parent,
          level: args.parent.level + 1
        }
        if (!newFile.path) {
          newFile.path = `process_sources/${this.processTypeId}`
          const routes = []
          this.getAllParentsNode(newFile, routes)
          for (const route of routes.reverse()) {
            newFile.path += `/${route}`
          }
        }
        args.parent.children.push(newFile)
      }
    } else {
      for (const child of this.nodes.value) {
        if (child.title == args.path) sameName = true
      }
      if (!sameName) {
        if (!newFile.path) {
          newFile.path = `process_sources/${this.processTypeId}`
        }
        this.nodes.value.push(newFile)
      }
    }
  }

  private createFolderByPath(args: {
    path: string,
    parent?: IProcessTypesSourceCodeFileListNode
  }): IProcessTypesSourceCodeFileListNode {
    let sameNameNode: IProcessTypesSourceCodeFileListNode = null;
    let newFolder: IProcessTypesSourceCodeFileListNode = {
      title: args.path,
      type: 'directory',
      key: uuidv4(),
      level: 0,
      needCreate: false,
      expandable: true,
      children: [],
      parent: args.parent
    }
    if (args.parent) {
      for (const child of args.parent.children) {
        if (child.title == args.path && child.type == "directory") {
          return child
        }
      }
      args.parent.children.push(newFolder)
      return newFolder
    } else {
      for (const child of this.nodes.value) {
        if (child.title == args.path && child.type == "directory") sameNameNode = child
      }
      if (!sameNameNode) {
        this.nodes.value.push(newFolder)
      } else {
        return sameNameNode
      }
    }
    return newFolder
  }

  private createZipByPath(args: {
    path: string,
    parent?: IProcessTypesSourceCodeFileListNode,
    sourceCode: ProcessesSourceCode
  }): void {
    let newZip: IProcessTypesSourceCodeFileListNode = {
      title: args.path,
      type: 'zip',
      key: uuidv4(),
      level: 0,
      needCreate: false,
      expandable: true,
      children: [],
      sourceCodeId: args.sourceCode.id,
    }

    if (args.parent) {
      newZip = {
        ...newZip,
        parent: args.parent,
        level: args.parent.level + 1
      }
      args.parent.children.push(newZip)
    } else {
      this.nodes.value.push(newZip)
    }
    this.createStructureByZip({zipNode: newZip, zipFsoPath: args.sourceCode.fso_path})
  }

  private createStructureByZip(args: { zipNode: IProcessTypesSourceCodeFileListNode, zipFsoPath: string }) {

    const createNodeDependType = {
      file: (args: { child: any, parentNode: IProcessTypesSourceCodeFileListNode }) => {
        const fileName: string = args.child.full_name.split('/').reverse()[0]
        this.createFileByPath({path: fileName, parent: args.parentNode})
      },
      folder: (args: { child: { full_name: string }, parentNode: IProcessTypesSourceCodeFileListNode }) => {
        const fullPath = args.child.full_name.endsWith("/") ? args.child.full_name.slice(0, -1) : args.child.full_name
        const folderName: string = fullPath.split('/').reverse()[0]
        const newFolder = this.createFolderByPath({path: folderName, parent: args.parentNode})
        createLevelStructure(newFolder, fullPath)
      }
    }

    const createLevelStructure = (parentNode: IProcessTypesSourceCodeFileListNode, fsoPath: string) => {
      this._filesService.getFolderContent(fsoPath).subscribe({
        next: (response: any) => {
          this._messageLogService.addResponseIssues(response)
          for (const child of response.content.children) {
            createNodeDependType[child.type]({child, parentNode})
          }
          this.nodes.next([...this.nodes.value])
          this._changeDetectorRef.detectChanges()
        },
        error: (e) => {
          this._messageLogService.addResponseIssues(e)
          this._notificationService.createNotificationError(
            'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_ERROR_READ_ZIP',
            'bottomRight'
          ).then()
        }
      })
    }

    createLevelStructure(args.zipNode, args.zipFsoPath)

  }

  protected removeFile(file: NzUploadFile): boolean {
    this.uploadFiles = []
    return true
  }

  private getRouteNodeSelected(): string {
    const routes = []
    const selectedKeysNodeValue = this.selectedKeysNodes.value[0]
    const selectedNode = this.getNodeByKey(selectedKeysNodeValue ?? '')
    if (!selectedNode) return ''
    routes.push(selectedNode.title)
    this.getAllParentsNode(selectedNode, routes)
    return routes.reverse().reduce((accumulator, current, currentIndex) => {
      accumulator += `/${current}`
      return accumulator
    }, '')
  }

  private getAllParentsNode(node, parents: string[]) {
    if (node.parent) {
      parents.push(node.parent.title)
      this.getAllParentsNode(node.parent, parents)
    }
  }

  private getNodeByKey(key: string): IProcessTypesSourceCodeFileListNode | null {
    const searchNode = (list: IProcessTypesSourceCodeFileListNode[], key: string): IProcessTypesSourceCodeFileListNode | null => {

      for (const node of list) {
        if (node.key == key) return node
        if (node.children && node.children.length > 0) {
          const nodeChildFind = searchNode(node.children, key)
          if (nodeChildFind) return nodeChildFind
        }
      }

      return null

    }

    return searchNode(this.nodes.value, key)
  }

  onAddFolderClick() {
    this.editSelectedNode = true

    const folder: IProcessTypesSourceCodeFileListNode = {
      key: uuidv4(),
      type: 'directory',
      title: '',
      level: 0,
      disabled: false,
      expandable: true,
      needCreate: true,
      children: []
    }

    if (!this.selectedNode) {
      this.nodes.next([...this.nodes.value, folder])
      this._changeDetectorRef.detectChanges()
      this.selectedKeysNodes.next([folder.key])
    } else {
      const node = this.getNodeByKey(this.selectedNode.key)
      if (node) {
        node.children.push(folder)
        folder.parent = node
        folder.level = node.level + 1
        this.selectedNode.setExpanded(true)
        this.nodes.next([...this.nodes.value])
        this._changeDetectorRef.detectChanges()
        this.selectedKeysNodes.next([folder.key])
      }
    }
  }

  protected onClickEditFileNode(event: MouseEvent) {
    event.stopPropagation()
  }

  protected changeNodeName(node: IProcessTypesSourceCodeFileListNode, event: KeyboardEvent | FocusEvent) {
    const input = event.target as HTMLInputElement
    this.editSelectedNode = false
    const newName = input.value
    if (node.needCreate) {
      if (newName == '') {
        this.selectedKeysNodes.next([])
        this.deleteNode(node.key)
        return
      }

      if (node.type === 'directory') {
        node.needCreate = false
        node.title = newName
      }
    }
    this.nodes.next([...this.nodes.value])
  }

  protected onClickDeleteNodeButton(): void {
    if (this.selectedNode) this.deleteNode(this.selectedNode.key)
  }

  private deleteNode(id: string): void {
    const newFileListSource = [...this.nodes.value]
    const removeNode = (list: IProcessTypesSourceCodeFileListNode[], node: IProcessTypesSourceCodeFileListNode, index: number) => {
      if (!node.children || node.children.length == 0 || node.type == 'zip') {
        if (node.type == 'directory') {
          list.splice(index, 1)
          const selectedKeysNodesValue = this.selectedKeysNodes.value
          if (selectedKeysNodesValue?.[0] == node.key) this.selectedKeysNodes.next([])
        }

        if (node.type == 'file' || node.type == 'zip') {
          const node = this.getNodeByKey(id)
          if (node) {
            const query = this._backendService.deleteProcessesSourceCode(node.sourceCodeId).subscribe({
              next: (response) => {
                this.selectedKeysNodes.next([])
                const nodeParent = node.parent
                if (nodeParent) {
                  let index = -1;
                  for (let i = 0; i < nodeParent.children.length; i++) {
                    if (nodeParent.children[i].key == node.key) {
                      index = i
                      break
                    }
                  }
                  if (index >= 0) nodeParent.children.splice(index, 1)
                } else {
                  let index = -1;
                  for (let i = 0; i < this.nodes.value.length; i++) {
                    if (this.nodes.value[i].key == node.key) {
                      index = i
                      break
                    }
                  }
                  if (index >= 0) this.nodes.value.splice(index, 1)
                }
                this.nodes.next([...this.nodes.value])
                this._messageLogService.addIssues(response?.['issues'])
                this._notificationService.createNotificationWithType(
                  TypeNotificationEnum.success,
                  'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_SUCCESS_WHEN_DELETE_SOURCE_CODE_TITLE',
                  'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_SUCCESS_WHEN_DELETE_SOURCE_CODE_CONTENT',
                  "bottomRight",
                ).then()
                query.unsubscribe()
              },
              error: (error) => {
                this._messageLogService.addResponseIssues(error);
                this._notificationService.createNotificationError(
                  'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_ERROR_WHEN_DELETE_SOURCE_CODE_CONTENT',
                  "bottomRight",
                ).then()
                query.unsubscribe()
              }
            })
          }
        }
      } else {
        alert("No se puede borrar porque tiene hijos")
      }
    }

    const removeRecursively = (list: IProcessTypesSourceCodeFileListNode[], key: string) => {
      for (let i = 0; i < list.length; i++) {
        const node = list[i]
        if (node.key == key) {
          removeNode(list, node, i)
          return;
        }
        if (node.children && node.children.length > 0) {
          removeRecursively(node.children, key)
        }
      }
    }

    removeRecursively(newFileListSource, id)
    this.nodes.next(newFileListSource)
  }

  protected test(event) {
    console.log(event)
  }

  protected onNzTreeClick(event: NzFormatEmitEvent): void {
    const node = event.node
    if (!node) return
    const selectedKeysNodesValue = this.selectedKeysNodes.value
    this.selectedKeysNodes.next([])
    this._changeDetectorRef.detectChanges()

    if (selectedKeysNodesValue.length == 0) this.selectedKeysNodes.next([node.key])
    else {
      this.selectedKeysNodes.next(selectedKeysNodesValue[0] == node.key ? [] : [node.key])
    }
  }

  protected onChangeSelectedMainFile(event: string): void {
    this.selectedMainFile = event
    let optionSelected: { path: string, sourceCodeId: number, fileName: string } = null
    this._changeDetectorRef.detectChanges()

    for (const option of this.mainFileOptions) {
      if (option.path == this.selectedMainFile) {
        optionSelected = option
        break;
      }
    }

    if (optionSelected) {
      this._backendService.putProcess(this.processTypeId, {
        'main_path' : `/process_sources/${this.processTypeId}/${optionSelected.path}`
      }).subscribe({
        next: (response) => {
              this._notificationService.createNotificationWithType(
                TypeNotificationEnum.success,
                'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_SUCCESS_CHANGE_MAIN_FILE_TITLE',
                'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_SUCCESS_CHANGE_MAIN_FILE_CONTENT',
                "bottomRight",
              ).then()
        }
      })
    } else {
      this.selectedMainFile = null
      this._notificationService.createNotificationError(
        'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_ERROR_CHANGE_MAIN_FILE_CONTENT',
        "bottomRight"
      ).then()
    }

  }

  protected beforeUpload(file: File): boolean {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const path = `${this.SOURCE_CODE_PATH_FILES}/${this.processTypeId}${this.getRouteNodeSelected()}`
      const ext = file.name.split('.').reverse()[0]
      let contentType = this._filesService.getMIMETypeByExtension({ext})
      const query = this._filesService.postDataUrl2FileApi(
        path,
        file.name,
        reader.result as string,
        {
          'Content-Type': contentType
        }
      )
        .subscribe({
            next: (response) => {
              this._messageLogService.addIssues(response?.['issues'])
              const postProcessesSourceCode = this._backendService.postProcessesSourceCode({
                process_id: this.processTypeId,
                file_name: file.name,
                fso_path: `/${path}/${file.name}`,
                is_main: false
              }).subscribe({
                next: (postProcessesSourceCodeResponse) => {
                  if (ext === 'zip') {
                    this.postProcessesSourceCodeResponseZip(postProcessesSourceCodeResponse)
                  } else {
                    this.postProcessesSourceCodeResponseFile(postProcessesSourceCodeResponse)
                  }
                  postProcessesSourceCode.unsubscribe()
                },
                error: (error) => {
                  this._messageLogService.addResponseIssues(error);
                  this._notificationService.createNotificationError(
                    'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_ERROR_WHEN_UPLOAD_SOURCE_CODE',
                    "bottomRight",
                  ).then()
                  postProcessesSourceCode.unsubscribe()
                }
              })
              query.unsubscribe()
            },
            error: (e) => {
              this._messageLogService.addResponseIssues(e);
              this._notificationService.createNotificationError(
                'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_ERROR_WHEN_UPLOAD_SOURCE_CODE',
                "bottomRight",
              ).then()
              query.unsubscribe()
            }
          }
        )
    }
    reader.readAsDataURL(file)

    this.uploadFiles = []
    return false;
  }

  private postProcessesSourceCodeResponseFile(response: ProcessesSourceCodeResponse): void {
    const newNode: IProcessTypesSourceCodeFileListNode = {
      title: response.content.file_name,
      type: 'file',
      key: uuidv4(),
      level: 0,
      isLeaf: true,
      needCreate: false,
      expandable: false,
      sourceCodeId: response.content.id,
      path: this.convertFsoPathToNodePath(response.content.fso_path)
    }
    if (this.selectedNode) {
      const parentNode = this.getNodeByKey(this.selectedNode.key)
      newNode.parent = parentNode
      newNode.level = parentNode.level + 1
      if (parentNode) {
        parentNode.children.push(newNode)
        this.selectedNode.setExpanded(true)
      }
    } else {
      this.nodes.value.push(newNode)
    }
    this.nodes.next([...this.nodes.value])
    this._messageLogService.addIssues(response?.['issues'])
    this._notificationService.createNotificationWithType(
      TypeNotificationEnum.success,
      'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_SUCCESS_WHEN_UPLOAD_SOURCE_CODE_TITLE',
      'PROCESSES_ADMIN.PROCESS_TYPES.DETAIL.NOTIFICATION_SUCCESS_WHEN_UPLOAD_SOURCE_CODE_CONTENT',
      "bottomRight",
    ).then()
  }

  private postProcessesSourceCodeResponseZip(response: ProcessesSourceCodeResponse): void {
    const zipName = response.content.file_name
    let parentNode: IProcessTypesSourceCodeFileListNode

    if (this.selectedNode) {
      parentNode = this.getNodeByKey(this.selectedNode.key)
    }

    this.createZipByPath({
      path: zipName,
      parent: parentNode,
      sourceCode: response.content
    })
  }


}
