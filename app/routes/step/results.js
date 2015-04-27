import Ember from 'ember';
import GithubHelpers from '../../helpers/github';
import ValidationHelpers from '../../helpers/validation';

export default Ember.Route.extend({
  model: function() {
    var _this = this;
    var username = localStorage.getItem('githubUsername');
    var token = localStorage.getItem('githubToken');
    var repositories =
        JSON.parse(localStorage.getItem('selectedRepositories') || []);
    var savedAllPRs;

    if (!repositories || repositories.length === 0) {
      this.send('showError', 'Please select at least one repository.');
      this.transitionTo('step.repositories');
    }

    // TODO(azirbel): Deal with rate limits & per_page - abstract into a helper
    // api
    var repoPromises = repositories.map(function(repo) {
      var url = 'https://api.github.com/search/issues?q=type:pr' + 
        '+involves:' + username + '+repo:' + repo + '&per_page=100';
      return GithubHelpers.ajax(url, token);
    });

    return ValidationHelpers.validateUser(username, token).then(function() {
      return Ember.RSVP.all(repoPromises).then(function(allIssuesByRepo) {
        var allIssues = allIssuesByRepo.reduce(function(a, b) {
          return a.concat(b.items);
        }, []);
        // At this point we have information about each issue, but not the
        // detailed PR information (lines of code, comments url, etc) we need
        return Ember.RSVP.all(allIssues.map(function(issue) {
          return GithubHelpers.ajax(issue.pull_request.url, token);
        }));
      }).then(function(allPRs) {
        savedAllPRs = allPRs;
        // Now we just need to get the comments
        return Ember.RSVP.all(allPRs.map(function(pr) {
          return GithubHelpers.ajax(pr.comments_url, token);
        }));
      }).then(function(allComments) {
        return _.zip([savedAllPRs, allComments]);
      });
    }, function(reason) {
      _this.send('showError', reason);
      // Not great. We don't have much visibility into which error we actually
      // got; we just assume it was a login error from the first step.
      _this.transitionTo('step.username');
    });
  },

  setupController: function(controller, model) {
    this._super(controller, model);
    controller.set('username', localStorage.getItem('githubUsername') || '');
  },

  hideErrors: function() {
    this.send('hideError');
  }.on('deactivate')
});
