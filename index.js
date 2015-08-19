///////////////////
require('longjohn');
///////////////////

/* global require, process */

var config = require('./config');
var log = require('log')(config.log);
var Worker = require('./worker');
var worker = new Worker();

var knex = require('knex')({
    client: 'mysql',
    connection: config.db,
    debug: true
});

log.info('process id', process.pid);

worker.init({
    db: knex,
    log: log
});
