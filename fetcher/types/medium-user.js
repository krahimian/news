/* global require, module */

var social = require('../../modules/social');
var async = require('async');
var URI = require('URIjs');
var cheerio = require('cheerio');

var request = require('../../modules/request');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?medium.com\/@[^/\s]+\/?$/i,

    init: function(opts) {
	return {

	    type: 'medium user',

	    getLogo: function(html) {
		var $;
		try {
		    $ = cheerio.load(html);
		} catch(e) {
		    opts.log.error(e);
		}
		if (!$) return null;

		var image = $('meta[property="og:image"]').attr('content');
		return image || null;
	    },

	    build: function(source, cb) {
		var self = this;

		request({
		    uri: source.url
		}, function (error, response, body) {

		    if (error) {
			cb(error);
			return;
		    }

		    source.data = {};
		    
		    try {
			var globals = JSON.parse(/var GLOBALS = ([\s\S]+)\/\/ \]\]/ig.exec(body)[1]);
			source.data = globals.embedded;
			source.title = source.data.user.name;
		    } catch(e) {
			opts.log.error(e);
		    }

		    source.logo_url = self.getLogo(body);

		    cb();
		});
	    },

	    getStats: function(id, cb) {
		request({
		    uri: 'https://medium.com/p/' + id + '/upvotes',
		    headers: {
			'accept': 'application/json'
		    }
		}, function(error, response, body) {
		    if (error) {
			cb(error);
			return;
		    }

		    var count = 1;

		    try {
			var data = body.substring(16);
			count = JSON.parse(data).payload.value.count;
		    } catch(e) {
			opts.log.error(e);
		    }

		    cb(null, count);
		});
	    },

	    buildPost: function(entry, cb) {
		var self = this;
		var url = new URI(this.url).segment(1, entry.uniqueSlug).toString();
		async.parallel({
		    social: function(next) {
			social.all(url, next);
		    },
		    medium: function(next) {
			self.getStats(entry.id, next);
		    }
		}, function(err, results) {
		    cb(err, {
			title: entry.title,
			content_url: null,
			score: results.medium || 1,
			social_score: results.social.total,
			url: url
		    });
		});
	    },

	    getPosts: function(source, cb) {
		source.posts = [];
		
		if (!source.data) {
		    cb('missing data');
		    return;
		}

		async.mapLimit(source.data.latestPosts, 2, this.buildPost.bind(this), function(err, results) {
		    source.posts = results;
		    cb(err);
		});
	    }
	};
    }
};
