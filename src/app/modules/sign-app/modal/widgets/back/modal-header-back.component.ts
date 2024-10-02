import {Component, ElementRef, HostBinding, Input, OnDestroy, OnInit} from '@angular/core';
import {ModalControlService} from '../../../../../services/sign-app/modal-control.service';
import {Subject} from 'rxjs';
import {fromEvent} from 'rxjs';
import {take, takeUntil} from 'rxjs/operators';
import {TranslateService} from '@ngx-translate/core';

@Component({
    selector: 'rl-modal-header-back',
    styleUrls: ['./modal-header-back.component.scss'],
    template: '<div class="rl-icon back rl-modal-header-back" rl-test="modal-back"></div>'
})
export class ModalHeaderBackComponent implements OnDestroy, OnInit {
    private readonly destroy: Subject<void>;
    @HostBinding('tabindex')
    private _tabIndex: number;
    get tabIndex(): number {
        return this._tabIndex;
    }
    @Input()
    set tabIndex(index: number) {
        this._tabIndex = index || 0;
    }
    @HostBinding('title')
    title: string;

    constructor(
        private readonly elementRef: ElementRef,
        private readonly modalControlService: ModalControlService,
        private readonly translateService: TranslateService
    ) {
        this.destroy = new Subject<void>();
        this._tabIndex = 0;
    }

    ngOnDestroy(): void {
        this.destroy.next();
    }

    ngOnInit(): void {
        fromEvent(this.elementRef.nativeElement, 'click').pipe(
            takeUntil(this.destroy)
        ).subscribe(() => {
            this.modalControlService.navigate('back');
        });
        this.translateService.get('modal-widget-modal-header-back_title').pipe(
            take(1)
        ).subscribe((title) => this.title = title);
    }
}
