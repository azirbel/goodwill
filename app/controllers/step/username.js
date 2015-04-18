import Ember from 'ember';

export default Ember.Controller.extend({
  username: '',
  token: '',

  init: function() {
    this._super();
    this.set('username', localStorage.getItem('githubUsername') || '');
    this.set('token', localStorage.getItem('githubToken') || '');
  },

  persistenceObserver: function() {
    localStorage.setItem('githubUsername', this.get('username'));
    localStorage.setItem('githubToken', this.get('token'));
  }.observes('username', 'token'),
});
