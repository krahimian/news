///////////////////
//require('longjohn');
///////////////////

/* global require, process */
var cluster = require('cluster');
var domain = require('domain');
var config = require('./config');
var Worker = require('./worker');
var log = require('log')(config.log);

log.info('process id', process.pid);

if (cluster.isMaster) {

    cluster.fork();

    cluster.on('disconnect', function(worker) {
	log.info('worker disconnect', worker);
	cluster.fork();
    });

    cluster.on('exit', function(worker, code, signal) {
	log.info('worker %d died, signal(%s).', worker.process.pid, signal, worker);
    });

} else {
    var d = domain.create();
    var worker;

    d.on('error', function(err) {
	if (err !== 'reset')
	    log.error(err, worker.queue);
	cluster.worker.disconnect();
    });

    d.run(function() {
	worker = new Worker();

	var knex = require('knex')({
	    client: 'mysql',
	    connection: config.db,
	    debug: true
	});
	
	worker.init({
	    db: knex,
	    log: log
	});
    });
}
