/* global require, module */

var social = require('../../modules/social');
var async = require('async');
var URI = require('URIjs');
var cheerio = require('cheerio');

var request = require('request').defaults({
    headers: {
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36'
    }
});

module.exports = {
    re: /^(https?:\/\/)?(www\.)?medium.com\/[^@][^/\s]+\/?$/i,

    init: function(opts) {
	return {

	    type: 'medium collection',

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
		    method: 'GET',
		    uri: source.url,
		    gzip: true
		}, function (error, response, body) {

		    if (error) {
			cb(error);
			return;
		    }

		    source.data = {};
		    
		    try {
			var globals = JSON.parse(/var GLOBALS = ([\s\S]+)\/\/ \]\]/ig.exec(body)[1]);
			source.data = globals.embedded;
			source.title = source.data.collection.name;
		    } catch(e) {
			opts.log.error(e);
		    }

		    source.logo_url = self.getLogo(body);

		    cb();
		}).on('error', function(err) {
		    opts.log.error(err);
		});
	    },

	    getStats: function(id, cb) {
		request({
		    method: 'GET',
		    uri: 'https://medium.com/p/' + id + '/upvotes',
		    gzip: true,
		    headers: {
			'accept': 'application/json'
		    }
		}, function(error, response, body) {
		    if (error) {
			cb(error);
			return;
		    }

		    var count = 1;
		    var data;
		    try {
			data = body.substring(16);
			count = JSON.parse(data).payload.value.count;
		    } catch(e) {
			opts.log.error(e, {
			    id: id,
			    data: data
			});
		    }

		    cb(null, count);
		}).on('error', function(err) {
		    opts.log.error(err);
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

		var posts = [];

		for (k in source.data.references.Post)
		    posts.push(source.data.references.Post[k]);

		async.mapLimit(posts, 2, this.buildPost.bind(this), function(err, results) {
		    source.posts = results;
		    cb(err);
		});
	    }
	};
    }
};
