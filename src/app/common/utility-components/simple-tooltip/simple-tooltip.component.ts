import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'rl-simple-tooltip',
  styleUrls: ['./simple-tooltip.component.scss'],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="tooltip-boundary">
      <div class="tooltip-background" role="tooltip">
        <ng-content></ng-content>
      </div>
      <div class="tooltip-arrow"></div>
    </div>`
})
export class SimpleTooltipComponent {}
