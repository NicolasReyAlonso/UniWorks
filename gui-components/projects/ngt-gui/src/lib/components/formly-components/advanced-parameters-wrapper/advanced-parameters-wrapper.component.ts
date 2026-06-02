import { Component, } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';

@Component({
    selector: 'app-subprocess-wrapper',
    templateUrl: './advanced-parameters-wrapper.component.html',
    styleUrls: ['./advanced-parameters-wrapper.component.sass'],
    standalone: false
})
export class AdvancedParametersWrapperComponent extends FieldWrapper {
}
