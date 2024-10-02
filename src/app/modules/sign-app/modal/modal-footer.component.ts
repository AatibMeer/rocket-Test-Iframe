import { Component, OnDestroy } from '@angular/core';
import { Store } from '../../../state/store';

@Component({
  selector: 'rl-modal-footer',
  styleUrls: ['./modal-footer.component.scss'],
  templateUrl: './modal-footer.component.html'
})
export class ModalFooterComponent implements OnDestroy {
    constructor(private store: Store) {
        this.setupComponent(this.store.getState());
        let sub = this.store.subscribe((state) => {
            this.setupComponent(state);
        });
        this.subs.push(sub);
    }

    subs: Function[] = []; 
    brandingLevel = 3;
    
    setupComponent(state) {
        this.brandingLevel = state.globalBrandConfig?.brandingLevel || 3;
    }

    ngOnDestroy(): void {
        this.subs.forEach(unsub => unsub());
    }
}
