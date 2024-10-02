import { Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil } from 'rxjs/operators';
import type { PerimeterXChallenge } from './perimeter-x-challenge.interface';

interface IPerimeterXService {
  /**
   * The challenge data.
   *
   * This observable emits the current value on subscription.
   */
  readonly challenge$: Observable<PerimeterXChallenge | undefined>;
  /**
   * Emits when the challenge has been attempted by the user. Only humans can make this emit `true`.
   */
  readonly result$: Observable<boolean>;
  /**
   * The user is requested to prove that they are human; show the challenge.
   *
   * This observable emits the current value on subscription.
   */
  readonly visible$: Observable<boolean>;
  /**
   * Emits when pending challenges are cancelled.
   */
  readonly cancelPending$: Observable<void>;

  /**
   * A challenge has been requested. The returned Observable emits `true` when a human completes the challenge.
   * @param challenge - The challenge data from the error response.
   */
  setupChallenge(challenge: PerimeterXChallenge): Observable<boolean>;

  /**
   * The challenge has been completed, successfully or unsuccessfully.
   * @param success
   */
  challengeCompleted(success: boolean): void;

  /**
   * Cancel the pending HTTP requests.
   * Probably because the challenge UI has been destroyed, this would prevent future challenges from completing old requests.
   */
  cancelPendingChallenges(): void;
}

@Injectable({
  providedIn: 'root',
})
export class PerimeterXService implements IPerimeterXService, OnDestroy {
  /** The current challenge data. */
  private readonly challenge = new BehaviorSubject<PerimeterXChallenge | undefined>(undefined);
  /** The result of the challenge. Only humans should get a `true` result. */
  private readonly result = new Subject<boolean>();
  /** Emits when the service is destroyed. */
  private readonly destroy = new Subject<void>();
  /** Emits when pending challenges are cancelled. */
  private readonly cancelPending = new Subject<void>();

  // the public bits
  /**
   * The challenge data.
   *
   * This observable emits the current value on subscription.
   */
  readonly challenge$: Observable<PerimeterXChallenge | undefined>;
  /**
   * Emits when the challenge has been attempted by the user. Only humans can make this emit `true`.
   */
  readonly result$: Observable<boolean>;
  /**
   * The user is requested to prove that they are human; show the challenge.
   *
   * This observable emits the current value on subscription.
   */
  readonly visible$: Observable<boolean>;
  /**
   * Emits when pending challenges are cancelled.
   */
  readonly cancelPending$: Observable<void>;

  constructor() {
    this.cancelPending$ = this.cancelPending.pipe(takeUntil(this.destroy));
    this.result$ = this.result.pipe(takeUntil(this.destroy));
    this.result$.pipe(filter((result) => result)).subscribe({
      next: () => {
        this.challenge.next(undefined);
      },
    });
    this.challenge$ = this.challenge.pipe(takeUntil(this.destroy));
    this.visible$ = this.challenge$.pipe(
      map((challenge) => challenge !== undefined),
      distinctUntilChanged()
    );
  }

  ngOnDestroy(): void {
    this.cancelPendingChallenges();
    this.destroy.next();
  }

  /**
   * A challenge has been requested. The returned Observable emits `true` when a human completes the challenge.
   * @param challenge - The challenge data from the error response.
   */
  setupChallenge(challenge: PerimeterXChallenge): Observable<boolean> {
    this.challenge.next(challenge);
    return this.result$;
  }

  /**
   * The challenge has been completed, successfully or unsuccessfully.
   * @param success
   */
  challengeCompleted(success: boolean): void {
    this.result.next(success);
  }

  /**
   * Cancel the pending HTTP requests.
   * Probably because the challenge UI has been destroyed, this would prevent future challenges from completing old requests.
   */
  cancelPendingChallenges(): void {
    this.challenge.next(undefined);
    this.cancelPending.next();
  }
}
