/* global require, module, __dirname */

if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
	if (this == null) {
	    throw new TypeError('Array.prototype.find called on null or undefined');
	}
	if (typeof predicate !== 'function') {
	    throw new TypeError('predicate must be a function');
	}
	var list = Object(this);
	var length = list.length >>> 0;
	var thisArg = arguments[1];
	var value;

	for (var i = 0; i < length; i++) {
	    value = list[i];
	    if (predicate.call(thisArg, value, i, list)) {
		return value;
	    }
	}
	return undefined;
    };
}

var FeedParser = require('feedparser');
var fs = require('fs');
var async = require('async');
var URI = require('URIjs');
var path = require('path');
var social = require('../modules/social');
var cheerio = require('cheerio');
var request = require('request').defaults({
    headers: {
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.130 Safari/537.36'
    }
});

var fetchers = [];

var defaultFetcher = function(opts) {
    return {

	type: 'default',

	getTitle: function(html) {
	    var $;
	    try {
		$ = cheerio.load(html);
	    } catch(e) {
		opts.log.error(e);
	    }
	    if (!$) return null;

	    var ogTitle = $('meta[property="og:title"]').attr('content');
	    if (ogTitle) return ogTitle;

	    var title = $('title');
	    return title.text() || null;
	},

	discoverFeed: function(html, url) {
	    var $;
	    try {
		$ = cheerio.load(html);
	    } catch(e) {
		opts.log.error(e);
	    }
	    if (!$) return null;

	    var feedUrl = $('link[rel="alternate"][type*="rss"]').attr('href');
	    if (feedUrl && feedUrl.charAt(0) === '/')
		return new URI(feedUrl).absoluteTo(url).toString();
	    else
		return feedUrl || null;
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

		var re = /^(\s)?<\?xml version=("|')1\./i;

		var isXML = re.test(body);
		source.feed = isXML ? source.url : self.discoverFeed(body, source.url);
		source.title = self.getTitle(body);

		cb();

	    }).on('error', function() {}).end();
	},

	buildPost: function(entry, cb) {
	    social.all(entry.link, function(err, result) {
		cb(err, {
		    title: entry.title,
		    content_url: null,
		    score: entry.comments,
		    social_score: result.total,
		    url: entry.link
		});
	    });
	},

	getPosts: function(source, cb) {

	    if (!source.feed) {
		source.posts = [];
		cb();
		return;
	    }

	    var self = this;
	    var req = request(source.feed);
	    var feedparser = new FeedParser();

	    source.posts = [];
	    var items = [];

	    req.on('error', cb);

	    req.on('response', function (res) {
		var stream = this;

		if (res.statusCode !== 200) {
		    this.emit('error', new Error('Bad status code'));
		    return;
		}

		stream.pipe(feedparser);
	    });


	    feedparser.on('error', cb);

	    feedparser.on('end', function() {
		async.mapLimit(items, 3, self.buildPost.bind(self), function(err, results) {
		    source.posts = results;
		    cb(err);
		});
	    });

	    feedparser.on('readable', function() {
		items.push(this.read());
	    });
	}
    };
};

fs.readdirSync(path.join(__dirname, 'types')).forEach(function(file) {
    fetchers.push(require('./types/' + file));
});

var Fetcher = function(url, options) {
    var fetcher = fetchers.find(function(element) {
	return element.re.test(url);
    });

    if (!fetcher) fetcher = defaultFetcher(options);
    else fetcher = fetcher.init(options);

    fetcher.url = url;

    return fetcher;
};

module.exports = Fetcher;
