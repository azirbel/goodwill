import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['application'],

  // All stats, not necessarily created or LGTM'd by the right user
  // TODO(azirbel): Better name. "Stats" doesn't make sense.
  allStats: function() {
    var _this = this;
    var username = this.get('controllers.application.username');
    return this.get('model').map(function(prAndComments) {
      var pr = prAndComments[0];
      var comments = prAndComments[1];

      var author = pr.user.login;
      var reviewers = _this.getReviewersFromComments(comments);
      var valid = (reviewers.length > 0) &&
        ((author === username) || (reviewers.contains(username)));

      return {
        additions: pr.additions,
        deletions: pr.deletions,
        loc: pr.additions + pr.deletions,
        author: author,
        reviewers: reviewers,
        created: pr.created_at,
        url: pr.url,
        htmlUrl: pr.html_url,
        valid: valid
      };
    });
  }.property('model'),

  getReviewersFromComments: function(comments) {
    var lgtmComments = comments.filter(function(comment) {
      return (comment.body.indexOf('LGTM') > -1);
    });

    return lgtmComments.map(function(comment) {
      return comment.user.login;
    });
  },

  // The stats that are authored by, or LGTM'd by, the given user
  stats: Ember.computed.filterBy('allStats', 'valid'),

  totalGoodwill: function() {
    return this.get('stats').reduce(function(a, b) {
      return a + b.loc;
    }, 0);
  }.property('stats'),
});
