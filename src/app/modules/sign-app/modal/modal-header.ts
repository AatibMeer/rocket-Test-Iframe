// eslint-disable-next-line max-classes-per-file
import { QueryList } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalHeaderWidgetDirective } from './modal-header-widget.directive';

export class ModalHeaderBase {
  widgets?: QueryList<ModalHeaderWidgetDirective>;
}

export interface ModalHeader extends ModalHeaderBase {
  leftWidget?: ModalHeaderWidgetDirective;
  rightWidget?: ModalHeaderWidgetDirective;
  readonly showWidgets: boolean;

  setupWidgets(): void;
}

export function WithWidgets<T extends new (...args: any[]) => ModalHeaderBase>(
  Base: T
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): new (...args: any[]) => ModalHeader {
  return class ModalHeaderWithWidgets extends Base implements ModalHeader {
    leftWidget?: ModalHeaderWidgetDirective;
    rightWidget?: ModalHeaderWidgetDirective;
    /** @protected */
    readonly stopWidgetChangesSubscription = new Subject<void>();

    get showWidgets(): boolean {
      return !!this.leftWidget || !!this.rightWidget;
    }

    setupWidgets(): void {
      const doSetupWidgets = () => {
        this.widgets?.forEach((widget) => {
          if (widget.position === 'left') {
            this.leftWidget = widget;
          } else if (widget.position === 'right') {
            this.rightWidget = widget;
          }
        });
      };
      this.stopWidgetChangesSubscription.next();
      this.widgets?.changes.pipe(takeUntil(this.stopWidgetChangesSubscription)).subscribe({
        next: doSetupWidgets,
      });
      doSetupWidgets();
    }
  };
}
