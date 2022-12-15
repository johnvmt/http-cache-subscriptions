import Promise from "bluebird";

Promise.config({
    cancellation: true
});

class DebounceCycle {
    constructor(callback, {maxInterval, minInterval = 0, immediate = true, start = true}) {
        this._callback = callback;
        this._minInterval = minInterval; // minimum time between start of requests
        this._maxInterval = maxInterval; // natural interval

        this._runStarted = new Date(); // used for calls to sleep() until one sleep() finishes

        if(start && this._maxInterval) {
            this._sleep = !immediate;
            this.start();
        }
    }

    get started() {
        return this._started ?? false;
    }

    get status() {
        return this._status ?? DebounceCycle.STATUSES.IDLE;
    }

    get queued() {
        return this._queued ?? false;
    }

    get minInterval() {
        return this._minInterval;
    }

    set minInterval(minInterval) {
        if(this._minInterval !== minInterval) {
            if(typeof this._maxInterval === "number" && typeof minInterval === "number" && minInterval >= this._maxInterval)
                throw new Error("minInterval must be < maxInterval");

            if(this._sleepPromise && this._sleepInterval === this._minInterval) { // cycle and sleep in progress with previous min interval
                this._minInterval = minInterval;
                this._sleepPromise.cancel(); // resets sleep interval
                this.cycle(); // reset cycle
            }
            else
                this._minInterval = minInterval;
        }
    }

    get maxInterval() {
        return this._maxInterval;
    }

    set maxInterval(maxInterval) {
        if(this._maxInterval !== maxInterval) {
            if(typeof maxInterval === "number" && typeof this._minInterval === "number" && this._minInterval >= maxInterval)
                throw new Error("minInterval must be < maxInterval");

            if(this._sleepPromise && this._sleepInterval === this._maxInterval) { // cycle and sleep in progress with previous max interval
                this._maxInterval = maxInterval;
                this._sleepPromise.cancel(); // resets sleep interval
                this.cycle(); // reset cycle
            }
            else
                this._maxInterval = maxInterval;
        }
    }

    async cycle() {
        if(this.status === DebounceCycle.STATUSES.IDLE) { // only start cycle if idle
            while(this.queued || (this.started && typeof this._maxInterval === "number")) {
                if(this._sleep)
                    await this.sleep();

                this._sleep = true; // wait for all subsequent cycles

                // will only run if sleep was not interrupted
                await this.run();
            }

            this._status = DebounceCycle.STATUSES.IDLE;
        }
    }

    start() {
        if(!this._started) {
            // TODO reset immediate?
            this._started = true;
            this.cycle();
        }
    }

    stop(cancel = true) {
        if(this.started) {
            this._started = false;

            // if cycle in progress, cancel it
            if(cancel) {
                if(this._runPromise)
                    this._runPromise.cancel();
                else if(this._sleepPromise)
                    this._sleepPromise.cancel();
            }
        }

    }

    request() {
        if(!this._queued) {
            this._queued = true;
            if(!this.started || (this._sleepPromise && this._sleepInterval === this._maxInterval)) { // sleep in progress using max interval
                if(this._sleepPromise)
                    this._sleepPromise.cancel(); // resets sleep interval to use min interval
                this.cycle();
            }
        }
    }

    run() {
        if(this._callback) {
            delete this._queued;
            this._status = DebounceCycle.STATUSES.RUNNING;
            this._runStarted = new Date();
            this._runPromise = DebounceCycle.functionPromise(this._callback)
                .finally(() => {
                    delete this._runPromise;
                    this._runEnded = new Date();
                });
            return this._runPromise;
        }
    }

    sleep() {
        delete this._sleepInterval;

        if(this._queued)
            this._sleepInterval = this._minInterval ?? 0;
        else if(typeof this._maxInterval === "number")
            this._sleepInterval = this._maxInterval;

        if(typeof this._sleepInterval === "number") {
            const sleepIntervalRemaining = this._sleepInterval - (new Date() - this._runStarted);

            if(sleepIntervalRemaining > 0) {
                this._status = DebounceCycle.STATUSES.SLEEPING;
                this._sleepPromise = DebounceCycle.sleep(sleepIntervalRemaining);
                return this._sleepPromise;
            }
        }
    }

    static sleep(ms) {
        return new Promise((resolve, reject, onCancel) => {
            const timeout = setTimeout(resolve, ms);

            if(onCancel)
                onCancel(() => clearTimeout(timeout));
        });
    }

    static functionPromise(callback) {
        const callbackResult = callback();

        return callbackResult instanceof Promise
            ? callbackResult
            : new Promise(resolve => resolve(callbackResult));
    }

    static STATUSES = Object.freeze({
        IDLE: "IDLE",
        SLEEPING: "SLEEPING",
        RUNNING: "RUNNING"
    });
}

export default DebounceCycle;
