// Subscription Controller v0.3.0
class GenericSubscription {
    constructor() {
        this._callbacksSets = new Set();
    }

    subscribe(callbacksByType) {
        this._callbacksSets.add(callbacksByType);
        return this;
    }

    pushToSubscribers(callbackType, ...args) {
        if(this.canceled)
            throw new Error('already_canceled');

        const callbacks = [];

        for(let callbackSet of this._callbacksSets) {
            if(typeof callbackSet === 'object' && callbackSet !== null && typeof callbackSet[callbackType] === 'function')
                callbacks.push(callbackSet[callbackType]);
        }
        
        return Promise.all(callbacks.map(callback => callback(...args)));
    }

    get canceled() {
        return this.hasOwnProperty('_canceled');
    }

    cancel(...args) {
        if(this.canceled)
            throw new Error('already_canceled');
        else {
            this.pushToSubscribers('cancel', ...args);
            this._canceled = true;
        }
    }
}

export default GenericSubscription;
