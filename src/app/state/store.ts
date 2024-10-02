import { Injectable } from '@angular/core';
import {Action, createStore, Reducer, Store as ReduxStore, Unsubscribe} from 'redux';
import {mainReducer} from './reducers/main';
import {Observable, ReplaySubject} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {composeWithDevTools} from 'redux-devtools-extension/developmentOnly';
import type { State } from './reducers/main.interface';

export interface IStore<S> extends Pick<ReduxStore<S>, 'dispatch' | 'getState' | 'subscribe'> {
    getState$(): Observable<S>;
}

export abstract class GStore<S> implements IStore<S> {
    protected readonly store: ReduxStore<S>;

    protected constructor(reducer: Reducer<S>) {
        this.store = createStore(reducer, composeWithDevTools());
    }

    /**
     * Get the current state.
     */
    getState(): S {
        return this.store.getState();
    }

    /**
     * Returns the state as an asynchronous observable. It will immediately emit the current state, so no more will you
     * have to call your state setup function twice!
     *
     * Turns
     * <code>
 *       setup(store.getState());
 *       this.unsub = store.subscribe((state) => setup(state));
     * </code>
     *
     * into
     *
     * <code>
     *     store.getState$().subscribe((state) => setup(state));
     * </code>
     */
    getState$(): Observable<S> {
        // A Subject variant which also emits the most recent value to new subscribers.
        const subject = new ReplaySubject<S>(1);
        // subscribe to Redux changes as normal. Save the unsubscribe function for when the observable completes
        // (or errors).
        const unsub = this.store.subscribe(() => {
            subject.next(this.getState());
        });
        // emit the current state immediately
        subject.next(this.getState());
        // turn the subject into an observable and unsubscribe from the Redux store when the observable completes.
        return subject.pipe(
            finalize(() => unsub())
        );

    }

    dispatch<A extends Action>(action: A): A {
        return this.store.dispatch(action);
    }

    /**
     * Redux-style subscription to state changes but also passes the current state to your callback.
     *
     * You could, instead, subscribe to <code>getState$()</code> which will also give you RxJS powers.
     */
    subscribe(callback: (state: S) => void): Unsubscribe {
      return this.store.subscribe(
        () => callback(this.store.getState())
      );
    }
}

@Injectable()
export class Store extends GStore<State> {
    constructor() {
        super(mainReducer);
    }
}
