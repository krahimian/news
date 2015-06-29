var request = require('request');
var social = require('../../modules/social');
var async = require('async');
var URI = require('URIjs');
var HTMLParser = require('fast-html-parser');

module.exports = {
    re: /^(https?:\/\/)?(www\.)?reddit.com\/r\/[^/\s]+\/?$/i,

    init: function() {
	return {

	    type: 'reddit',

	    getTitle: function(html) {
		var root = HTMLParser.parse(html);

		var ogTitle = root.querySelector('meta[property="og:title"]');
		if (ogTitle) return ogTitle;

		var title = root.querySelector('title');
		if (title) return title.rawText;

		return '';
	    },

	    build: function(source, cb) {
		var self = this;

		request({
		    method: 'GET',
		    uri: source.url,
		    gzip: true
		}, function (error, response, body) {

		    source.title = self.getTitle(body);

		    cb(error);

		});
	    },

	    buildPost: function(entry, cb) {
		var self = this;
		social.all(entry.data.url,  function(err, result) {
		    cb(err, {
			title: entry.data.title,
			content_url: entry.data.url,
			score: entry.data.score,
			social_score: result.total,
			url: new URI(entry.data.permalink).absoluteTo(self.url).toString()
		    });
		});
	    },

	    getPosts: function(source, cb) {
		var self = this;
		var options = {
		    method: 'GET',
		    uri: source.url + '.json',
		    headers: {},
		    gzip: true,
		    json: true
		};

		if (source.etag) options.headers['If-None-Match'] = source.etag;
		if (source.last_modified) options.headers['If-Modified-Since'] = source.last_modified;

		request(options, function (error, response, body) {

		    if (error) {
			source.posts = [];
			cb(error);
			return;
		    }

		    if (response.headers['etag']) source.etag = response.headers['etag'];
		    if (response.headers['last-modified']) source.last_modified = response.headers['last-modified'];

		    async.mapLimit(body.data.children, 3, self.buildPost.bind(self), function(err, results) {
			source.posts = results;
			cb(err);
		    });
		});
	    }
	};
    }
};
