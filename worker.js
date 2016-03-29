/* global require, process, setTimeout, module */

var os = require('os');
var uuid = require('uuid');
var async = require('async');
var request = require('request');
var Fetcher = require('fetcher');

var UPDATE_TIME = 1000 * 60 * 15; //15 minutes
var FAILED_TIME = 1000 * 60 * 5; // 5 minutes

var Worker = function() {
    return {
	name: [os.hostname(), uuid.v4(), process.pid].join(':'),

	init: function(options) {
	    this.db = options.db;
	    this.log = options.log;

	    this.queue = async.queue(this._run.bind(this), 1);
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

	_saveSource: function(source, cb, err) {

	    var update = {};

	    if (err || source.fetch_failed) {
		if (err) this.log.error(err, source);

		update.fetch_failures = source.fetch_failures || 0;
		update.fetch_failures++;

	    } else {

		update.update_agent = null;
		update.update_started_at = null;
		update.updated_at = new Date();

		if (!source.created_at) update.created_at = new Date();
		if (source.etag) update.etag = source.etag;
		if (source.title) update.title = source.title;
		if (source.last_modified) update.last_modified = source.last_modified;
		if (source.logo_url) update.logo_url = source.logo_url;
	    }

	    this.db('sources').update(update).where('id', source.id).asCallback(cb);
	},

	_savePosts: function(source, cb) {

	    if (!source.posts || !source.posts.length) {
		cb();
		return;
	    }

	    source.posts.forEach(function(post) {
		post.source_id = source.id;
		post.created_at = new Date();
		post.updated_at = new Date();
	    });

	    var sql = this.db('posts').insert(source.posts).toString();
	    sql = sql + ' ON DUPLICATE KEY UPDATE score = VALUES(score), social_score = VALUES(social_score), updated_at = VALUES(updated_at)';
	    this.db.raw(sql).asCallback(cb);
	},

	_updateScore: function(source, cb) {
	    if (!source.id) {
		cb();
		return;
	    }

	    var self = this;
	    var query = self.db('posts');
	    query.select(self.db.raw('avg(score) as score_avg'));
	    query.where('source_id', source.id);
	    query.whereRaw('created_at >= DATE_ADD(UTC_TIMESTAMP(), INTERVAL -14 DAY)');
	    query.then(function(result) {
		self.db('sources').update(result[0]).where('id', source.id).asCallback(cb);
	    }).catch(function(error) {
		cb(error);
	    });
	},

	_updateSocialScore: function(source, cb) {
	    if (!source.id) {
		cb();
		return;
	    }

	    var self = this;
	    var query = self.db('posts');
	    query.select(self.db.raw('avg(social_score) as social_score_avg'));
	    query.where('source_id', source.id);
	    query.whereRaw('created_at >= DATE_ADD(UTC_TIMESTAMP(), INTERVAL -14 DAY)');
	    query.then(function(result) {
		self.db('sources').update(result[0]).where('id', source.id).asCallback(cb);
	    }).catch(function(error) {
		cb(error);
	    });
	},

	_run: function(source, done) {
	    var self = this;

	    self.log.debug('queue length', self.queue.length());
	    var fetcher = new Fetcher(source.feed_url, {
		log: self.log
	    });

	    setTimeout(function() {
		async.applyEachSeries([
		    self._start.bind(self),
		    fetcher.build.bind(fetcher),
		    fetcher.getPosts.bind(fetcher),
		    self._savePosts.bind(self),
		    self._updateScore.bind(self),
		    self._updateSocialScore.bind(self)
		], source, self._saveSource.bind(self, source, done));
	    }, 15000);
	},

	_check: function() {
	    // get sources that have not been updated in 30 mins
	    // or updating started more than 10 minutes ago
	    var self = this;
	    self.log.debug('checking...');
	    var now = new Date();

	    clearTimeout(self._checkTimeout);
	    self._checkTimeout = setTimeout(function() {
		throw new Error('Worker has not performed a check in 60 mins');
	    }, 3600000);

	    var q = this.db('sources').select();

	    q.innerJoin('channels_sources', 'channels_sources.source_id', 'sources.id');

	    q.where(function() {
		this.where('update_agent', null);
		this.where('update_started_at', null);
		this.where('updated_at', '<', new Date(now.setTime(now.getTime() - UPDATE_TIME)));
	    }).orWhere(function() {
		this.where('update_started_at', '<', new Date(now.setTime(now.getTime() - FAILED_TIME)));
	    }).orWhere(function() {
		this.whereNull('created_at');
	    }).orderByRaw('RAND()').then(function(sources) {
		self.log.debug('found...', sources.length);

		if (sources.length) {
		    self.queue.push(sources);
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
