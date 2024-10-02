import { Directive, Input } from '@angular/core';

/** A directive to mark a header widget. Gives IntelliSense suggestions and can be used in selectors instead of using template vars. */
@Directive({
  selector: '[rl-modal-header-widget]',
})
export class ModalHeaderWidgetDirective {
  /** The widget's position in a left-to-right (ltr) language. */
  @Input('rl-modal-header-widget') position!: 'left' | 'right';
}
