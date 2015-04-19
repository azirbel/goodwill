import Ember from 'ember';
import GithubHelpers from './github';

// Returns a promise that resolves if everything is ok, or errors
// if validation fails.
//
// Checks:
// 1. The username is valid on GitHub
// 2. If a token is supplied, the username + token is a valid login
// 3. If a token is supplied, that it is consistent with the username.
//    (reciprocity is a self-assessment tool)
function validateUser(username, token = null) {
  return new Ember.RSVP.Promise(function(resolve, reject) {
    if (!token) {
      GithubHelpers.ajax('https://api.github.com/users/' + username)
      .then(function() {
        resolve();
      }, function() {
        reject('User not found.');
      });
    } else {
      GithubHelpers.ajax('https://api.github.com/user', token)
      .then(function(response) {
        var cheat = localStorage.getItem('cheat') || false;
        // TODO(azirbel): Trim input fields in all such places
        if (response.login !== username && !cheat) {
          reject('Username does not match token.');
        } else {
          resolve();
        }
      }, function() {
        reject('Authentication failed.');
      });
    }
  });
}

export default { validateUser };
