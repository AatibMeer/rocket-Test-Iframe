import {Component, ElementRef, HostBinding, Input, OnDestroy, OnInit} from '@angular/core';
import {CloseReason, ModalControlService} from '../../../../../services/sign-app/modal-control.service';
import {Subject} from 'rxjs';
import {fromEvent, merge} from 'rxjs';
import {take, takeUntil} from 'rxjs/operators';
import {TranslateService} from '@ngx-translate/core';

@Component({
    selector: 'rl-modal-header-close',
    styleUrls: ['./modal-header-close.component.scss'],
    template: ''
})
export class ModalHeaderCloseComponent implements OnDestroy, OnInit {
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
    private _title: string;
    get title(): string {
        return this._title;
    }
    @Input()
    set title(title: string | undefined) {
        this.titleSubject.next(title || '');
    }
    private readonly titleSubject: Subject<string>;

    constructor(
        private readonly elementRef: ElementRef,
        private readonly modalControlService: ModalControlService,
        private readonly translateService: TranslateService
    ) {
        this.destroy = new Subject<void>();
        this._tabIndex = 0;
        this._title = '';
        this.titleSubject = new Subject<string>();
    }

    ngOnDestroy(): void {
        this.destroy.next();
    }

    ngOnInit(): void {
        // using this subject for our title so that if a title is given as an input whilst the translation service is
        // still fetching, the subject will stop the service.get() subscription from overwriting the title
        this.titleSubject.pipe(
            takeUntil(this.destroy)
        ).subscribe((title) => this._title = title);
        fromEvent(this.elementRef.nativeElement, 'click').pipe(
            takeUntil(this.destroy)
        ).subscribe(() => {
            this.modalControlService.close(CloseReason.UserTerminated);
        });
        this.translateService.get('modal-widget-modal-header-close_title').pipe(
            takeUntil(merge(this.destroy, this.titleSubject)),
            take(1)
        ).subscribe((title) => this.title = title);
    }
}
