'use strict';

function get(object = {}, path, optionalDefault) {
    const sanePath = Array.isArray(path) ? path : path.split('.');
    const result = sanePath.reduce((context, key) => context && context[key], object);

    return typeof result === 'undefined' ? optionalDefault : result;
}

module.exports = get;
