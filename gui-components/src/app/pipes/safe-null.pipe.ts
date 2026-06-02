import { Pipe } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  standalone: true,
  name: 'safeNull'
})
export class SafeNullPipe {
  constructor(){}

  transform(value, ...args: unknown[]) {
    if (value) {
      return value;
    } else {
      if (args[0]) {
        return args[0];
      } else {
        return '-';
      }
    }
  }
}
