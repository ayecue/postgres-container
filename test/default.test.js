'use strict';

const assert = require('referee').assert;
const {Client} = require('pg');

function query(connectionString, sql) {
    return new Promise((resolve, reject) => {
        const client = new Client({
            connectionString
        });

        client.connect(function(connectionError) {
            if (connectionError) {
                client.end();
                return reject(connectionError);
            }

            client.query(sql, (queryError) => {
                if (queryError) {
                    client.end();
                    return reject(queryError);
                }

                client.end();
                resolve();
            });
        });
    });
}

describe('Postgres container', function () {
    it('Should try to execute query in postgres', function () {
        return query(process.env.POSTGRES_CONNECTION_STRING, 'SELECT now() AS now').then(() => {
            assert.equals(true, true);
        });
    });
});
