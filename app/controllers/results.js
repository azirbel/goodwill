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
      var reviewers = _this.getReviewersFromComments(author, comments);
      var valid = (reviewers.length > 0) &&
        ((author === username) || (reviewers.contains(username)));

      // For formatting
      var isPositive = author !== username;
      var formattedReviewers = '';
      if (reviewers.length === 1) {
        formattedReviewers = reviewers[0];
      } else if (reviewers.length === 2) {
        formattedReviewers = reviewers.join(' and ');
      } else if (reviewers.length > 2) {
        formattedReviewers = reviewers.slice(0, -1).join(', ') +
          ', and ' + reviewers[reviewers.length - 1];
      }

      var date = new Date(pr.created_at);

      // TODO(azirbel): Fix the issue where you comment on your own PR saying
      // it is LGTM'd by someone else. Possibly we can parse this automatically

      return {
        repoName: pr.base.repo.full_name,
        additions: pr.additions,
        deletions: pr.deletions,
        loc: pr.additions + pr.deletions,
        author: author.toLowerCase(),
        reviewers: reviewers,
        isPositive: isPositive,
        formattedReviewers: formattedReviewers,
        date: date,
        formattedDate: date.toLocaleDateString(),
        url: pr.url,
        htmlUrl: pr.html_url,
        valid: valid
      };
    });
  }.property('model'),

  // We put all reviewer usernames in lowercase
  parseReviewersFromComment: function(prAuthor, comment) {
    // If the author of the PR comments said LGTM, we assume they are tagging
    // someone else that LGTM'd the PR (i.e. they are noting a verbal LGTM).
    if (comment.user.login === prAuthor) {
      // Parse the comment for other usernames - we'll assume these are the
      // people who LGTM'd the pull request
      return (comment.body.match(/@[a-zA-Z-]+/g) || []).map(function(name) {
        // Remove leading '@'
        return name.slice(1).toLowerCase();
      });
    } else {
      return [comment.user.login.toLowerCase()];
    }
  },

  // TODO(azirbel): Write tests for this!
  getReviewersFromComments: function(author, comments) {
    var _this = this;
    var lgtmComments = comments.filter(function(comment) {
      return (comment.body.indexOf('LGTM') > -1);
    });

    var reviewersByComment = lgtmComments.map(function(comment) {
      return _this.parseReviewersFromComment(author, comment);
    });

    // Gather all reviewers and sort alphabetically
    return _.union(_.flatten(reviewersByComment)).sort();
  },

  // The stats that are authored by, or LGTM'd by, the given user
  validStats: Ember.computed.filterBy('allStats', 'valid'),

  statsSorting: ['date:desc'],
  stats: Ember.computed.sort('validStats', 'statsSorting'),

  totalGoodwill: function() {
    var loc;
    return this.get('stats').reduce(function(a, b) {
      loc = b.loc;
      if (!b.isPositive) {
        loc *= -1;
      }
      return a + loc;
    }, 0);
  }.property('stats'),

  // TODO(azirbel): Ridiculous.
  absTotalGoodwill: function() {
    return Math.abs(this.get('totalGoodwill'));
  }.property('totalGoodwill'),

  totalGoodwillIsPositive: function() {
    return this.get('totalGoodwill') >= 0;
  }.property('totalGoodwill')
});
