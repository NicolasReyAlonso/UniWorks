import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keyValueCustom',
  standalone: true
})
export class KeyValueCustomPipe implements PipeTransform {

  transform(value: any, ...args: unknown[]): { key: any, value: any }[] {
    const array: { key: any, value: any }[] = [];
    if (value instanceof Map) {
      Array.from(value.keys()).forEach(key => {
        array.push({key, value: value.get(key)});
      });
      return array;
    }
    for (const key of Object.keys(value)) {
      const item = value[key];
      array.push({key, value: item});
    }
    return array;
  }

}
