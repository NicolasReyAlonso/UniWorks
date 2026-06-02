import {AfterViewInit, Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {v4 as uuidv4} from 'uuid';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-jquery-querybuilder',
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule],
    templateUrl: './jquery-querybuilder.component.html',
    styleUrls: ['./jquery-querybuilder.component.sass']
})
export class JqueryQuerybuilderComponent implements OnInit, AfterViewInit {

  elementId;

  @Input() initialRules = null;
  @Input() conditions = [
    'AND',
    'OR'
  ];
  @Input() operators = [];
  @Input() filters = [];
  @Input() allow_groups = true;
  @Input() allow_empty = false;
  @Input() default_condition = 'AND';
  queryBuilder = null;

  constructor() {
  }

  ngOnInit(): void {
    this.elementId = uuidv4();
  }

  ngAfterViewInit() {
    this.initializeQueryBuilder();
  }

  private initializeQueryBuilder(): void {
    const element = $(`#${this.elementId}`);
    element.queryBuilder({
      operators: this.operators,
      conditions: this.conditions,
      allow_groups: this.allow_groups,
      allow_empty: this.allow_empty,
      default_condition: this.default_condition,
      filters: [{
        id: 'test',
        label: 'test',
        type: 'string',
        input: 'select',
        values: {
          test1: 'test1',
          test2: 'test2',
          test3: 'test3',
          test4: 'test4'
        }
      }],
      rules: this.initialRules,
    });
  }

  resetQueryBuilder(): void {
    const element = $(`#${this.elementId}`);
    element.queryBuilder('reset');
  }

  setFilters(filters: any[]): void {
    const element = $(`#${this.elementId}`);
    element.queryBuilder('setFilters', filters);
  }

  getValidation(): boolean {
    const element = $(`#${this.elementId}`);
    return element.queryBuilder('validate');
  }

  getRules(): any {
    const element = $(`#${this.elementId}`);
    return element.queryBuilder('getRules');
  }

  setRules(rules): any {
    const element = $(`#${this.elementId}`);
    return element.queryBuilder('setRules', rules);
  }

}
