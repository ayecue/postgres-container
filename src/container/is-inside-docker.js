'use strict';

const fs = require('fs');
const path = require('path');

const DOCKER_ENV_FILE = '.dockerenv';

function isInsideDocker(directory) {
    const current = path.resolve(directory, DOCKER_ENV_FILE);
    const exists = fs.existsSync(current);
    const next = path.resolve(directory, '..');

    if (exists) {
        return true;
    } else if (!exists && current === `/${DOCKER_ENV_FILE}`) {
        return false;
    }

    return isInsideDocker(next);
}

module.exports = isInsideDocker;
