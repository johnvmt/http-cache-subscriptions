// Subscription Controller v0.2.0
import EventEmitter from "events";

class GenericSubscription extends EventEmitter {
    constructor() {
        super()
        this._callbacksSets = new Set();
    }

    subscribe(callbacksByType) {
        this._callbacksSets.add(callbacksByType);
        this.emit('subscribe');
        return this;
    }

    pushNext(...args) {
        this.pushToSubscriber('next', ...args);
    }

    pushError(...args) {
        this.pushToSubscriber('error', ...args);
    }

    pushToSubscriber(callbackType, ...args) {
        if(this.canceled)
            throw new Error('already_canceled');

        for(let callbacks of this._callbacksSets) {
            if(typeof callbacks === 'object' && callbacks !== null && typeof callbacks[callbackType] === 'function')
                callbacks[callbackType](...args);
        }
    }

    get canceled() {
        return this.hasOwnProperty('_canceled');
    }

    cancel() {
        if(this.canceled)
            throw new Error('already_canceled');
        else {
            this._canceled = true;
            this.emit('cancel');
            this.removeAllListeners();
        }
    }
}

export default GenericSubscription;
