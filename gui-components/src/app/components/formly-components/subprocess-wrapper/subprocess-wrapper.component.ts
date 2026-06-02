import { Component, } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';

@Component({
    selector: 'app-subprocess-wrapper',
    templateUrl: './subprocess-wrapper.component.html',
    styleUrls: ['./subprocess-wrapper.component.sass'],
    standalone: false
})
export class SubprocessWrapperComponent extends FieldWrapper {
}
