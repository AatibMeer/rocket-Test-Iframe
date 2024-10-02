import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from "@angular/core";

@Component({
	selector: 'tooltip',
	templateUrl: './tooltip.component.html',
	styleUrls: ['./tooltip.component.scss']
})
export class TooltipComponent implements OnChanges {
	constructor() {}

    @Input() show = false;
    @Input() content: string;
    @Output() close = new EventEmitter();
    @ViewChild('tooltip', {read: ElementRef}) tooltip;

    ngOnChanges(changes) {
        if(changes && changes.show && !!changes.show.currentValue) this.adjustTooltipPosition();
    }

    adjustTooltipPosition() {
        if(this.tooltip && this.tooltip.nativeElement) {
            let rect = this.tooltip.nativeElement.getBoundingClientRect();
            let docWidth = document.documentElement.clientWidth;
            if(rect.left < 0) this.tooltip.nativeElement.style.left = `${Math.abs(rect.left)}px`;
            // +20px because scrollbar width isn't included
            if(rect.right > docWidth) this.tooltip.nativeElement.style.left = `${docWidth - (rect.right + 20)}px`;
            return;
        }
        setTimeout(() => this.adjustTooltipPosition(), 50);
    }

    closeTooltip() {
        this.close.emit(null);
    }
}
