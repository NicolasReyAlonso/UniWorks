import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageLogService } from "src/app/services/message-log.service";
import { HttpClient } from "@angular/common/http";
import {GlobalService} from "ngt-gui/core";
import { CommonModule } from '@angular/common';
import {NzTableModule} from "ng-zorro-antd/table";


@Component({
    selector: 'app-nexus-tree-selector',
    imports: [
        CommonModule,
        NzTableModule,
    ],
    templateUrl: './nexus-tree-selector.component.html',
    styleUrls: ['./nexus-tree-selector.component.sass']
})
export class NexusTreeSelectorComponent implements OnInit {
  
  @Input('Url') Url: string;
  @Output() setSelectedTree = new EventEmitter();

  private loading: boolean;
  trees: any [];

  constructor(
    private route: ActivatedRoute,
    private msg: MessageLogService,
    private http: HttpClient,
    private readonly globalVariablesServices: GlobalService,
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

  ngOnInit(): void {
    this.msg.info('Cargando selector de árboles nexus.');
    const textOption = { responseType: 'text' };
    const options = { ...this.globalVariablesServices.authOptions, ...textOption };
    this.http.get(this.Url, options).subscribe({
      next: (apiBinary) => {
        const apiStr: string = this.ab2str(apiBinary);
        if (this.Url.endsWith('nexus.content')) {
          this.load(apiStr);
        } else if (this.Url.endsWith('newick.content')) {
          this.selectTree({name: 'Newick Tree', newick: apiStr});
        }
      },
    error: (error) => {
      this.loading = false;
      console.log(error);
      this.msg.error(error.message + '. No se pudo cargar el visor del fichero.');
    },
    complete: () => {
      this.msg.info('Visor del fichero cargado.');
    }
  });
  }

  load(nexus: string): void {
    const lines = nexus.split('\n');
    let treeName: string;
    let tree: string;
    let treeMap: {};
    this.trees = [];
    let translation = {};
    let translate = false;
    let read_trees = false;
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('translate')) {
        translate = true;
      } else if (line.startsWith("tree") || line.startsWith("TREE")) {
          read_trees = true;
          treeName = line.substring(5, line.indexOf("=") - 1);
          tree = line.substring(line.indexOf("("), line.indexOf(";"));
          if (translate) {
            const sortedKeys = Array.from(Object.keys(translation)).sort().reverse();
            sortedKeys.forEach(key => {                                                                                                                                                                                                                          
              tree = tree.replace(',' + key + ':', ',' + translation[key].toString() + ':');
              tree = tree.replace('(' + key + ':', '(' + translation[key].toString() + ':');
            });
          }
          treeMap = {name: treeName, newick: tree};
          this.trees.push(treeMap);
      } else if (translate && !read_trees) {
        const line_split = line.substring(0, line.length - 1).split(/[\t\s]+/);
        if (line_split[0] !== "" && line_split[1] !== undefined)
        translation[line_split[0]] = line_split[1]
      }
    }
    this.loading = false;
  }

  selectTree(tree: {}): void {
    this.setSelectedTree.emit(tree);
  }

}
