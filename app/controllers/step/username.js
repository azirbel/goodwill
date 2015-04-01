import Ember from 'ember';

export default Ember.Controller.extend({
  username: '',
  token: '',

  init: function() {
    this._super();
    this.set('username', localStorage.getItem('username') || '');
    this.set('token', localStorage.getItem('token') || '');
  },

  persistenceObserver: function() {
    localStorage.setItem('username', this.get('username'));
    localStorage.setItem('token', this.get('token'));
  }.observes('username', 'token'),

  // TODO(azirbel): Add usernameValid and tokenValid checks
  // TODO(azirbel): Add usernameErrorText and tokenErrorText
});
