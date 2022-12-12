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

        this._debounceCycle = new DebounceCycle(() => {
            // fetchOptions, contentOptions, jobOptions
            return this._fetchQueue.enqueue(
                this._url,
                {
                    ...mergedOptions.fetch,
                    timeout: mergedOptions.timeout
                },
                {
                    etag: this._etag,
                    format: mergedOptions.format,
                    ...mergedOptions.content
                },
                {
                    ...mergedOptions.job
                }
            )
            .then(result => {
                // TODO get/save etag and hash
                this._etag = result.etag;

                this.pushResult(result);
                if(result.content)
                    this.pushNext(result);
            });
        }, {
            maxInterval: this._options.maxInterval,
            minInterval: this._options.minInterval,
            immediate: this._options.immediate
        });

        // stop cycle on cancel
        this.once('cancel', () => {
            this._debounceCycle.stop();
        });
    }

    get status() {
        // TODO get status from this._debounceCycle
    }

    pushResult(...args) {
        this.pushToSubscriber('result', ...args);
    }

    /**
     * Request a new cycle immediately
     */
    request() {
        this._debounceCycle.request();
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
