import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {Party} from '../../../services/sign-app/party.interface';
import {TypographyColors} from '../typography/typography.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'rl-party-avatar',
    template: '<rl-avatar [color]="avatarColor">{{ party?.legalName | rlAcronym | uppercase }}</rl-avatar>'
})
export class PartyAvatarComponent implements OnChanges {
    get avatarColor(): TypographyColors | string | undefined {
        return this._color;
    }
    private _color: TypographyColors | string | undefined;

    /**
     * Optional color override. If this is <code>undefined</code> then the party background color will be used.
     * An empty string will set no color.
     * @see AvatarComponent#color
     */
    @Input()
    color: TypographyColors | string | undefined;
    @Input()
    party: Party;

    private static getColorFromParty(party: Party): string {
        return party?.metaData?.style?.background || '';
    }

    ngOnChanges({color, party}: SimpleChanges): void {
        if (party) {
            this._color = PartyAvatarComponent.getColorFromParty(party.currentValue);
        }
        if (color) {
            this._color = color.currentValue ?? PartyAvatarComponent.getColorFromParty(this.party);
        }
    }
}