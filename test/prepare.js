'use strict';

const prepare = require('mocha-prepare-promise');
const PostgresContainer = require('../src/container');
const postgresContainer = new PostgresContainer({
    pg: {
        username: 'postgres',
        password: 'postgres'
    }
});

postgresContainer.on('inspect', (containerData) => {
    console.info(`Started docker image at ${containerData.ip}:${containerData.port}`);
});

postgresContainer.on('connect', (address, tryCounter) => {
    console.info(`Tries to connect to ${address} (${tryCounter})`);
});

function exit(context) {
    const isError = context instanceof Error;

    if (isError) {
        console.error(context.message);
        console.error(context.stack);
    }

    console.info('Shutting down...');

    return postgresContainer.shutdown()
        .then(() => {
            if (isError) {
                process.exit(1);
            }
        }).catch((error) => {
            console.log(error.message);
        });
}

prepare(() => (
    postgresContainer.start()
        .then(() => {
            process.env.POSTGRES_CONNECTION_STRING = postgresContainer.getConnectionString();
        })
        .catch(exit)
), exit);
