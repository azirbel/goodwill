import Ember from 'ember';
import GithubHelpers from '../../helpers/github';

export default Ember.Route.extend({
  model: function() {
    var username = localStorage.getItem('githubUsername');
    var token = localStorage.getItem('githubToken');

    var url = 'https://api.github.com/users/' + username +
      '/starred?per_page=100';

    return GithubHelpers.ajax(url, token);
  },

  // Make sure our persisted selected repositories are only valid ones
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('selectedRepositories',
        controller.get('selectedRepositories').filter(function(repository) {
          return model.mapBy('full_name').contains(repository);
        })
    );
  }
});
