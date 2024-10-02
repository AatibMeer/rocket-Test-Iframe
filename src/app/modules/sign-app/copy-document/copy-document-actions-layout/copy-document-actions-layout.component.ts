import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuItemReference } from '../../../../common/interfaces/branding.interface';

@Component({
  selector: 'rl-copy-document-actions-layout',
  templateUrl: './copy-document-actions-layout.component.html',
  styleUrls: ['./copy-document-actions-layout.component.scss']
})
export class CopyDocumentActionsLayoutComponent {

  @Input() headerIcon: string;
  @Input() primaryCta: MenuItemReference;
  @Input() secondaryCta: MenuItemReference;

  @Output() ctaClick = new EventEmitter<string>();

}
