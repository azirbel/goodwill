import Ember from 'ember';

export default Ember.Controller.extend({
  username: '',

  init: function() {
    this._super();
    this.set('username', localStorage.getItem('reciprocityUsername') || '');
  },

  metrics: Ember.A([
    { name: 'Complexity Score', id: 'score' },
    { name: 'Number of PRs', id: 'num' },
    { name: 'Lines of Code', id: 'loc' }
  ]),

  metric: 'score',

  // TODO(azirbel): Hack for now
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
    var username = this.get('username');
    return this.get('model').map(function(prAndComments) {
      var pr = prAndComments[0];
      var comments = prAndComments[1];

      var author = pr.user.login;
      var reviewers = _this.getReviewersFromComments(author, comments);
      var valid = (reviewers.length > 0) &&
        ((author === username) || (reviewers.contains(username)));

      var isPositive = author !== username;
      var num = isPositive ? 1 : -1;
      var loc = (pr.additions + pr.deletions) * num;
      var score = _this.calculateComplexity(comments.length, loc);

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

  // TODO(azirbel): Override LOC/reviewers/etc in description or comments. That
  // way you can override/clean up your report. (Recommend editing comments
  // rather than adding new ones so people aren't notified of your OCD)

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

  prSizeStats: function() {
    var username = this.get('username');
    var sizeStats = {
      large: {
        positive: 0,
        negative: 0
      },
      small: {
        positive: 0,
        negative: 0
      }
    };
    var positiveFlag;
    var largeFlag;
    this.get('stats').forEach(function(stat) {
      positiveFlag = 'positive';
      largeFlag = 'large';
      if (stat.loc < 200) {
        largeFlag = 'small';
      }
      if (stat.author === username) {
        positiveFlag = 'negative';
      }
      sizeStats[largeFlag][positiveFlag] += 1;
    });
    return sizeStats;
  }.property('stats', 'username'),

  // Top 3 reviewers of your code
  topReviewers: function() {
    var username = this.get('username');
    var metric = this.get('metric');
    var totalsByReviewer = {};
    var topReviewers = [];

    this.get('stats').forEach(function(stat) {
      if (stat.author !== username) {
        return;
      }
      stat.reviewers.forEach(function(reviewer) {
        if (!totalsByReviewer[reviewer]) {
          totalsByReviewer[reviewer] = 0;
        }
        totalsByReviewer[reviewer] += stat.get(metric);
      });
    });

    for (var key in totalsByReviewer) {
      topReviewers.pushObject({
        username: key,
        points: totalsByReviewer[key]
      });
    }
    topReviewers.sortBy('points');
    return topReviewers.slice(0, 3);
  }.property('stats', 'username', 'metric'),

  goodwillOverTime: function() {
    var metric = this.get('metric');
    var statsAscending = this.get('stats').reverse();
    var currentGoodwill = 0;
    var timeSeries = [];
    statsAscending.forEach(function(stat) {
      currentGoodwill += stat.get(metric);
      timeSeries.pushObject({
        label: 'THING',
        time: stat.date,
        value: currentGoodwill
      });
    });
    return timeSeries;
  }.property('stats', 'metric'),

  totalGoodwill: function() {
    var metric = this.get('metric');
    return this.get('stats').reduce(function(a, b) {
      return a + b.get(metric);
    }, 0);
  }.property('stats', 'metric'),

  // TODO(azirbel): Ridiculous.
  absTotalGoodwill: function() {
    return Math.abs(this.get('totalGoodwill'));
  }.property('totalGoodwill'),

  totalGoodwillIsPositive: function() {
    return this.get('totalGoodwill') >= 0;
  }.property('totalGoodwill')
});
