import Ember from 'ember';

export default Ember.Controller.extend({
  queryParams: ['metric'],

  username: '',

  // TODO(azirbel): Username isn't updated here, if init was already called on
  // this singleton controller
  init: function() {
    this._super();
    this.set('username', localStorage.getItem('githubUsername') || '');
  },

  metrics: Ember.A([
    { name: 'Complexity Score', id: 'score' },
    { name: 'Number of PRs', id: 'num' },
    { name: 'Lines of Code', id: 'loc' }
  ]),

  // TODO(azirbel): Also a hack, would be better to keep all the information in
  // the "metrics" object, but I'm patching this and don't want to refactor
  // now.
  metricDescriptions: {
    'score': 'a weighted estimate of how much work each code review took',
    'num': 'split into small/large categories for less/greater than 200 lines ' +
      'of code',
    'loc': 'the sum of lines added and deleted in a pull request'
  },
  metricDescription: function() {
    return this.metricDescriptions[this.get('metric')];
  }.property('metric'),

  metric: 'score',

  // TODO(azirbel): Hack, should use a handlebars helper instead
  metricIsScore: Ember.computed.equal('metric', 'score'),
  metricIsNum: Ember.computed.equal('metric', 'num'),
  metricIsLoc: Ember.computed.equal('metric', 'loc'),

  calculateComplexity: function(numComments, loc) {
    var commentScore = 0;
    var locScore = 0;
    loc = Math.abs(loc);
    if (numComments === 0) {
      commentScore = 2;
    } else if (numComments < 3) {
      commentScore = 1;
    } else if (numComments < 15) {
      commentScore = 2;
    } else {
      commentScore = 3;
    }
    if (loc === 0) {
      locScore = 2;
    } else if (loc < 10) {
      locScore = 1;
    } else if (loc < 60) {
      locScore = 2;
    } else if (loc < 250) {
      locScore = 3;
    } else {
      locScore = 4;
    }
    return commentScore * locScore;
  },

  // TODO(azirbel): Am I getting both issue comments and review comments
  // correctly? Check output

  // All stats, not necessarily created or LGTM'd by the right user
  // TODO(azirbel): Better name. "Stats" doesn't make sense.
  allStats: function() {
    var _this = this;
    var username = this.get('username').toLowerCase();
    return this.get('model').map(function(prAndComments) {
      var pr = prAndComments[0];
      var comments = prAndComments[1];

      var date = new Date(pr.created_at);
      var author = pr.user.login.toLowerCase();
      var reviewers = _this.getReviewersFromComments(author, comments);
      var valid = (reviewers.length > 0) &&
        ((author === username) || (reviewers.contains(username)));

      var isPositive = author !== username;
      var num = isPositive ? 1 : -1;
      var loc = (pr.additions + pr.deletions) * num;
      var score = _this.calculateComplexity(comments.length, loc) * num;

      var formattedReviewers = '';
      var wrappedReviewers = reviewers.map(function(reviewer) {
        return '<strong>' + reviewer + '</strong>';
      });
      if (wrappedReviewers.length === 1) {
        formattedReviewers = wrappedReviewers[0];
      } else if (wrappedReviewers.length === 2) {
        formattedReviewers = wrappedReviewers.join(' and ');
      } else if (wrappedReviewers.length > 2) {
        formattedReviewers = wrappedReviewers.slice(0, -1).join(', ') +
          ', and ' + wrappedReviewers[wrappedReviewers.length - 1];
      }

      return Ember.Object.create({
        repoName: pr.base.repo.full_name,
        additions: pr.additions,
        deletions: pr.deletions,
        loc: loc,
        num: num,
        score: score,
        author: author.toLowerCase(),
        reviewers: reviewers,
        isPositive: isPositive,
        formattedReviewers: formattedReviewers,
        date: date,
        formattedDate: date.toLocaleDateString(),
        url: pr.url,
        htmlUrl: pr.html_url,
        valid: valid
      });
    });
  }.property('model', 'username'),

  // We put all reviewer usernames in lowercase
  parseReviewersFromComment: function(prAuthor, comment) {
    // If the author of the PR comments said LGTM, we assume they are tagging
    // someone else that LGTM'd the PR (i.e. they are noting a verbal LGTM).
    if (comment.user.login.toLowerCase() === prAuthor.toLowerCase()) {
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

  statsSort: ['date:desc'],
  statsAscendingSort: ['date:asc'],
  stats: Ember.computed.sort('validStats', 'statsSort'),
  statsAscending: Ember.computed.sort('validStats', 'statsAscendingSort'),

  // Special chart for the "number of PRs" analysis
  prCountOverTime: function() {
    var statsAscending = this.get('statsAscending');
    var counts = {
      total: 0,
      small: 0,
      large: 0
    };
    var timeSeries = [];
    statsAscending.forEach(function(stat) {
      counts.total += stat.get('num');
      if (stat.loc < 200) {
        counts.small += stat.get('num');
      } else {
        counts.large += stat.get('num');
      }
      ['Total', 'Small', 'Large'].forEach(function(size) {
        timeSeries.pushObject({
          label: size,
          time: stat.date,
          value: counts[size.toLowerCase()]
        });
      });
    });
    return timeSeries;
  }.property('statsAscending'),

  goodwillOverTime: function() {
    var metric = this.get('metric');
    if (metric === 'num') {
      return this.get('prCountOverTime');
    }
    var statsAscending = this.get('statsAscending');
    var currentGoodwill = 0;
    var timeSeries = [];
    statsAscending.forEach(function(stat) {
      currentGoodwill += stat.get(metric);
      timeSeries.pushObject({
        label: 'Goodwill',
        time: stat.date,
        value: currentGoodwill
      });
    });
    return timeSeries;
  }.property('statsAscending', 'metric'),

  totalGoodwill: function() {
    var metric = this.get('metric');
    return this.get('stats').reduce(function(a, b) {
      return a + b.get(metric);
    }, 0);
  }.property('stats', 'metric'),

  totalGoodwillIsPositive: function() {
    return this.get('totalGoodwill') >= 0;
  }.property('totalGoodwill')
});
