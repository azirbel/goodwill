import Ember from 'ember';
import GithubHelpers from '../../helpers/github';
import ValidationHelpers from '../../helpers/validation';

export default Ember.Route.extend({
  model: function() {
    var _this = this;
    var username = localStorage.getItem('githubUsername');
    var token = localStorage.getItem('githubToken');

    var url = 'https://api.github.com/users/' + username +
      '/starred?per_page=100';

    return ValidationHelpers.validateUser(username, token).then(function() {
      return GithubHelpers.ajax(url, token);
    }, function(reason) {
      _this.send('showError', reason);
      _this.transitionTo('step.username');
    });
  },

  // Make sure our persisted selected repositories are only valid ones
  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('selectedRepositories',
        controller.get('selectedRepositories').filter(function(repository) {
          return model.mapBy('full_name').contains(repository);
        })
    );
  },

  hideErrors: function() {
    this.send('hideError');
  }.on('deactivate')
});
