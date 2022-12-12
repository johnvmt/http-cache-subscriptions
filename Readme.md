# HTTP Cache Subscriptions

Check HTTP resources on an interval and cache the responses

## Examples

### HttpSubscription


    import HttpFetchQueue from "http-fetch-queue";
    import {HttpSubscription} from "http-cache-subscriptions";
    
    const queue = new HttpFetchQueue({
        maxConcurrents: 1,
        maxAttempts: 1
    });
    
    const subscription = new HttpSubscription(queue,
        "JSON-FILE-URL",
        {
            maxInterval: 10000,
            minInterval: 1000,
            immediate: true,
            format: "json"
        }
    );
    
    subscription.subscribe({
        next: (result) => {
            console.log(result);
        },
        error: (error) => {
            console.error("ERR", error);
        }
    });
