import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['application'],

  username: Ember.computed.alias('controllers.application.username'),
  token: Ember.computed.alias('controllers.application.token'),

  persistenceObserver: function() {
    Cookies.set('username', this.get('username'));
    Cookies.set('token', this.get('token'));
  }.observes('username', 'token'),

  // TODO(azirbel): Add usernameValid and tokenValid checks
  // TODO(azirbel): Add usernameErrorText and tokenErrorText
});
