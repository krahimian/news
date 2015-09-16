///////////////////
//require('longjohn');
///////////////////

/* global require, process */
var cluster = require('cluster');
var domain = require('domain');
var config = require('./config');
var log = require('log')(config.log);

log.info('process id', process.pid);

if (cluster.isMaster) {

    cluster.fork();

    cluster.on('disconnect', function(worker) {
	log.info('worker disconnect', worker);
	cluster.fork();
    });

    cluster.on('exit', function(worker, code, signal) {
	log.info('worker %d died, code (%c), signal(%s).', worker.process.pid, code, signal, worker);
    });

} else {
    var d = domain.create();

    d.on('error', function(err) {
	log.error(err);
	cluster.worker.disconnect();
    });

    d.run(function() {
	var Worker = require('./worker');
	var worker = new Worker();

	var knex = require('knex')({
	    client: 'mysql',
	    connection: config.db,
	    debug: false
	});
	
	worker.init({
	    db: knex,
	    log: log
	});
    });
}
