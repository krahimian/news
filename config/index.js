/* global require, module */

var fs = require('fs')
var path = require('path')
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE

var homedir = function(s) {
  return path.resolve(path.dirname(home), s)
}

var config
var config_file = homedir('apps.json')
var deploy_file = '/home/deploy/apps.json'

if (fs.existsSync(config_file)) {

  config = JSON.parse(fs.readFileSync(config_file))

} else if (fs.existsSync(deploy_file)) {

  config = JSON.parse(fs.readFileSync(deploy_file))

  var db = config.servers.filter(function(s) {
    return s.roles.indexOf('db') > -1
  })[0]

  config.db.host = db.internal_ip

} else {

  config = {
    alchemy: [
      "xxxx",
      "xxxx"
    ],

    log: {
      level: 'debug'
    },

    db: {
      database: 'news_development',
      host: 'localhost',
      port: 3306,
      user: 'root',
      charset  : 'UTF8_GENERAL_CI'
    }
  }
}

if (!config) {
  throw new Error('Application config missing')
}

module.exports = config
