// Object Utils v1.0.9
function objectFilterExclude(rawObject, pathsOrPathsParts = []) {
    const clone = objectClone(rawObject);
    for(let objectPath of pathsOrPathsParts) {
        objectDelete(clone, objectPath);
    }
    return clone;
}

function objectFilterInclude(rawObject, pathsOrPathsParts = []) {
    const filteredObject = {};

    for(let pathOrPathParts of pathsOrPathsParts) {
        const pathParts = pathPartsFromPath(pathOrPathParts);
        if(objectHas(rawObject, pathParts))
            objectSet(filteredObject, pathParts, objectGet(rawObject, pathParts));
    }

    return filteredObject;
}

function objectClone(rawObject) {
    return JSON.parse(JSON.stringify(rawObject));
}

function indexArrayBy(array, pathOrParts) {
    const pathParts = pathPartsFromPath(pathOrParts);
    return array.reduce((indexed, item) => {
        if ((item instanceof Object)) {
            const indexValue = objectGet(item, pathParts);
            if (indexValue !== undefined)
                indexed[indexValue] = item;
        }

        return indexed;
    }, {});
}

function objectDeepEqual(x, y) {
    if(x === y)
        return true;

    else if((typeof x === 'object' && x !== null) && (typeof y === 'object' && y !== null)) {
        if(Object.keys(x).length !== Object.keys(y).length)
            return false;

        for(let prop in x) {
            if(x.hasOwnProperty(prop) && y.hasOwnProperty(prop)) {
                if (!objectDeepEqual(x[prop], y[prop]))
                    return false;
            }
            else
                return false;
        }
        return true;
    }
    else
        return (x === y);
}

function objectDiffs(x, y) {
    const diffPaths = [];

    const objectDiffsX = (x, y, prefix = []) => {
        if(typeof x === "object" && x !== null) {
            for(let prop in x) {
                if(x.hasOwnProperty(prop)) {
                    if(typeof x[prop] === "object" && x[prop] !== null) // x[prop] is an object
                        objectDiffsX(x[prop], (typeof y === "object" && y !== null) ? y[prop] : undefined, prefix.concat([prop]));
                    else if (typeof y !== "object" || y === null || x[prop] !== y[prop]) // x[prop] is not an object and doesnt match y[prop]
                        diffPaths.push(prefix.concat([prop]))
                }
            }
        }
    }

    const objectDiffsY = (y, x, prefix = []) => {
        if(typeof y === "object" && x !== null) {
            for(let prop in y) {
                if(y.hasOwnProperty(prop)) {
                    if(typeof y[prop] === "object" && y[prop] !== null) // y[prop] is an object
                        objectDiffsY(y[prop], (typeof x === "object") ? x[prop] : undefined, prefix.concat([prop]));
                    else if (typeof x !== "object" || x[prop] === undefined) // y[prop] is not an object and doesnt match x[prop]
                        diffPaths.push(prefix.concat([prop]))
                }
            }
        }
    }

    objectDiffsX(x, y);
    objectDiffsY(y, x);

    return diffPaths;
}

function objectDelete(object, objectPath) {
    const pathParts = pathPartsFromPath(objectPath);

    if(pathParts.length === 0) { // delete root
        for(let property in object) {
            if(object.hasOwnProperty(property))
                delete object[property];
        }
    }
    else {
        const parentObjectPath = pathParts.slice(0, pathParts.length - 1);
        if(!objectHas(object, parentObjectPath))
            return undefined;

        delete objectGet(object, parentObjectPath)[pathParts[pathParts.length - 1]];
    }
}

function objectHas(object, objectPath) {
    const pathParts = pathPartsFromPath(objectPath);

    if(pathParts.length === 0)
        return true;
    else if(!(object instanceof Object) || !object.hasOwnProperty(pathParts[0]))
        return false;
    else
        return objectHas(object[pathParts[0]], pathParts.slice(1));
}

function objectGet(object, objectPath) {
    const pathParts = pathPartsFromPath(objectPath);

    if(pathParts.length === 0)
        return object;
    else if(!(object instanceof Object))
        return undefined;
    else
        return objectGet(object[pathParts[0]], pathParts.slice(1));
}

function objectSet(object, objectPath, value, options = {}) {
    const pathParts = pathPartsFromPath(objectPath);
    const objectKey = pathParts[0];
    if(pathParts.length === 1)
        object[objectKey] = value;
    else {
        if(typeof object[objectKey] !== 'object' || object[objectKey] === null) {
            console.log("OPT", options)
            object[objectKey] = (options.array && (typeof objectKey === "number" || (typeof objectKey === "string" && /^\d+$/.test(objectKey))))
                ? []
                : {};
        }

        objectSet(object[objectKey], pathParts.slice(1), value, options);
    }
    return object;
}

function objectSetImmutable(object, objectPath, value, options = {}) {
    const pathParts = pathPartsFromPath(objectPath);
    const objectKey = pathParts[0];
    if(pathParts.length === 0)
        return value;
    else {
        if(typeof object !== "object" || object === null) { // create it
            if((options.array && (typeof objectKey === "number" || (typeof objectKey === "string" && /^\d+$/.test(objectKey)))))
                object = [];
            else
                object = {};
        }

        if(Array.isArray(object)) {
            const arrayClone = [...object];
            if((options.array && (typeof objectKey === "number" || (typeof objectKey === "string" && /^\d+$/.test(objectKey)))))
                arrayClone[Number(objectKey)] = objectSetImmutable(object[objectKey], pathParts.slice(1), value, options);
            else
                arrayClone[objectKey] = objectSetImmutable(object[objectKey], pathParts.slice(1), value, options);

            return arrayClone;
        }
        else
            return {...object, ...{[objectKey]: objectSetImmutable(object[objectKey], pathParts.slice(1), value, options)}}
    }
}

function objectDeleteImmutable(object, objectPath) {
    if(!objectHas(object, objectPath)) // nothing to remove
        return object;

    const pathParts = pathPartsFromPath(objectPath);

    const parentObjectPath = pathParts.slice(0, -1);
    const removeProp = pathParts[pathParts.length - 1];
    const parentObject = objectGet(object, parentObjectPath);

    const parentObjectClone = {...parentObject};
    delete parentObjectClone[removeProp];
    return objectSetImmutable(object, parentObjectPath, parentObjectClone);
}

function flattenObjectProps(object, flattened = [], prefixParts = []) {
    if(!object instanceof Object)
        return flattened;

    for(let prop in object) {
        if(object.hasOwnProperty(prop)) {
            flattened.push(prefixParts.concat([prop]).join("."));
            if(typeof object[prop] === "object" && object[prop] !== null)
                flattenObjectProps(object[prop], flattened, prefixParts.concat([prop]));
        }
    }

    return flattened;
}

function flattenObject(object, flattened = {}, prefixPathParts = []) {
    if(!object instanceof Object)
        return flattened;

    for(let prop in object) {
        if(object.hasOwnProperty(prop)) {
            if(typeof object[prop] === "object" && object[prop] !== null)
                flattenObject(object[prop], flattened, prefixPathParts.concat([prop]));
            else
                flattened[prefixPathParts.concat([prop]).join(".")] = object[prop];
        }
    }

    return flattened;
}

function pathPartsFromPath(objectPathOrParts) {
    return Array.isArray(objectPathOrParts) ? objectPathOrParts : objectPathOrParts.split('.');
}

function pathFromPathParts(objectPathOrParts) {
    return Array.isArray(objectPathOrParts) ? objectPathOrParts.join('.') : objectPathOrParts;
}

export {
    objectFilterExclude,
    objectFilterInclude,
    objectClone,
    objectDiffs,
    indexArrayBy,
    objectDeepEqual,
    objectDelete,
    objectHas,
    objectGet,
    objectSet,
    objectSetImmutable,
    objectDeleteImmutable,
    flattenObject,
    flattenObjectProps,
    pathPartsFromPath,
    pathFromPathParts
}

