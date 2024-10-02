import { ActionItem } from './custom-menu-item.interface';
import { ActionsOrderByStatus } from '../../../common/interfaces/branding.interface';
import { BinderStatus } from '../../../services/sign-app/binder.interface';

export class ActionItemsOrdering {
  constructor(private readonly actionsOrder: ActionsOrderByStatus,
              private readonly binderStatus: BinderStatus) {
  }

  sort(actions: ActionItem[]): ActionItem[] {
    const strategy = this.actionsOrder && this.binderStatus
      ? new BrandingSortingStrategy(this.actionsOrder, this.binderStatus)
      : new DefaultSortingStrategy();

    return strategy.sort(actions);
  }
}

interface ActionItemSortingStrategy {
  sort(actions: ActionItem[]): ActionItem[];
}

class DefaultSortingStrategy implements ActionItemSortingStrategy {
  sort(actions: ActionItem[]): ActionItem[] {
    return actions;
  }
}

class BrandingSortingStrategy implements ActionItemSortingStrategy {

  constructor(private readonly customOrder: ActionsOrderByStatus,
              private readonly binderStatus: BinderStatus) {
  }

  sort(actions: ActionItem[]): ActionItem[] {
    const actionsOrderBaseOnStatus = this.customOrder[this.binderStatus] || this.customOrder.DEFAULT;
    return this.sortByDefinedOrder(actions, actionsOrderBaseOnStatus);
  }

  sortByDefinedOrder(actions: ActionItem[], actionsOrder: string[]) {
    return actions.sort((a, b) => {
      const itemAOrder = actionsOrder.indexOf(a.id);
      const itemBOrder = actionsOrder.indexOf(b.id);

      return itemAOrder - itemBOrder;
    });
  }
}