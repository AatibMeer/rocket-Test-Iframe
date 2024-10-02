import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class DocPreviewControlService {
  shouldHighlightInputsSource$ = new Subject<void>();
  highlightingInputsConfirmedSource$ = new Subject<void>();
  highlightNextInputSource$ = new Subject<void>();

  shouldHighlight$ = this.shouldHighlightInputsSource$.asObservable();
  highlightConfirmed$ = this.highlightingInputsConfirmedSource$.asObservable();
  highlightedNextInput$ = new Subject<void>();

  highlightInputs() {
    this.shouldHighlightInputsSource$.next();
  }

  confirmHighlightedInputs() {
    this.highlightingInputsConfirmedSource$.next();
  }

  highlightNextInput() {
    this.highlightNextInputSource$.next();
  }
}
