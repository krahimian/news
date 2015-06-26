/* global require, process */

var os = require('os');
var uuid = require('uuid');
var async = require('async');
var Fetcher = require('./fetcher');

var Worker = function() {
    return {
	name: [os.hostname(), uuid.v4(), process.pid].join(':'),

	init: function(options) {
	    this.db = options.db;
	    this.log = options.log;

	    this.queue = async.queue(this._run.bind(this), 10);
	    this.queue.drain = this._check.bind(this);

	    this.log.debug('worker:', this.name);

	    this._check();
	},

	_start: function(source, cb) {
	    this.db('sources').update({
		update_agent: this.name,
		update_started_at: new Date()
	    }).where('id', source.id).asCallback(cb);
	},

	_save: function(source, cb) {
	    console.log(source);
	    var self = this;
	    var update = {
		update_agent: null,
		update_started_at: null,
		title: source.title,
		updated_at: new Date()
	    };

	    if (!source.created_at) update.created_at = new Date();
	    if (source.etag) update.etag = source.etag;
	    if (source.last_modified) update.last_modified = source.last_modified;

	    if (source.posts) {
		source.posts.forEach(function(post) {
		    post.source_id = source.id;
		    post.created_at = new Date();
		    post.updated_at = new Date();
		});
	    }

	    async.series([
		function(next) {
		    self.db('sources').update(update).where('id', source.id).asCallback(next);
		},
		function(next) {
		    self.db('posts').insert(source.posts).asCallback(next);
		}
	    ], cb);
	},

	_run: function(source, done) {
	    this.log.debug('queue length', this.queue.length());
	    var fetcher = Fetcher(source.url);
	    console.log(fetcher);
	    async.applyEachSeries([this._start.bind(this), fetcher.build.bind(fetcher), fetcher.getPosts.bind(fetcher), this._save.bind(this)], source, done);
	},

	_check: function() {
	    // get sources that have not been updated in 30 mins
	    // or updating started more than 10 minutes ago
	    var self = this;
	    self.log.debug('checking...');
	    var now = new Date();

	    this.db('sources').select().where(function() {
		this.where('update_agent', null);
		this.where('update_started_at', null);
		this.where('updated_at', '<', new Date(now.setTime(now.getTime() - 1800000)));
	    }).orWhere(function() {
		this.where('update_started_at', '<', new Date(now.setTime(now.getTime() - 600000)));
	    }).orWhere(function() {
		this.whereNull('created_at');
	    }).orderByRaw('RAND()').then(function(sources) {
		self.log.debug('found...', sources.length);

		if (sources.length) {
		    self.queue.push(sources, function(err) {
			if (err) self.log.error(err);
		    });
		} else if (!self.queue.length()) {
		    setTimeout(function() {
			self._check();
		    }, 10000);
		}
	    }).catch(function(err) {
		self.log.error(err);
		setTimeout(function() {
		    self._check();
		}, 10000);
	    });
	}
    };
};

module.exports = Worker;
