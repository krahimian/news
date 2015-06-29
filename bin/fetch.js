var Fetcher = require('../fetcher');
var async = require('async');

var source = {
    url: process.argv[2]
};

var fetcher = Fetcher(source.url);

async.applyEachSeries([
    fetcher.build.bind(fetcher),
    fetcher.getPosts.bind(fetcher)
], source, function(err) {
    if (err) console.log(err);
    console.log(source);

    process.exit();
});
