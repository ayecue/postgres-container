'use strict';

const Docker = require('dockerode');
const {EventEmitter} = require('events');
const {
    getPostgresOpts,
    getDockerOpts,
    getGrepContainerDataCallback
} = require('./container/option-processing');
const query = require('./container/query');

const DEFAULT_ROOT = process.env.NODE_PATH || require.main.filename || process.cwd();
const DEFAULT_QUERY = 'SELECT now() AS now';

class PostgresContainer extends EventEmitter {
    constructor(opts = {}) {
        super();

        this.dockerOpts = getDockerOpts(opts.docker);
        this.pg = getPostgresOpts(opts.pg);
        this.containerDidStart = false;
        this.containerDidCreate = false;
        this.container = null;
        this.ready = false;
        this.containerData = null;
        this.rootDirectory = opts.rootDirectory || DEFAULT_ROOT;
        this.grepContainerData = getGrepContainerDataCallback(this.rootDirectory, opts.grepContainerData);
        this.retryDelay = opts.retryDelay || 1000;
        this.retryLimit = opts.retryLimit || 50;
    }

    getContainerIp() {
        return this.containerData.ip;
    }

    getContainerPort() {
        return this.containerData.port;
    }

    getConnectionString() {
        const {username, password} = this.pg;
        const {ip, port} = this.containerData;
        
        return `postgres://${username}:${password}@${ip}:${port}/postgres`;
    }

    handleError(err) {
        this.emit('error', err);
        this.shutdown();
    }

    isRunning() {
        return this.ready;
    }

    stop() {
        if (this.containerDidStart) {
            return this.container.stop().then(() => {
                this.containerDidStart = false;
            });
        }

        return Promise.resolve();
    }

    remove() {
        if (this.containerDidCreate) {
            return this.container.remove().then(() => {
                this.containerDidCreate = false;
            });
        }

        return Promise.resolve();
    }

    shutdown() {
        this.ready = false;

        return this.stop()
            .then(() => this.remove())
            .then(() => {
                this.containerDidCreate = false;
                this.emit('terminated');
            });
    }

    start() {
        const docker = new Docker(this.dockerOpts);

        return docker.createContainer({
            Image: this.dockerOpts.image,
            Env: [
                `POSTGRES_USER=${this.pg.username}`,
                `POSTGRES_PASSWORD=${this.pg.password}`
            ],
            ExposedPorts: this.dockerOpts.exposedPorts,
            HostConfig: this.dockerOpts.config
        })
            .then((containerReference) => {
                this.containerDidCreate = true;
                this.container = containerReference;
                this.emit('created', this.container);

                return containerReference.start();
            })
            .then(() => {
                this.containerDidStart = true;
                this.emit('started', this.container);

                this.container.inspect((error, containerData) => {
                    if (error) {
                        throw error;
                    }

                    this.containerData = this.grepContainerData(this.dockerOpts, containerData);

                    this.emit('inspect', this.containerData);
                });

                return this.waitForConnection();
            })
            .catch(this.handleError.bind(this));
    }

    waitForConnection() {
        let tryCounter = 0;
        const tryToConnect = () => {
            const address = this.getConnectionString();

            tryCounter += 1;

            this.emit('connect', address, tryCounter);

            return query(address, DEFAULT_QUERY);
        };

        return new Promise((resolve, reject) => {
            const tryInterval = setInterval(() => {
                tryToConnect()
                    .then(() => {
                        this.ready = true;
                        this.emit('ready', this.container);
                        clearInterval(tryInterval);
                        resolve();
                    })
                    .catch((exception) => {
                        if (this.retryLimit <= tryCounter) {
                            clearInterval(tryInterval);
                            reject(new Error(`Connection failed: ${exception.message}`));
                        }
                    });
            }, this.retryDelay);
        }).catch((exception) => {
            throw exception;
        });
    }
}

module.exports = PostgresContainer;
