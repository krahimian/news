/* global require, process, setTimeout, module */

var os = require('os');
var uuid = require('uuid');
var async = require('async');
var Fetcher = require('fetcher');
var cluster = require('cluster');
var moment = require('moment');
var config = require('./config');
var watson = require('watson-developer-cloud');
var alchemy_language = watson.alchemy_language({
    api_key: config.alchemy
});


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

	_saveSource: function(source, cb) {

	    var update = {};

	    if (source.fetch_failed) {

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
		post.published_at = new Date();
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
		], source, function(err) {
		    if (err) source.fetch_failed = true;

		    self._saveSource(source, function() {
			self._analyzePosts(done);
		    });

		});
	    }, 15000);
	},

	_analyzePost: function(post, done) {
	    var self = this;
	    var saveKeyword = function(k, next) {
		async.waterfall([
		    function(cb) {
			self.db.select('*').from('keywords').where('text', k.text).asCallback(cb);
		    },
		    function(result, cb) {
			if (result.length) {
			    cb(null, result);
			    return;
			}

			self.db('keywords').insert({
			    text: k.text
			}).asCallback(function(err) {
			    if (err) {
				cb(err);
				return;
			    }

			    self.db.select('*').from('keywords').where('text', k.text).asCallback(cb);
			});
		    }
		], function(err, result) {
		    if (err) {
			next(err);
			return;
		    }

		    self.db('keywords_posts').insert({
			post_id: post.id,
			keyword_id: result[0].id,
			relevance: k.relevance
		    }).asCallback(function(err) {
			next();
		    });
		});
	    };
	    var saveEntity = function(e, next) {
		async.waterfall([
		    function(cb) {
			self.db.select('*').from('entities').where('text', e.text).asCallback(cb);
		    },
		    function(result, cb) {
			if (result.length) {
			    cb(null, result);
			    return;
			}

			self.db('entities').insert({
			    text: e.text,
			    type: e.type,
			    geo: e.disambiguated ? e.disambiguated.geo : '',
			    website: e.disambiguated ? e.disambiguated.website : '',
			    dbpedia: e.disambiguated ? e.disambiguated.dbpedia : '',
			    freebase: e.disambiguated ? e.disambiguated.freebase : '',
			    opencyc: e.disambiguated ? e.disambiguated.opencyc : '',
			    yago: e.disambiguated ? e.disambiguated.yago : '',
			    crunchbase: e.disambiguated ? e.disambiguated.crunchbase : '',
			    musicbrainz: e.disambiguated ? e.disambiguated.musicbrainz : '',
			    geonames: e.disambiguated ? e.disambiguated.geonames : '',
			    census: e.disambiguated ? e.disambiguated.census : '',
			    ciaFactbook: e.disambiguated ? e.disambiguated.ciaFactbook : ''
			}).asCallback(function(err) {
			    if (err) {
				cb(err);
				return;
			    }
			    self.db.select('*').from('entities').where('text', e.text).asCallback(cb);
			});
		    }
		], function(err, result) {
		    if (err) {
			next(err);
			return;
		    }
		    self.db('entities_posts').insert({
			post_id: post.id,
			entity_id: result[0].id,
			relevance: e.relevance
		    }).asCallback(function(err) {
			next();
		    });
		});
	    };

	    var saveConcept = function(c, next) {
		async.waterfall([
		    function(cb) {
			self.db.select('*').from('concepts').where('text', c.text).asCallback(cb);
		    },
		    function(result, cb) {
			if (result.length) {
			    cb(null, result);
			    return;
			}

			self.db('concepts').insert({
			    text: c.text,
			    geo: c.geo,
			    website: c.website,
			    dbpedia: c.dbpedia,
			    freebase: c.freebase,
			    opencyc: c.opencyc,
			    yago: c.yago,
			    crunchbase: c.crunchbase,
			    musicbrainz: c.musicbrainz,
			    geonames: c.geonames,
			    census: c.census,
			    ciaFactbook: c.ciaFactbook
			}).asCallback(function(err) {
			    if (err) {
				cb(err);
				return;
			    }
			    self.db.select('*').from('concepts').where('text', c.text).asCallback(cb);
			});
		    }
		], function(err, result) {
		    if (err) {
			next(err);
			return;
		    }
		    self.db('concepts_posts').insert({
			post_id: post.id,
			concept_id: result[0].id,
			relevance: c.relevance
		    }).asCallback(function(err) {
			next();
		    });
		});
	    };

	    var params = {
		url: post.content_url || post.url
		, extract: (
		    'concepts'
		    //+ ', dates'
			+ ', doc-emotion'
			+ ', entities'
		    //+ ', feeds'
		    + ', keywords'
		    //+ ', relations'
		    //+ ', typed-rels'
			+ ', doc-sentiment'
		    //+ ', taxonomy'
		    //+ ', title'
		)
		//, showSourceText: 1
	    };

	    alchemy_language.combined(params, function (err, response) {
		if (err) {
		    var excluded_errors = [
			'page-is-not-html',
			'content-is-empty',
			'cannot-retrieve',
			'daily-transaction-limit-exceeded',
			'unsupported-text-language'
		    ];
		    var error = err.error;
		    if (error.indexOf(':') !== -1)
			error = error.susbtr(0, err.error.indexOf(':'));
		    
		    if (excluded_errors.indexOf(error) === -1)
			self.log.error(err);

		    done();
		    return;
		}

		self.log.debug(JSON.stringify(response, null, 2));

		var output = {};
		output.sentiment = response.docSentiment.score;
		output.analyzed_at = new Date();

		if (response.docEmotions) {
		    Object.keys(response.docEmotions).forEach(function(d, i) {
			output[d] = response.docEmotions[d];
		    });
		}

		async.parallel([
		    function(cb) {
			async.eachSeries(response.entities, saveEntity, cb);
		    },
		    function(cb) {
			async.eachSeries(response.concepts, saveConcept, cb);
		    },
		    function(cb) {
			async.eachSeries(response.keywords, saveKeyword, cb);
		    }
		], function(err) {
		    if (err) {
			done(err);
			return;
		    }

		    self.db('posts').update(output).where('id', post.id).asCallback(done);
		});
	    });
	},

	_analyzePosts: function(cb) {
	    var self = this;

	    var q = self.db('posts').select('posts.*');
	    q.select(self.db.raw('(LOG10(posts.score / sources.score_avg) - TIMESTAMPDIFF(SECOND, posts.created_at, NOW()) / 90000) as strength'));
	    q.join('sources', 'sources.id', 'posts.source_id');
	    q.join('channels_sources', 'channels_sources.source_id', 'sources.id');
	    q.where('channels_sources.channel_id', 1);
	    q.whereNull('posts.analyzed_at');
	    q.whereRaw('posts.created_at > (NOW() - INTERVAL 6 HOUR)');
	    q.orderBy('strength', 'desc');
	    q.limit(10);

	    q.asCallback(function(err, posts) {
		if (err) {
		    cb(err);
		    return;
		}

		async.eachSeries(posts, self._analyzePost.bind(self), cb);
	    });
	},

	_check: function() {
	    // get sources that have not been updated in 30 mins
	    // or updating started more than 10 minutes ago
	    var self = this;
	    self.log.debug('checking...');
	    var now = new Date();

	    clearTimeout(self._checkTimeout);
	    self._checkTimeout = setTimeout(function() {
		cluster.worker.disconnect();
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
