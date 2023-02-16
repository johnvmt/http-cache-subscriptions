import GenericSubscription from "./utils/GenericSubscription.js";
import DebounceCycle from "./utils/DebounceCycle.js";

// TODO allow a way to force refetch (ie: ignore etag)
// TODO allow usage without http fetch queue
class HttpSubscription extends GenericSubscription {
    constructor(httpFetchQueue, url, options = {}) {
        super();

        const mergedOptions = HttpSubscription.mergeOptions(options);

        HttpSubscription.validate(url, mergedOptions);

        // {maxInterval, minInterval = 0, immediate = true}
        this._fetchQueue = httpFetchQueue;
        this._url = url;
        this._options = mergedOptions;

        this._debounceCycle = new DebounceCycle(
            () => this.fetch(),
            {
                maxInterval: this._options.maxInterval,
                minInterval: this._options.minInterval,
                immediate: this._options.immediate
            }
        );
    }

    fetch() {
        let response;
        // fetchOptions, contentOptions, jobOptions
        return this.pushToSubscribers('enqueue')
            .then(() => {
                return this._fetchQueue.enqueue(
                    this._url,
                    {
                        ...this._options.fetch,
                        timeout: this._options.timeout
                    },
                    {
                        etag: this._etag,
                        format: this._options.format,
                        ...this._options.content
                    },
                    {
                        priority: this._options.priority ?? 0,
                        ...this._options.job
                    }
                )
            }
        )
        .then(fetchResponse => {
            response = fetchResponse;
            return this.pushToSubscribers('response', response);
        })
        .then(() => {
            if(response.content)
                return this.pushToSubscribers('content', response.content);
        })
        .then(() => {
            this._etag = response.headers.get('etag'); // save etag once success is achieved
            return this.pushToSubscribers('success');
        })
        .catch((...args) => {
            return this.pushToSubscribers('error', ...args);
        })
        .finally(() => {
            return this.pushToSubscribers('finally')
        });
    }

    set status(status) {

    }

    get status() {
        // TODO get status from this._debounceCycle
    }

    /**
     * Request a new cycle immediately
     */
    request() {
        this._debounceCycle.request();
    }

    cancel(...args) {
        super.cancel(...args);
        this._debounceCycle.stop();
    }

    /**
     * @param level
     * @param messageParts
     */
    log(level, ...messageParts) {
        if(this._options.hasOwnProperty('logger')) {
            this._options.logger.log({
                level: level,
                label: 'subscription manager',
                message: messageParts.join(' ')
            });
        }
    }

    /**
     * @param url
     * @param options
     */
    static validate(url, options) {
        new URL(url); // will throw an error if invalid
    }

    /**
     * @type {Readonly<{SLEEPING: string, FETCHING: string, IDLE: string, CANCELED: string}>}
     */
        // TODO merge with DebounceCycle statuses
    static STATUSES = Object.freeze({
        IDLE: 'IDLE',
        FETCHING: 'FETCHING',
        SLEEPING: 'SLEEPING',
        CANCELED: 'CANCELED'
    });

    /**
     * @type {Readonly<{BASE64: string, JSON: string, TEXT: string}>}
     */
    static FORMATS = Object.freeze({
        BASE64: 'base64',
        JSON: 'json',
        TEXT: 'text'
    });

    /**
     * @type {Readonly<{minInterval: number, format: string, interval: number, timeout: number}>}
     */
    static DEFAULTS = Object.freeze({
        minInterval: 0, // in ms
        immediate: true,
        timeout: 30000, // in ms
        format: HttpSubscription.FORMATS.TEXT
    });

    static mergeOptions(options) {
        return {
            ...HttpSubscription.DEFAULTS,
            ...options
        }
    }
}

export default HttpSubscription;
