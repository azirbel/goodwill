import Ember from 'ember';
import config from './config/environment';

var Router = Ember.Router.extend({
  location: config.locationType
});

Router.map(function() {
  this.route('faq');
  this.resource('step', function() {
    this.route('username');
    this.route('repositories');
    this.route('results');
  });
});

export default Router;
