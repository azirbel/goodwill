import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['application'],

  username: Ember.computed.alias('controllers.application.username'),
  token: Ember.computed.alias('controllers.application.token'),

  persistenceObserver: function() {
    localStorage.setItem('reciprocityUsername', this.get('username'));
    localStorage.setItem('reciprocityToken', this.get('token'));
    console.log('localstorage set.');
  }.observes('username', 'token'),

  // TODO(azirbel): Add usernameValid and tokenValid checks
  // TODO(azirbel): Add usernameErrorText and tokenErrorText
});
