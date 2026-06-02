import {AfterViewInit, Component, DestroyRef, inject, Input, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from "@angular/common";
import {AnnotationsFormComponent} from "@components/data/annotations/annotations-form/annotations-form.component";
import {Observable} from "rxjs";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
    imports: [
        CommonModule,
        AnnotationsFormComponent,
    ],
    selector: 'app-processes-types-detail-annotations-tab',
    templateUrl: './processes-types-detail-annotations-tab.component.html',
    styleUrls: ['./processes-types-detail-annotations-tab.component.sass']
})
export class ProcessesTypesDetailAnnotationsTabComponent implements OnInit {

  private _destroyRef = inject(DestroyRef)

  @ViewChild(AnnotationsFormComponent, {static: false}) protected annotationsFormComponent;

  @Input({required: true}) public uuid$: Observable<string | null>;

  ngOnInit() {
    this.uuid$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe((uuid) => {
      if (uuid) {
        this.annotationsFormComponent.object_uuid = uuid;
        this.annotationsFormComponent.loadAnnotations();
      }
    })
  }

}
