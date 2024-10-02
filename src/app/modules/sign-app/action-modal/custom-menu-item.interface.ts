import {Observable} from 'rxjs';

export interface ActionItem {
    /**
     * The ID is used for item ordering
     */
    id: string;
    /**
     * Used as the CTA if the heading is not present (not translated)
     */
    name?: string;
    /**
     * The CTA text for the action. Takes precedence over name and is translated
     */
    heading?: string; // aka CTA button text
    /**
     * This string is emitted to the parent window on click and is also used for query string feature toggling
     */
    eventName: string;
    /**
     * Callback triggered on clicking the CTA. Called with this set to the Action Modal component.
     * Alternative - callback form the list of predefined actions.
     */
    onClick?: () => void | CustomActionTypes;
    /**
     * Adds class(es) to the wrapper element of the CTA (button for primary, div for secondary and li for listed actions)
     */
    wrapperClass?: string | string[] | Record<string, any>;
    /**
     * The rl-icon to display next to secondary and listed actions
     */
    iconClassName?: string;
    featureToggles?: FeatureToggles;
    visible?: boolean;
    queryStringFeatureToggle?;
    /**
     * A URL to navigate to if the CTA is clicked. Bear in mind that the onClick callback will also trigger
     */
    url?: string;
    /**
     * Only for actions with a URL, open the new resource in a new window when followed
     */
    openInNewWindow?: boolean;
    visibleForNonSignableDocs?: boolean;
    /**
     * Attribute to indicate that the secondary button should be hidden when the button become a primary.
     */
    layout?: 'primaryButton' | 'primaryAndSecondaryButtons';
    /**
     * For actions with additional text (more than just a CTA), an array of such texts with visibility conditions to
     * display conditional text
     */
    headers?: ActionHeader[];
    product?: 'sign' | 'wallet' | 'notary';
    /**
     * Some actions want to have a specific related action as a secondary CTA. This will override normal ordering when it's on top.
     */
    secondaryCTA?: string | ActionItem;

    /**
     * Used to display custom modal header title
     */
    headerTitle?: string,

    /**
     * Used to indicate this button can be a secondary CTA (E.g. for custom buttons)
     */
    isSecondaryCTA?: boolean;
}

interface FeatureToggles {
    'IN_PREPARATION': StatusToggle;
    'REVIEW_AND_SHARE': StatusToggle;
    'SIGN_IN_PROGRESS': StatusToggle;
    'SIGN_COMPLETED': StatusToggle;
}

interface StatusToggle {
    'OWNER': boolean;
    'SIGNER': boolean;
    'VIEWER': boolean;
}

export interface ActionHeader {
    visible: boolean;
    title: string | (() => string | Promise<string> | Observable<string>);
    description: string | (() => string | Promise<string> | Observable<string>);
    secondDescription?: string | (() => string | Promise<string> | Observable<string>); 
    // image | useDefaultIcon
    image?: string;
    useDefaultIcon?: boolean;
}

export enum CustomActionTypes {
  CloseModal = 'CLOSE_MODAL',
}
