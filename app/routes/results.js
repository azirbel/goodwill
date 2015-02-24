import Ember from 'ember';
import GithubHelpers from '../helpers/github';

export default Ember.Route.extend({
  model: function() {
    var username = this.controllerFor('application').get('username');
    var token = this.controllerFor('application').get('token');
    var repositories = this.controllerFor('application').get('repositories');
    var savedAllPRs;

    // TODO(azirbel): Deal with rate limits & per_page - abstract into a helper api
    var repoPromises = repositories.map(function(repo) {
      var url = 'https://api.github.com/search/issues?q=type:pr' + 
        '+involves:' + username + '+repo:' + repo + '&per_page=100';
      return GithubHelpers.ajax(url, token);
    });

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
  }
});
