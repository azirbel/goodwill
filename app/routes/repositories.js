import Ember from 'ember';
import GithubHelpers from '../helpers/github';

export default Ember.Route.extend({
  // TODO(azirbel): Redirect to /username if username is unset
  model: function() {
    var username = this.controllerFor('application').get('username');
    var token = this.controllerFor('application').get('token');

    var url = 'https://api.github.com/users/' + username +
      '/starred?per_page=100';

    return GithubHelpers.ajax(url, token);
  }
});
