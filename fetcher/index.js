/* global require, module, path */

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

var request = require('request');
var fs = require('fs');
var path = require('path');
var HTMLParser = require('fast-html-parser');

var fetchers = [];

var defaultFetcher = {

    type: 'default',

    getTitle: function(html) {
	var root = HTMLParser.parse(html);
	return root.querySelector('title').rawText;
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
    }
};

fs.readdirSync(path.join(__dirname, 'types')).forEach(function(file) {
    fetchers.push(require('./types/' + file));
});

var Fetcher = function(url) {
    var fetcher = fetchers.find(function(element) {
	return element.re.test(url);
    });

    if (!fetcher) fetcher = defaultFetcher;
    fetcher.url = url;

    return fetcher;
};

module.exports = Fetcher;
