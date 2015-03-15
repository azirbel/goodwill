/* global require, module */

var EmberApp = require('ember-cli/lib/broccoli/ember-app');

var app = new EmberApp();

// Ember Charts dependencies
app.import(app.bowerDirectory + '/d3/d3.js');
app.import(app.bowerDirectory + '/jquery-ui/jquery-ui.js');

// Ember Charts
app.import(app.bowerDirectory + '/ember-charts/dist/ember-charts.js');
app.import(app.bowerDirectory + '/ember-charts/dist/ember-charts.css');

module.exports = app.toTree();
