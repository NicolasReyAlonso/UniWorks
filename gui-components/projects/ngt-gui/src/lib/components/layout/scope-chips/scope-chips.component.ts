import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TranslateModule } from '@ngx-translate/core';

import { GlobalScopeService } from 'ngt-gui/core';

/**
 * Shows which global scopes are narrowing the listing of an entity, and lets
 * the user lift each one in place. Renders nothing when no scope applies, so
 * it can sit on top of any listing.
 *
 * A filter the user cannot see is a filter that looks like missing data: every
 * view that applies `GlobalScopeService.filterFor(...)` should show this.
 *
 * ```html
 * <ngt-scope-chips entityPath="/plants"></ngt-scope-chips>
 * ```
 */
@Component({
  selector: 'ngt-scope-chips',
  standalone: true,
  imports: [CommonModule, NzTagModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scope-chips" *ngIf="applied().length">
      <span class="scope-chips-caption">Filtrado por</span>
      <nz-tag *ngFor="let item of applied()" nzMode="closeable" nzColor="blue"
              (nzOnClose)="clear($event, item.scope.name)">
        {{ item.scope.label | translate }}: <b>{{ item.option.label }}</b>
      </nz-tag>
    </div>
  `,
  styles: [`
    .scope-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 24px; }
    .scope-chips-caption { font-size: 12px; opacity: .65; }
    nz-tag { margin: 0; }
  `],
})
export class ScopeChipsComponent {
  private readonly scopes = inject(GlobalScopeService);
  private readonly path = signal('');

  /** Path of the entity being listed (`/plants`, `/api/plants/`...). */
  @Input({ required: true }) set entityPath(value: string) { this.path.set(value || ''); }

  readonly applied = computed(() => {
    this.scopes.selection(); // re-evaluate when the selection changes
    this.scopes.scopes();
    return this.path() ? this.scopes.appliedTo(this.path()) : [];
  });

  clear(event: Event, scopeName: string): void {
    event.preventDefault(); // the tag disappears because the scope does, not on its own
    this.scopes.select(scopeName, null);
  }
}
