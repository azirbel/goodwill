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
  console.log('validating.');
  return new Promise(function(resolve, reject) {
    if (!token) {
      console.log('no token.');
      GithubHelpers.ajax('https://api.github.com/users/' + username)
      .then(function() {
        console.log('valid!');
        resolve();
      }, function() {
        console.log('invalid!');
        reject('User not found.');
      });
    } else {
      console.log('token.');
      GithubHelpers.ajax('https://api.github.com/user', token)
      .then(function(response) {
        // TODO(azirbel): Trim input fields in all such places
        if (response.login !== username) {
          console.log('invalid! wrong user');
          reject('Username does not match token.');
        } else {
          console.log('valid!');
          resolve();
        }
      }, function() {
        console.log('invalid! auth fail');
        reject('Authentication failed.');
      });
    }
  });
}

export default { validateUser };
