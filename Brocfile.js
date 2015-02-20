/* global require, module */

var EmberApp = require('ember-cli/lib/broccoli/ember-app');

var app = new EmberApp();

app.import(app.bowerDirectory + '/cookies-js/dist/cookies.js');

module.exports = app.toTree();
