
// TODO: reverse-engineer what's the type of history events
export function historyReducer(history: Array<any>, action) {
    if (action.type == 'UPDATE_HISTORY') {
      return filterDuplicates(action.data);
    }

    return history || [];
  }

// looks for "duplicate" entries in the documentEvents and removes them if they satisfy certain conditions
// SIGN-774
export function filterDuplicates(events) {
    function isSame(event, secondEvent) {
        if(!event) return false;
        var currentEventDate = new Date(event.occurredAt);
        var nextEventDate = new Date(secondEvent.occurredAt);
        var threshold = new Date(currentEventDate.getTime() + ( 15 * 60 * 1000) );
        var eventEmail = event.details && event.details.email;
        var secondEventEmail = secondEvent.details && secondEvent.details.email;

        if( event.partyId != secondEvent.partyId) return false;
        //SIGN-4552 we should not filter duplicates of BINDER_DOCUMENT_CHANGED events
        if( event.type != secondEvent.type || event.type === 'BINDER_DOCUMENT_CHANGED' ) return false;
        if( eventEmail != secondEventEmail ) return false;
        if( threshold <= nextEventDate) return false;
        return true;
    }

    return events.reverse().reduce(
        (accumulator, currentValue, currentIndex, array) => {
        return (isSame(accumulator[accumulator.length-1], currentValue) ? accumulator : accumulator.concat(currentValue));
    }, [events[0]]).reverse();
}