'use strict';

const get = require('./get');
const isInsideDocker = require('./is-inside-docker');

const DEFAULT_SOCKET_PATH = '/var/run/docker.sock';

function getPostgresOpts(pgOpts) {
    return Object.assign({
        host: 'localhost',
        username: 'postgres',
        password: 'postgres',
        database: 'postgres',
        port: '5432',
        logging: false
    }, pgOpts);
}

function getDockerOpts(dockerOpts = {}) {
    const dockerConnectionKey = Object.keys(dockerOpts).some(function (key) {
        return ['socketPath', 'host'].indexOf(key) !== -1;
    });

    return Object.assign({
        // Neither socketPath nor host option given in dockerOpts.
        // Default to the docker default configuration.
        socketPath: dockerConnectionKey ? null : DEFAULT_SOCKET_PATH,
        image: 'postgres',
        exposedPorts: {
            '5432/tcp': {}
        },
        config: {
            PublishAllPorts: true
        }
    }, dockerOpts);
}

function defautGrepContainerData(dockerOpts, containerData) {
    const exposedPort = Object.keys(dockerOpts.exposedPorts || {}).shift();

    return {
        ip: get(containerData, `NetworkSettings.Ports.${exposedPort}.0.HostIp`),
        port: get(containerData, `NetworkSettings.Ports.${exposedPort}.0.HostPort`)
    };
}

function insideDockerGrepContainerData(dockerOpts, containerData) {
    return Object.assign(
        {},
        defautGrepContainerData(dockerOpts, containerData),
        {
            ip: containerData.NetworkSettings.Gateway
        }
    );
}

function getGrepContainerDataCallback(rootDirectory, callback = null) {
    const nativeGrepContainerData = isInsideDocker(rootDirectory) 
        ? insideDockerGrepContainerData
        : defautGrepContainerData;

    if (callback === null) {
        return nativeGrepContainerData;
    }

    return (dockerOpts, containerData) => {
        return Object.assign(
            {},
            nativeGrepContainerData(dockerOpts, containerData),
            callback(dockerOpts, containerData)
        );
    };
}

module.exports = {
    getPostgresOpts,
    getDockerOpts,
    getGrepContainerDataCallback
};
