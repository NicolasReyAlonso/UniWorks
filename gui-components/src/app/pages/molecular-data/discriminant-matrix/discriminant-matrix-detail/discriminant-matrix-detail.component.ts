import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {DynamicAnalysisDetailComponent} from "../../../../components/dynamics/dynamic-analysis-detail/dynamic-analysis-detail.component";

@Component({
    selector: 'app-discriminant-matrix-detail',
    imports: [
        CommonModule,
        DynamicAnalysisDetailComponent,
    ],
    templateUrl: './discriminant-matrix-detail.component.html',
    styleUrls: ['./discriminant-matrix-detail.component.sass']
})
export class DiscriminantMatrixDetailComponent {

}
