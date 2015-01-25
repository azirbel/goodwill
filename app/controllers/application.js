import Ember from 'ember';
import ajax from 'ic-ajax';

export default Ember.Controller.extend({
  queryParams: ['step'],

  step: 0,

  // TODO(azirbel): Carousel will make this go away
  isHome: Ember.computed.equal('step', 0),
  isUsername: Ember.computed.equal('step', 1),
  isRepositories: Ember.computed.equal('step', 2),
  isResults: Ember.computed.equal('step', 3),
  numSteps: 4,

  /////////////////////////////////////////////////////////////////////////////
  // USERNAME
  /////////////////////////////////////////////////////////////////////////////

  username: '',

  /////////////////////////////////////////////////////////////////////////////
  // REPOSITORY
  /////////////////////////////////////////////////////////////////////////////

  isLoadingRepositories: false,
  availableRepositories: Ember.A(),
  selectedRepositories:
    Ember.computed.filterBy('availableRepositories', 'checked'),
  selectedRepositoryNames:
    Ember.computed.mapBy('selectedRepositories', 'full_name'),

  // Get starred repositories to use for the list of options
  usernameObserver: function() {
    console.log('AJAX request to load repositories.');
    this.loadRepositories();
  }.observes('username'),

  loadRepositories: function() {
    var _this = this;
    var url = 'https://api.github.com/users/' +
      this.get('username') + '/starred?per_page=100';
    this.set('isLoadingRepositories', true);

    ajax(url).then(function(response) {
      _this.set('availableRepositories', Ember.A(response));
      _this.get('availableRepositories').setEach('checked', false);
      _this.set('isLoadingRepositories', false);
    }).catch(function(reason) {
      // TODO(azirbel): Replace with error bar
      console.log('Error loading repositories: ' + reason);
      _this.set('isLoadingRepositories', false);
    });
  },

  /////////////////////////////////////////////////////////////////////////////
  // RESULTS
  /////////////////////////////////////////////////////////////////////////////
  
  isLoadingStats: false,
  previousSelectedRepositoryNames: Ember.A(),

  associatedIssues: Ember.A(),

  // TODO(azirbel): Observers have stupid names
  statsObserver: function() {
    // TODO(azirbel): Hacky.
    // Don't reload while the user is selecting repositories
    if (this.get('step') === 2) {
      return;
    }

    // Don't load if there are no repositories
    if (this.get('selectedRepositories.length') === 0) {
      // TODO(azirbel): reset here
      return;
    }

    // TODO(azirbel): Also hacky.
    // Save the old requested repositories so we don't load the same thing
    // twice in a row.
    if (JSON.stringify(this.get('previousSelectedRepositoryNames')) ===
        JSON.stringify(this.get('selectedRepositoryNames'))) {
      return;
    }
    this.set('previousSelectedRepositoryNames',
      this.get('selectedRepositoryNames').copy());

    console.log('AJAX request (search) to load involvement.');
    this.loadStats();
  }.observes('selectedRepositories', 'step'),

  // Handles the async chain
  loadStats: function() {
    var _this = this;
    // TODO(azirbel): Username could be wrong here
    var username = this.get('username');
    var repoName;
    var url;
    var allIssues;
    var savedAllPRs;

    // TODO(azirbel): Set rate limit back to 100
    var repoPromises = this.get('selectedRepositories').map(function(repo) {
      repoName = repo.full_name;
      url = 'https://api.github.com/search/issues?q=type:pr' + 
        '+involves:' + username + '+repo:' + repoName + '&per_page=3';
      return ajax(url);
    });

    this.set('isLoadingStats', true);
    Ember.RSVP.all(repoPromises).then(function(allIssuesByRepo) {
      allIssues = allIssuesByRepo.reduce(function(a, b) {
        return a.concat(b.items);
      }, []);
      // At this point we have information about each issue, but not the
      // detailed PR information (lines of code, comments url, etc) we need
      return Ember.RSVP.all(allIssues.map(function(issue) {
        return ajax(issue.pull_request.url);
      }));
    }).then(function(allPRs) {
      savedAllPRs = allPRs;
      // Now we just need to get the comments
      return Ember.RSVP.all(allPRs.map(function(pr) {
        return ajax(pr.comments_url);
      }));
    }).then(function(allComments) {
      _this.computeStatsObjects(savedAllPRs, allComments);
      _this.set('isLoadingStats', false);
    }).catch(function(reason) {
      // TODO(azirbel): Replace with error bar
      console.log('Error loading stats: ' + reason);
      _this.set('isLoadingStats', false);
    });
  },

  computeStatsObjects: function(allPRs, allComments) {
    var _this = this;
    var username = this.get('username');
    var stats = _.zip(allPRs, allComments).map(function(prAndComments) {
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
    // TODO(azirbel): Better name for "stats". Stats doesn't make sense.
    this.set('allStats', stats);
  },

  getReviewersFromComments: function(comments) {
    var lgtmComments = comments.filter(function(comment) {
      return (comment.body.indexOf('LGTM') > -1);
    });

    return lgtmComments.map(function(comment) {
      return comment.user.login;
    });
  },

  finalStats: Ember.computed.filterBy('allStats', 'valid'),

  totalGoodwill: function() {
    return this.get('finalStats').reduce(function(a, b) {
      return a + b.loc;
    }, 0);
  }.property('finalStats'),

  /////////////////////////////////////////////////////////////////////////////
  // ACTIONS
  /////////////////////////////////////////////////////////////////////////////

  actions: {
    nextStep: function() {
      if (this.get('step') < this.get('numSteps') - 1) {
        this.incrementProperty('step');
      }
    },

    previousStep: function() {
      if (this.get('step') > 0) {
        this.decrementProperty('step');
      }
    },

    submitUsername: function(username) {
      this.set('username', username);
      this.send('nextStep');
    }
  }
});
