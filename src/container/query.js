'use strict';

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

module.exports = query;
