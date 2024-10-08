import type { Action } from 'redux';

// the types and functions in this file are from https://github.com/reduxjs/redux-toolkit.
// with minor adjustments for our version of redux and removing that library's extra functions.

/**
 * return TrueType if T is `any`, otherwise return FalseType
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export type IsAny<T, TrueType, FalseType = never> =
  // test if we are going the left AND right path in the condition
  true | false extends (T extends never ? true : false) ? TrueType : FalseType;

/**
 * return TrueType if T is `unknown`, otherwise return FalseType
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export type IsUnknown<T, TrueType, FalseType = never> = unknown extends T ? IsAny<T, FalseType, TrueType> : FalseType;

/**
 * @internal
 */
export type IfMaybeUndefined<P, TrueType, FalseType> = [undefined] extends [P] ? TrueType : FalseType;

/**
 * @internal
 */
export type IfVoid<P, TrueType, FalseType> = [void] extends [P] ? TrueType : FalseType;

/**
 * @internal
 */
export type IsEmptyObj<T, TrueType, FalseType = never> = T extends any
  ? keyof T extends never
    ? IsUnknown<T, FalseType, IfMaybeUndefined<T, FalseType, IfVoid<T, FalseType, TrueType>>>
    : FalseType
  : never;

/**
 * An action with a string type and an associated payload. This is the
 * type of action returned by `createAction()` action creators.
 *
 * @template P The type of the action's payload.
 * @template T the type used for the action type.
 * @template M The type of the action's meta (optional)
 * @template E The type of the action's error (optional)
 *
 * @public
 */
export type PayloadAction<P = void, T extends string = string, M = never, E = never> = {
  type: T;
} & ([P] extends [undefined] ? { payload?: undefined } : { payload?: P }) &
  ([M] extends [never]
    ? {}
    : {
        meta: M;
      }) &
  ([E] extends [never]
    ? {}
    : {
        error: E;
      });

/**
 * A "prepare" method to be used as the second parameter of `createAction`.
 * Takes any number of arguments and returns a Flux Standard Action without
 * type (will be added later) that *must* contain a payload (might be undefined).
 *
 * @public
 */
export type PrepareAction<P> =
  | ((...args: any[]) => { payload: P })
  | ((...args: any[]) => { payload: P; meta: any })
  | ((...args: any[]) => { payload: P; error: any })
  | ((...args: any[]) => { payload: P; meta: any; error: any });

/**
 * Basic type for all action creators.
 *
 * @inheritdoc {redux#ActionCreator}
 */
interface BaseActionCreator<P, T extends string, M = never, E = never> {
  type: T;
  match: (action: Action) => action is PayloadAction<P, T, M, E>;
}

/**
 * An action creator that takes multiple arguments that are passed
 * to a `PrepareAction` method to create the final Action.
 * @typeParam Args arguments for the action creator function
 * @typeParam P `payload` type
 * @typeParam T `type` name
 * @typeParam E optional `error` type
 * @typeParam M optional `meta` type
 *
 * @inheritdoc {redux#ActionCreator}
 *
 * @public
 */
export interface ActionCreatorWithPreparedPayload<
  Args extends unknown[],
  P,
  T extends string = string,
  E = never,
  M = never
> extends BaseActionCreator<P, T, M, E> {
  /**
   * Calling this {@link redux#ActionCreator} with `Args` will return
   * an Action with a payload of type `P` and (depending on the `PrepareAction`
   * method used) a `meta`- and `error` property of types `M` and `E` respectively.
   */
  (...args: Args): PayloadAction<P, T, M, E>;
}

/**
 * An action creator of type `T` that takes an optional payload of type `P`.
 *
 * @inheritdoc {redux#ActionCreator}
 *
 * @public
 */
export interface ActionCreatorWithOptionalPayload<P, T extends string = string> extends BaseActionCreator<P, T> {
  /**
   * Calling this {@link redux#ActionCreator} with an argument will
   * return a {@link PayloadAction} of type `T` with a payload of `P`.
   * Calling it without an argument will return a PayloadAction with a payload of `undefined`.
   */
  (payload?: P): PayloadAction<P, T>;
}

/**
 * An action creator of type `T` that takes no payload.
 *
 * @inheritdoc {redux#ActionCreator}
 *
 * @public
 */
export interface ActionCreatorWithoutPayload<T extends string = string> extends BaseActionCreator<undefined, T> {
  /**
   * Calling this {@link redux#ActionCreator} will
   * return a {@link PayloadAction} of type `T` with a payload of `undefined`
   */
  (): PayloadAction<undefined, T>;
}

/**
 * An action creator of type `T` that requires a payload of type P.
 *
 * @inheritdoc {redux#ActionCreator}
 *
 * @public
 */
export interface ActionCreatorWithPayload<P, T extends string = string> extends BaseActionCreator<P, T> {
  /**
   * Calling this {@link redux#ActionCreator} with an argument will
   * return a {@link PayloadAction} of type `T` with a payload of `P`
   */
  (payload: P): PayloadAction<P, T>;
}

/**
 * An action creator of type `T` whose `payload` type could not be inferred. Accepts everything as `payload`.
 *
 * @inheritdoc {redux#ActionCreator}
 *
 * @public
 */
export interface ActionCreatorWithNonInferrablePayload<T extends string = string>
  extends BaseActionCreator<unknown, T> {
  /**
   * Calling this {@link redux#ActionCreator} with an argument will
   * return a {@link PayloadAction} of type `T` with a payload
   * of exactly the type of the argument.
   */
  <PT extends unknown>(payload: PT): PayloadAction<PT, T>;
}

type IfPrepareActionMethodProvided<PA extends PrepareAction<any> | void, TrueType, FalseType> = PA extends (
  ...args: any[]
) => any
  ? TrueType
  : FalseType;

/**
 * Internal version of `ActionCreatorWithPreparedPayload`. Not to be used externally.
 *
 * @internal
 */
export type _ActionCreatorWithPreparedPayload<
  PA extends PrepareAction<any> | void,
  T extends string = string
> = PA extends PrepareAction<infer P>
  ? ActionCreatorWithPreparedPayload<
      Parameters<PA>,
      P,
      T,
      ReturnType<PA> extends {
        error: infer E;
      }
        ? E
        : never,
      ReturnType<PA> extends {
        meta: infer M;
      }
        ? M
        : never
    >
  : void;

/**
 * An action creator that produces actions with a `payload` attribute.
 *
 * @typeParam P the `payload` type
 * @typeParam T the `type` of the resulting action
 * @typeParam PA if the resulting action is preprocessed by a `prepare` method, the signature of said method.
 *
 * @public
 */
export type PayloadActionCreator<
  P = void,
  T extends string = string,
  PA extends PrepareAction<P> | void = void
> = IfPrepareActionMethodProvided<
  PA,
  _ActionCreatorWithPreparedPayload<PA, T>,
  // else
  IsAny<
    P,
    ActionCreatorWithPayload<any, T>,
    IsUnknown<
      P,
      ActionCreatorWithNonInferrablePayload<T>,
      // else
      IfVoid<
        P,
        ActionCreatorWithoutPayload<T>,
        // else
        IfMaybeUndefined<
          P,
          ActionCreatorWithOptionalPayload<P, T>,
          // else
          ActionCreatorWithPayload<P, T>
        >
      >
    >
  >
>;

/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type The action type to use for created actions.
 * @param prepare (optional) a method that takes any number of arguments and returns { payload } or { payload, meta }.
 *                If this is given, the resulting action creator will pass its arguments to this method to calculate payload & meta.
 *
 * @public
 */
export function createAction<P = void, T extends string = string>(type: T): PayloadActionCreator<P, T>;

/**
 * A utility function to create an action creator for the given action type
 * string. The action creator accepts a single argument, which will be included
 * in the action object as a field called payload. The action creator function
 * will also have its toString() overriden so that it returns the action type,
 * allowing it to be used in reducer logic that is looking for that action type.
 *
 * @param type The action type to use for created actions.
 * @param prepare (optional) a method that takes any number of arguments and returns { payload } or { payload, meta }.
 *                If this is given, the resulting action creator will pass its arguments to this method to calculate payload & meta.
 *
 * @public
 */
export function createAction<PA extends PrepareAction<any>, T extends string = string>(
  type: T,
  prepareAction: PA
): PayloadActionCreator<ReturnType<PA>['payload'], T, PA>;

export function createAction(type: string, prepareAction?: Function): any {
  function actionCreator(...args: any[]) {
    if (prepareAction) {
      const prepared = prepareAction(...args);
      if (!prepared) {
        throw new Error('prepareAction did not return an object');
      }

      return {
        type,
        payload: prepared.payload,
        ...('meta' in prepared && { meta: prepared.meta }),
        ...('error' in prepared && { error: prepared.error }),
      };
    }
    return { type, payload: args[0] };
  }

  actionCreator.toString = () => `${type}`;

  actionCreator.type = type;

  actionCreator.match = (action: Action): action is PayloadAction => action.type === type;

  return actionCreator;
}

export function withPayloadType<T>() {
  return (payload: T) => ({ payload });
}
