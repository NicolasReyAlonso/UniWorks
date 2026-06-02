import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DynamicAnalysisDetailComponent} from "ngt-gui/gui";
import { IView } from "ngt-gui/gui";
import CKEditorAnnotations from 'src/app/components/data/annotations/ckeditor-annotations-form/build/ckeditor';
import {ChangeEvent} from '@ckeditor/ckeditor5-angular/ckeditor.component';

@Component({
    selector: 'app-alignment-detail',
    imports: [
        CommonModule,
        DynamicAnalysisDetailComponent,
    ],
    templateUrl: './alignment-detail.component.html',
    styleUrls: ['./alignment-detail.component.sass']
})
export class AlignmentDetailComponent implements IView {
  ckEditor = CKEditorAnnotations;
  BREADCRUMB_NAME = {
    key: 'MOLECULAR_DATA.MULTIPLE_ALIGNMENTS.DETAIL.BREADCRUMB',
    params: {
      name: '',
    }
  }

}
