import { Component, Input } from '@angular/core';

@Component({
    selector: 'sticky-banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss']
})

export class StickyBannerComponent {
    @Input() msg;
}