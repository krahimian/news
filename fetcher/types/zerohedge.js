/* global require, module */

var social = require('../../modules/social');
var async = require('async');
var cheerio = require('cheerio');

var request = require('request').defaults({
    headers: {
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36'
    }
});

module.exports = {
    re: /^(https?:\/\/)?(www\.)?zerohedge.com\/?$/i,

    init: function(opts) {
	return {

	    type: 'zerohedge',

	    getLogo: function() {
		return 'http://www.zerohedge.com/sites/all/themes/newsflash/images/logo.png';
	    },

	    getTitle: function() {
		return 'Zero Hedge';
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

		    source.title = self.getTitle();
		    source.logo_url = self.getLogo();
		    source.html = body;

		    cb();
		}).on('error', function() {}).end();
	    },

	    buildPost: function(entry, cb) {
		social.all(entry.url,  function(err, result) {
		    entry.social_score = result.total;
		    cb(err);
		});
	    },

	    getPosts: function(source, cb) {
		source.posts = [];
		
		if (!source.html) {
		    cb('missing data');
		    return;
		}

		var $ = cheerio.load(source.html);

		var posts = $('.views-row .content-box-1').map(function() {
		    var a = $(this).find('.title a');
		    var comments = $(this).find('.links li a').text();
		    if (comments.charAt(0) === 'C') comments = comments.substring(9).replace(',', '');
		    comments = parseInt(comments, 10);
		    var reads = $(this).find('.links li:nth-child(2)').text();
		    if (reads.charAt(0) === 'R') reads = reads.substring(6).replace(',', '');
		    reads = parseInt(reads, 10);

		    return {
			title: a.text(),
			content_url: null,
			score: Math.round((comments || 0) + ((reads || 0) / 1000)),
			url: a.attr('href')
		    };
		}).get();

		source.posts = posts;

		async.eachLimit(source.posts, 2, this.buildPost.bind(this), function(err) {
		    cb(err);
		});
	    }
	};
    }
};