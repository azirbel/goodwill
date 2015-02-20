import Ember from 'ember';

export default Ember.Controller.extend({
  // Persisted between steps
  username: '',
  token: '',
  repositories: null,

  showIndex: false,

  // TODO(azirbel): Move this stuff
  // TODO(azirbel): Trigger this stuff on enter, button press, and focusOut
  usernameValid: false,
  usernameErrorText: '',
  verifyUsername: function() {
    var _this = this;
    var url = 'https://api.github.com/users/' + this.get('username');
    this.githubAjax(url).then(function() {
      _this.set('usernameValid', true);
      _this.set('usernameErrorText', '');
    }).catch(function() {
      _this.set('usernameValid', false);
      _this.set('usernameErrorText', 'User not found.');
    });
  },

  tokenValid: false,
  tokenErrorText: '',
  verifyToken: function() {
    if (!this.get('usernameValid')) {
      this.set('tokenValid', false);
      this.set('tokenErrorText', 'Username is invalid.');
      return;
    }
    var _this = this;
    var username = this.get('username');
    this.githubAjax('https://api.github.com/user').then(function(response) {
      // TODO(azirbel): Trim input fields in all such places
      if (response.login !== username) {
        _this.set('tokenValid', false);
        _this.set('tokenErrorText', 'That token is for a different user.');
        console.log('Error logging in: username does not match.');
        console.log('Expected: ' + username + ' but was: ' + response.login);
        return;
      }
      _this.set('tokenValid', true);
      _this.set('tokenErrorText', '');
    }).catch(function() {
      _this.set('tokenValid', false);
      _this.set('tokenErrorText', 'Authentication failed.');
    });
  }
});
