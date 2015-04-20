/* jshint ignore:start */

/* jshint ignore:end */

define('goodwill/app', ['exports', 'ember', 'ember/resolver', 'ember/load-initializers', 'goodwill/config/environment'], function (exports, Ember, Resolver, loadInitializers, config) {

  'use strict';

  Ember['default'].MODEL_FACTORY_INJECTIONS = true;

  var App = Ember['default'].Application.extend({
    modulePrefix: config['default'].modulePrefix,
    podModulePrefix: config['default'].podModulePrefix,
    Resolver: Resolver['default']
  });

  loadInitializers['default'](App, config['default'].modulePrefix);

  exports['default'] = App;

});
define('goodwill/components/select-2', ['exports', 'ember-select-2/components/select-2'], function (exports, Select2Component) {

	'use strict';

	/*
		This is just a proxy file requiring the component from the /addon folder and
		making it available to the dummy application!
	 */
	exports['default'] = Select2Component['default'];

});
define('goodwill/controllers/application', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Controller.extend({
    showIndex: false,

    isShowingError: false,
    errorMessage: ""
  });

});
define('goodwill/controllers/faq', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Controller.extend({
    queryParams: ["anchor"],

    anchor: "top",
    goToAnchor: function goToAnchor() {
      var _this = this;
      Ember['default'].run.schedule("afterRender", function () {
        var anchor = _this.get("anchor");
        if (!anchor) {
          return;
        }
        var $elem = Ember['default'].$("#" + anchor);
        var scrollTo = 0;
        if ($elem.length > 0) {
          scrollTo = $elem.offset().top - 15;
        }
        Ember['default'].$(document).ready(function () {
          Ember['default'].$("html,body").animate({ scrollTop: scrollTo }, 1000);
        });
      });
    }
  });

});
define('goodwill/controllers/index', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Controller.extend({
    actions: {
      scrollToInfo: function scrollToInfo() {
        // The bottom of the purple "welcome" banner
        var scrollTo = Ember['default'].$(".welcome").outerHeight();
        Ember['default'].$("html,body").animate({ scrollTop: scrollTo }, 1000);
      }
    }
  });

});
define('goodwill/controllers/step/repositories', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Controller.extend({
    selectedRepositories: (function () {
      return [];
    }).property(),

    init: function init() {
      this._super();
      var repositories = localStorage.getItem("selectedRepositories");
      if (repositories) {
        this.set("selectedRepositories", JSON.parse(repositories));
      }
    },

    allRepositories: (function () {
      return (this.get("model") || []).mapBy("full_name").sort();
    }).property("model.[]"),

    // Get the list of repositories and add a "checked" attribute to each object
    displayRepoWrappers: (function () {
      var selectedRepositories = this.get("selectedRepositories");
      return this.get("allRepositories").map(function (repository) {
        return Ember['default'].Object.create({
          name: repository,
          checked: selectedRepositories.contains(repository)
        });
      });
    }).property("allRepositories.[]", "selectedRepositories.[]"),

    persistenceObserver: (function () {
      localStorage.setItem("selectedRepositories", JSON.stringify(this.get("selectedRepositories")));
    }).on("init").observes("selectedRepositories.[]"),

    actions: {
      toggleChecked: function toggleChecked(repository) {
        if (this.get("selectedRepositories").contains(repository)) {
          this.get("selectedRepositories").removeObject(repository);
        } else {
          this.get("selectedRepositories").pushObject(repository);
        }
      }
    }
  });

});
define('goodwill/controllers/step/results', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Controller.extend({
    queryParams: ["metric"],

    username: "",

    // TODO(azirbel): Username isn't updated here, if init was already called on
    // this singleton controller
    init: function init() {
      this._super();
      this.set("username", localStorage.getItem("githubUsername") || "");
    },

    metrics: Ember['default'].A([{ name: "Complexity Score", id: "score" }, { name: "Number of PRs", id: "num" }, { name: "Lines of Code", id: "loc" }]),

    // TODO(azirbel): Also a hack, would be better to keep all the information in
    // the "metrics" object, but I'm patching this and don't want to refactor
    // now.
    metricDescriptions: {
      score: "a weighted estimate of how much work each code review took",
      num: "split into small/large categories for less/greater than 200 lines " + "of code",
      loc: "the sum of lines added and deleted in a pull request"
    },
    metricDescription: (function () {
      return this.metricDescriptions[this.get("metric")];
    }).property("metric"),

    metric: "score",

    // TODO(azirbel): Hack, should use a handlebars helper instead
    metricIsScore: Ember['default'].computed.equal("metric", "score"),
    metricIsNum: Ember['default'].computed.equal("metric", "num"),
    metricIsLoc: Ember['default'].computed.equal("metric", "loc"),

    calculateComplexity: function calculateComplexity(numComments, loc) {
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
    allStats: (function () {
      var _this = this;
      var username = this.get("username");
      return this.get("model").map(function (prAndComments) {
        var pr = prAndComments[0];
        var comments = prAndComments[1];

        var date = new Date(pr.created_at);
        var author = pr.user.login;
        var reviewers = _this.getReviewersFromComments(author, comments);
        var valid = reviewers.length > 0 && (author === username || reviewers.contains(username));

        var isPositive = author !== username;
        var num = isPositive ? 1 : -1;
        var loc = (pr.additions + pr.deletions) * num;
        var score = _this.calculateComplexity(comments.length, loc) * num;

        var formattedReviewers = "";
        var wrappedReviewers = reviewers.map(function (reviewer) {
          return "<strong>" + reviewer + "</strong>";
        });
        if (wrappedReviewers.length === 1) {
          formattedReviewers = wrappedReviewers[0];
        } else if (wrappedReviewers.length === 2) {
          formattedReviewers = wrappedReviewers.join(" and ");
        } else if (wrappedReviewers.length > 2) {
          formattedReviewers = wrappedReviewers.slice(0, -1).join(", ") + ", and " + wrappedReviewers[wrappedReviewers.length - 1];
        }

        return Ember['default'].Object.create({
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
    }).property("model", "username"),

    // We put all reviewer usernames in lowercase
    parseReviewersFromComment: function parseReviewersFromComment(prAuthor, comment) {
      // If the author of the PR comments said LGTM, we assume they are tagging
      // someone else that LGTM'd the PR (i.e. they are noting a verbal LGTM).
      if (comment.user.login === prAuthor) {
        // Parse the comment for other usernames - we'll assume these are the
        // people who LGTM'd the pull request
        return (comment.body.match(/@[a-zA-Z-]+/g) || []).map(function (name) {
          // Remove leading '@'
          return name.slice(1).toLowerCase();
        });
      } else {
        return [comment.user.login.toLowerCase()];
      }
    },

    getReviewersFromComments: function getReviewersFromComments(author, comments) {
      var _this = this;
      var lgtmComments = comments.filter(function (comment) {
        return comment.body.indexOf("LGTM") > -1;
      });

      var reviewersByComment = lgtmComments.map(function (comment) {
        return _this.parseReviewersFromComment(author, comment);
      });

      // Gather all reviewers and sort alphabetically
      return _.union(_.flatten(reviewersByComment)).sort();
    },

    // The stats that are authored by, or LGTM'd by, the given user
    validStats: Ember['default'].computed.filterBy("allStats", "valid"),

    statsSort: ["date:desc"],
    statsAscendingSort: ["date:asc"],
    stats: Ember['default'].computed.sort("validStats", "statsSort"),
    statsAscending: Ember['default'].computed.sort("validStats", "statsAscendingSort"),

    // Special chart for the "number of PRs" analysis
    prCountOverTime: (function () {
      var statsAscending = this.get("statsAscending");
      var counts = {
        total: 0,
        small: 0,
        large: 0
      };
      var timeSeries = [];
      statsAscending.forEach(function (stat) {
        counts.total += stat.get("num");
        if (stat.loc < 200) {
          counts.small += stat.get("num");
        } else {
          counts.large += stat.get("num");
        }
        ["Total", "Small", "Large"].forEach(function (size) {
          timeSeries.pushObject({
            label: size,
            time: stat.date,
            value: counts[size.toLowerCase()]
          });
        });
      });
      return timeSeries;
    }).property("statsAscending"),

    goodwillOverTime: (function () {
      var metric = this.get("metric");
      if (metric === "num") {
        return this.get("prCountOverTime");
      }
      var statsAscending = this.get("statsAscending");
      var currentGoodwill = 0;
      var timeSeries = [];
      statsAscending.forEach(function (stat) {
        currentGoodwill += stat.get(metric);
        timeSeries.pushObject({
          label: "Goodwill",
          time: stat.date,
          value: currentGoodwill
        });
      });
      return timeSeries;
    }).property("statsAscending", "metric"),

    totalGoodwill: (function () {
      var metric = this.get("metric");
      return this.get("stats").reduce(function (a, b) {
        return a + b.get(metric);
      }, 0);
    }).property("stats", "metric"),

    totalGoodwillIsPositive: (function () {
      return this.get("totalGoodwill") >= 0;
    }).property("totalGoodwill")
  });

});
define('goodwill/controllers/step/username', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Controller.extend({
    username: "",
    token: "",

    init: function init() {
      this._super();
      this.set("username", localStorage.getItem("githubUsername") || "");
      this.set("token", localStorage.getItem("githubToken") || "");
    },

    persistenceObserver: (function () {
      localStorage.setItem("githubUsername", this.get("username"));
      localStorage.setItem("githubToken", this.get("token"));
    }).observes("username", "token") });

});
define('goodwill/helpers/fa-icon', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  var FA_PREFIX = /^fa\-.+/;

  var warn = Ember['default'].Logger.warn;

  /**
   * Handlebars helper for generating HTML that renders a FontAwesome icon.
   *
   * @param  {String} name    The icon name. Note that the `fa-` prefix is optional.
   *                          For example, you can pass in either `fa-camera` or just `camera`.
   * @param  {Object} options Options passed to helper.
   * @return {Ember.Handlebars.SafeString} The HTML markup.
   */
  var faIcon = function faIcon(name, options) {
    if (Ember['default'].typeOf(name) !== "string") {
      var message = "fa-icon: no icon specified";
      warn(message);
      return Ember['default'].String.htmlSafe(message);
    }

    var params = options.hash,
        classNames = [],
        html = "";

    classNames.push("fa");
    if (!name.match(FA_PREFIX)) {
      name = "fa-" + name;
    }
    classNames.push(name);
    if (params.spin) {
      classNames.push("fa-spin");
    }
    if (params.flip) {
      classNames.push("fa-flip-" + params.flip);
    }
    if (params.rotate) {
      classNames.push("fa-rotate-" + params.rotate);
    }
    if (params.lg) {
      warn("fa-icon: the 'lg' parameter is deprecated. Use 'size' instead. I.e. {{fa-icon size=\"lg\"}}");
      classNames.push("fa-lg");
    }
    if (params.x) {
      warn("fa-icon: the 'x' parameter is deprecated. Use 'size' instead. I.e. {{fa-icon size=\"" + params.x + "\"}}");
      classNames.push("fa-" + params.x + "x");
    }
    if (params.size) {
      if (Ember['default'].typeOf(params.size) === "string" && params.size.match(/\d+/)) {
        params.size = Number(params.size);
      }
      if (Ember['default'].typeOf(params.size) === "number") {
        classNames.push("fa-" + params.size + "x");
      } else {
        classNames.push("fa-" + params.size);
      }
    }
    if (params.fixedWidth) {
      classNames.push("fa-fw");
    }
    if (params.listItem) {
      classNames.push("fa-li");
    }
    if (params.pull) {
      classNames.push("pull-" + params.pull);
    }
    if (params.border) {
      classNames.push("fa-border");
    }
    if (params.classNames && !Ember['default'].isArray(params.classNames)) {
      params.classNames = [params.classNames];
    }
    if (!Ember['default'].isEmpty(params.classNames)) {
      Array.prototype.push.apply(classNames, params.classNames);
    }

    html += "<";
    var tagName = params.tagName || "i";
    html += tagName;
    html += " class='" + classNames.join(" ") + "'";
    if (params.title) {
      html += " title='" + params.title + "'";
    }
    if (params.ariaHidden === undefined || params.ariaHidden) {
      html += " aria-hidden=\"true\"";
    }
    html += "></" + tagName + ">";
    return Ember['default'].String.htmlSafe(html);
  };

  exports['default'] = Ember['default'].Handlebars.makeBoundHelper(faIcon);

  exports.faIcon = faIcon;

});
define('goodwill/helpers/github', ['exports', 'ic-ajax'], function (exports, icAjax) {

  'use strict';

  function ajax(url) {
    var token = arguments[1] === undefined ? null : arguments[1];

    if (!token) {
      return icAjax['default'](url);
    } else {
      return icAjax['default']({
        url: url,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: "token " + token
        }
      });
    }
  }

  exports['default'] = { ajax: ajax };

});
define('goodwill/helpers/validation', ['exports', 'ember', 'goodwill/helpers/github'], function (exports, Ember, GithubHelpers) {

  'use strict';

  function validateUser(username) {
    var token = arguments[1] === undefined ? null : arguments[1];

    return new Ember['default'].RSVP.Promise(function (resolve, reject) {
      if (!token) {
        GithubHelpers['default'].ajax("https://api.github.com/users/" + username).then(function () {
          resolve();
        }, function () {
          reject("User not found.");
        });
      } else {
        GithubHelpers['default'].ajax("https://api.github.com/user", token).then(function (response) {
          var cheat = localStorage.getItem("cheat") || false;
          // TODO(azirbel): Trim input fields in all such places
          if (response.login !== username && !cheat) {
            reject("Username does not match token.");
          } else {
            resolve();
          }
        }, function () {
          reject("Authentication failed.");
        });
      }
    });
  }

  exports['default'] = { validateUser: validateUser };

});
define('goodwill/initializers/app-version', ['exports', 'goodwill/config/environment', 'ember'], function (exports, config, Ember) {

  'use strict';

  var classify = Ember['default'].String.classify;

  exports['default'] = {
    name: "App Version",
    initialize: function initialize(container, application) {
      var appName = classify(application.toString());
      Ember['default'].libraries.register(appName, config['default'].APP.version);
    }
  };

});
define('goodwill/initializers/export-application-global', ['exports', 'ember', 'goodwill/config/environment'], function (exports, Ember, config) {

  'use strict';

  exports.initialize = initialize;

  function initialize(container, application) {
    var classifiedName = Ember['default'].String.classify(config['default'].modulePrefix);

    if (config['default'].exportApplicationGlobal && !window[classifiedName]) {
      window[classifiedName] = application;
    }
  }

  ;

  exports['default'] = {
    name: "export-application-global",

    initialize: initialize
  };

});
define('goodwill/router', ['exports', 'ember', 'goodwill/config/environment'], function (exports, Ember, config) {

  'use strict';

  var Router = Ember['default'].Router.extend({
    location: config['default'].locationType
  });

  Router.map(function () {
    this.route("faq");
    this.resource("step", function () {
      this.route("username");
      this.route("repositories");
      this.route("results");
    });
  });

  exports['default'] = Router;

});
define('goodwill/routes/application', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Route.extend({
    actions: {
      showError: function showError(errorMessage) {
        var _this = this;
        Ember['default'].run.next(function () {
          _this.controller.set("isShowingError", true);
          _this.controller.set("errorMessage", errorMessage);
        });
      },

      hideError: function hideError() {
        this.controller.set("isShowingError", false);
      }
    }
  });

});
define('goodwill/routes/faq', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Route.extend({
    goToAnchor: (function () {
      this.controllerFor("faq").goToAnchor();
    }).on("activate")
  });

});
define('goodwill/routes/step/repositories', ['exports', 'ember', 'goodwill/helpers/github', 'goodwill/helpers/validation'], function (exports, Ember, GithubHelpers, ValidationHelpers) {

  'use strict';

  exports['default'] = Ember['default'].Route.extend({
    model: function model() {
      var _this = this;
      var username = localStorage.getItem("githubUsername");
      var token = localStorage.getItem("githubToken");

      var url = "https://api.github.com/users/" + username + "/starred?per_page=100";

      return ValidationHelpers['default'].validateUser(username, token).then(function () {
        return GithubHelpers['default'].ajax(url, token);
      }, function (reason) {
        _this.send("showError", reason);
        _this.transitionTo("step.username");
      });
    },

    // Make sure our persisted selected repositories are only valid ones
    setupController: function setupController(controller, model) {
      this._super(controller, model);
      controller.set("selectedRepositories", controller.get("selectedRepositories").filter(function (repository) {
        return model.mapBy("full_name").contains(repository);
      }));
    },

    hideErrors: (function () {
      this.send("hideError");
    }).on("deactivate")
  });

});
define('goodwill/routes/step/results', ['exports', 'ember', 'goodwill/helpers/github', 'goodwill/helpers/validation'], function (exports, Ember, GithubHelpers, ValidationHelpers) {

  'use strict';

  exports['default'] = Ember['default'].Route.extend({
    model: function model() {
      var _this = this;
      var username = localStorage.getItem("githubUsername");
      var token = localStorage.getItem("githubToken");
      var repositories = JSON.parse(localStorage.getItem("selectedRepositories") || []);
      var savedAllPRs;

      if (!repositories || repositories.length === 0) {
        this.send("showError", "Please select at least one repository.");
        this.transitionTo("step.repositories");
      }

      // TODO(azirbel): Deal with rate limits & per_page - abstract into a helper
      // api
      var repoPromises = repositories.map(function (repo) {
        var url = "https://api.github.com/search/issues?q=type:pr" + "+involves:" + username + "+repo:" + repo + "&per_page=100";
        return GithubHelpers['default'].ajax(url, token);
      });

      return ValidationHelpers['default'].validateUser(username, token).then(function () {
        return Ember['default'].RSVP.all(repoPromises).then(function (allIssuesByRepo) {
          var allIssues = allIssuesByRepo.reduce(function (a, b) {
            return a.concat(b.items);
          }, []);
          // At this point we have information about each issue, but not the
          // detailed PR information (lines of code, comments url, etc) we need
          return Ember['default'].RSVP.all(allIssues.map(function (issue) {
            return GithubHelpers['default'].ajax(issue.pull_request.url, token);
          }));
        }).then(function (allPRs) {
          savedAllPRs = allPRs;
          // Now we just need to get the comments
          return Ember['default'].RSVP.all(allPRs.map(function (pr) {
            return GithubHelpers['default'].ajax(pr.comments_url, token);
          }));
        }).then(function (allComments) {
          return _.zip([savedAllPRs, allComments]);
        });
      }, function (reason) {
        _this.send("showError", reason);
        // Not great. We don't have much visibility into which error we actually
        // got; we just assume it was a login error from the first step.
        _this.transitionTo("step.username");
      });
    },

    hideErrors: (function () {
      this.send("hideError");
    }).on("deactivate")
  });

});
define('goodwill/routes/step/username', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Route.extend({
    hideErrors: (function () {
      this.send("hideError");
    }).on("deactivate")
  });

});
define('goodwill/templates/application', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("main");
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","error-bar");
          var el3 = dom.createTextNode("\n      ");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n      ");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n    ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element, content = hooks.content, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1, 1]);
          var morph0 = dom.createMorphAt(element0,0,1);
          var morph1 = dom.createMorphAt(element0,1,2);
          element(env, element0, context, "action", ["hideError"], {});
          content(env, morph0, context, "errorMessage");
          inline(env, morph1, context, "fa-icon", ["times"], {});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createTextNode("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        if (this.cachedFragment) { dom.repairClonedNode(fragment,[0,1]); }
        var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
        var morph1 = dom.createMorphAt(fragment,1,2,contextualElement);
        block(env, morph0, context, "if", [get(env, context, "isShowingError")], {}, child0, null);
        content(env, morph1, context, "outlet");
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/error', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("main");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h1");
        var el3 = dom.createTextNode("Error. Sorry!");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    If you have an idea of what went wrong, please\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3,"href","https://github.com/azirbel/goodwill/issues");
        var el4 = dom.createTextNode("file an issue");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    and I'll try to fix it! In the meantime, you'll have to go back and try\n    again.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/faq', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("main");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h1");
        var el3 = dom.createTextNode("Frequently Asked Questions");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"id","tokens");
        var el3 = dom.createTextNode("Why do you use Personal Access Tokens?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    GitHub created Personal Access Tokens for quick and dirty use. If you write\n    a personal script that interacts with GitHub for you, you can paste the\n    access token directly into your script so it's always authenticated.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    This is a security hole; it's an easy way to leak all your permissions,\n    fast. To mitigate this, you can limit the permissions that each token has.\n    Goodwill only needs read-only access (the default).\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    There is an alternative: the\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3,"href","https://developer.github.com/v3/oauth/#web-application-flow");
        var el4 = dom.createTextNode("web\n    application flow");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode(", where a web app will redirect you to GitHub, you\n    authenticate, and GitHub gives the website a token to use. This is a\n    smoother UX, but I didn't implement it because (1) it's a lot of work for a\n    simple site like this, and (2) it requires that the website have a secret\n    key (registered with GitHub). Since I'm hosting publicly on GitHub pages, I\n    can't create a secret key.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"id","localStorage");
        var el3 = dom.createTextNode("Why store so much in localStorage?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    This site saves a lot of data to localStorage, including your GitHub\n    username, token, repositories you selected, and metric settings.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    It does this so it's easy for you come directly back to the results page,\n    so you can see if your code review habits have improved.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    There is a security risk here: though this app is open-source, I could\n    write another app under the domain azirbel.github.io, redirect you there,\n    and have that app steal your localStorage data. If you provided a token,\n    this would give me read-access to your GitHub.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"id","starred");
        var el3 = dom.createTextNode("Why use starred repositories?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Goodwill lets you select repositories to analyze from a list of your\n    starred repositories.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    The reason we use starred repositories is a technical limitation: the\n    GitHub API doesn't a provide a way to get a list of every repository you've\n    ever committed to or commented on.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    You might as well star repositories you care about, anyway!\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"id","reviewers");
        var el3 = dom.createTextNode("How do you count reviewers?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    We need some way to tell who reviewed a given pull request.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    My team uses a code word - LGTM (looks good to me) - to formally approve a\n    pull request. We don't merge unless someone has given their LGTM. This\n    makes it very easy for Goodwill to search through comments looking for\n    the phrase \"LGTM\".\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Of course, this approach can fail. But if we're lucky, mistakes will\n    cancel out.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    One special case that Goodwill does handle: if the author of a pull\n    request comments on their own request, with \"LGTM\" and another author's\n    name, then that other author will be counted as the reviewer for that pull\n    request. This addresses a common pattern: the author commenting \"verbal\n    LGTM by @otherperson\".\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    If you use a phrase other than LGTM... I'm afraid Goodwill don't support\n    that right now. You can open an issue in my GitHub repo, or just fork this\n    repository and add your own logic.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"id","goodwill");
        var el3 = dom.createTextNode("What is \"goodwill\"?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Goodwill is a measure of your \"giving back\" to the team by reviewing their\n    code.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    The number itself will vary based on what metric you are using to analyze\n    your reviews, but the idea is that positive goodwill means you've given\n    more than you've gotten, and negative goodwill means you've gotten too much.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        dom.setAttribute(el2,"id","metrics");
        var el3 = dom.createTextNode("How much weight do you give pull requests?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    To be useful, Goodwill needs a way to estimate how much work it took you\n    (or someone else) to review a pull request.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    The most common metric is \"lines of code\". That's an option with\n    Goodwill, but it's a bad one. If you've reviewed even one huge refactor,\n    suddenly your analysis is skewed by ten thousand lines of code.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Below are the available metrics and what they mean.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","wrapper");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","left-1");
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("Complexity Score");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","right-2");
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("\n      An estimate of how much time it took to review the pull request, on a\n      scale of 1 to 12. We first score the lines of code on a scale of 1-4 (for\n      tiny, small, medium, and large changes). Then we score the number of\n      comments on a scale of 1-3 (to see how much discussion/debate/fixes were\n      required). We multiply the two numbers together to give the most weight\n      to large changes which generated lots of discussion.\n    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","wrapper");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","left-1");
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("Number");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","right-2");
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("\n      A simple count of reviews: you get a point when you review someone else's\n      code, and you lose a point when someone reviews your code. For extra\n      detail, there are separate counts for large and small pull requests (more\n      and less than 200 lines of code, respectively).\n    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","wrapper");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","left-1");
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("Lines of Code");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","right-2");
        var el4 = dom.createElement("p");
        var el5 = dom.createTextNode("\n      A measure of the lines of code touched in a pull request, calculated as\n      addtions + deletions.\n    ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","button-block");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var morph0 = dom.createMorphAt(element0,2,3);
        var morph1 = dom.createMorphAt(dom.childAt(element0, [60]),0,1);
        inline(env, morph0, context, "link-to", ["← Back to home", "index"], {});
        inline(env, morph1, context, "link-to", ["Home", "index"], {"class": "home-btn"});
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/index', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","welcome");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","welcome-block");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","project-header");
        var el4 = dom.createTextNode("Check Your Code Review Karma");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","description");
        var el4 = dom.createTextNode("\n      A self-assessment to see if you reviewed as much code for your team as\n      they reviewed for you\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        dom.setAttribute(el2,"class","more-text");
        var el3 = dom.createTextNode("Or, read more...");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("main");
        dom.setAttribute(el1,"class","index");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h1");
        var el3 = dom.createTextNode("What is this?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Goodwill is a little tool that measures how much you give and take when\n    it comes to code review. It answers the question: \"do I review as much code\n    for other people as they review for me?\"\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    It only works with GitHub, but can analyze whichever repositories you\n    choose - public or private.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Works by scanning through all the pull requests in repositories you want to\n    analyze, looking for comments that contain the phrase \"LGTM\" (\"looks good\n    to me\"). If you reviewed someone else's code, you'll get \"goodwill\" points.\n    If someone else reviewed your code, you'll lose goodwill points. ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Plus, cool stats! See your goodwill change over time, get a list of all the\n    pull requests that involve you, and \"score\" pull requests using a variety\n    of metrics.\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h1");
        var el3 = dom.createTextNode("How does it work?");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    First, you'll enter your GitHub username and, optionally, authentication to\n    analyze private repositories.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Then you'll pick which repositories you want to analyze.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Goodwill will scan through every pull request in each repository you\n    selected. It looks for comments that contain the phrase \"LGTM\", and\n    determines the pull request author and reviewer(s).\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    All of this information is then combined into analytics, so you can get a\n    big picture view of your code review contributions.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  \n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h1");
        var el3 = dom.createTextNode("More information");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Check out the ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode(" page.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h1");
        var el3 = dom.createTextNode("About the author & project");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    Alex Zirbel is\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3,"href","http://github.com/azirbel");
        var el4 = dom.createTextNode("azirbel");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode(" on GitHub, and\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3,"href","http://www.twitter.com/alexzirbel");
        var el4 = dom.createTextNode("@alexzirbel");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode(" on Twitter.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    This project is open-source;\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3,"href","https://github.com/azirbel/goodwill");
        var el4 = dom.createTextNode("check it out on GitHub.");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    MIT License ©2015.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, inline = hooks.inline, element = hooks.element, subexpr = hooks.subexpr;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [3]);
        var element2 = dom.childAt(fragment, [2]);
        var morph0 = dom.createMorphAt(dom.childAt(element0, [1]),4,5);
        var morph1 = dom.createMorphAt(dom.childAt(element2, [7]),0,1);
        var morph2 = dom.createMorphAt(dom.childAt(element2, [9]),0,1);
        var morph3 = dom.createMorphAt(dom.childAt(element2, [17]),0,1);
        var morph4 = dom.createMorphAt(dom.childAt(element2, [23]),0,1);
        inline(env, morph0, context, "link-to", ["Get Started", "step.username"], {"class": "start-btn"});
        element(env, element1, context, "action", ["scrollToInfo"], {});
        inline(env, morph1, context, "link-to", ["[?]", "faq", subexpr(env, context, "query-params", [], {"anchor": "goodwill"})], {});
        inline(env, morph2, context, "link-to", ["[?]", "faq", subexpr(env, context, "query-params", [], {"anchor": "metrics"})], {});
        inline(env, morph3, context, "link-to", ["[?]", "faq", subexpr(env, context, "query-params", [], {"anchor": "reviewers"})], {});
        inline(env, morph4, context, "link-to", ["frequently asked questions", "faq", subexpr(env, context, "query-params", [], {"anchor": "top"})], {});
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/loading', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("img");
        dom.setAttribute(el1,"class","loading");
        dom.setAttribute(el1,"src","assets/images/loading.gif");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/step', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","circle");
          var el2 = dom.createTextNode("1");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","step-text");
          var el2 = dom.createTextNode("User");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","circle");
          var el2 = dom.createTextNode("2");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","step-text");
          var el2 = dom.createTextNode("Repositories");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    var child2 = (function() {
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","circle");
          var el2 = dom.createTextNode("3");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1,"class","step-text");
          var el2 = dom.createTextNode("Results");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("main");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("header");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3,"class","step-bar");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, block = hooks.block, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [1]);
        if (this.cachedFragment) { dom.repairClonedNode(element1,[1,2]); }
        var morph0 = dom.createMorphAt(element1,0,1);
        var morph1 = dom.createMorphAt(element1,1,2);
        var morph2 = dom.createMorphAt(element1,2,3);
        var morph3 = dom.createMorphAt(element0,2,3);
        block(env, morph0, context, "link-to", ["step.username"], {"class": "step"}, child0, null);
        block(env, morph1, context, "link-to", ["step.repositories"], {"class": "step"}, child1, null);
        block(env, morph2, context, "link-to", ["step.results"], {"class": "step"}, child2, null);
        content(env, morph3, context, "outlet");
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/step/loading', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("img");
        dom.setAttribute(el1,"class","loading");
        dom.setAttribute(el1,"src","assets/images/loading.gif");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/step/repositories', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("      ");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
            inline(env, morph0, context, "fa-icon", ["check-square-o"], {});
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("      ");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
            inline(env, morph0, context, "fa-icon", ["square-o"], {});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          var el2 = dom.createTextNode("\n");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("span");
          dom.setAttribute(el2,"class","repo-name");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element, get = hooks.get, block = hooks.block, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var morph0 = dom.createMorphAt(element0,0,1);
          var morph1 = dom.createMorphAt(dom.childAt(element0, [2]),-1,-1);
          element(env, element0, context, "bind-attr", [], {"class": ":repository repoWrapper.checked:checked"});
          element(env, element0, context, "action", ["toggleChecked", get(env, context, "repoWrapper.name")], {"bubbles": false});
          block(env, morph0, context, "if", [get(env, context, "repoWrapper.checked")], {}, child0, child1);
          content(env, morph1, context, "repoWrapper.name");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("h1");
        dom.setAttribute(el1,"class","title");
        var el2 = dom.createTextNode("Select Repositories");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("p");
        dom.setAttribute(el1,"class","last");
        var el2 = dom.createTextNode("\n  Here's a list of your starred repositories. Please select which ones you'd\n  like to analyze.\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","button-block");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, subexpr = hooks.subexpr, inline = hooks.inline, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element1 = dom.childAt(fragment, [5]);
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [2]),0,1);
        var morph1 = dom.createMorphAt(fragment,3,4,contextualElement);
        var morph2 = dom.createMorphAt(element1,0,1);
        var morph3 = dom.createMorphAt(element1,1,2);
        var morph4 = dom.createMorphAt(element1,2,3);
        inline(env, morph0, context, "link-to", ["[?]", "faq", subexpr(env, context, "query-params", [], {"anchor": "starred"})], {});
        block(env, morph1, context, "each", [get(env, context, "displayRepoWrappers")], {"keyword": "repoWrapper"}, child0, null);
        inline(env, morph2, context, "link-to", ["Back", "step.username"], {"class": "back-btn"});
        inline(env, morph3, context, "link-to", ["Home", "index"], {"class": "home-btn"});
        inline(env, morph4, context, "link-to", ["Next", "step.results"], {"class": "next-btn"});
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/step/results', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("          ");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
            content(env, morph0, context, "stat.score");
            return fragment;
          }
        };
      }());
      var child1 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("            ");
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
              content(env, morph0, context, "stat.num");
              return fragment;
            }
          };
        }());
        var child1 = (function() {
          return {
            isHTMLBars: true,
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("            ");
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
              content(env, morph0, context, "stat.loc");
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("");
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            if (this.cachedFragment) { dom.repairClonedNode(fragment,[0,1]); }
            var morph0 = dom.createMorphAt(fragment,0,1,contextualElement);
            block(env, morph0, context, "if", [get(env, context, "metricIsNum")], {}, child0, child1);
            return fragment;
          }
        };
      }());
      var child2 = (function() {
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("h4");
            var el2 = dom.createTextNode("\n          You reviewed a pull request by ");
            dom.appendChild(el1, el2);
            var el2 = dom.createElement("strong");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n        ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(dom.childAt(fragment, [1, 1]),-1,-1);
            content(env, morph0, context, "stat.author");
            return fragment;
          }
        };
      }());
      var child3 = (function() {
        return {
          isHTMLBars: true,
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("h4");
            var el2 = dom.createTextNode(" reviewed your pull request");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createUnsafeMorphAt(dom.childAt(fragment, [1]),-1,0);
            content(env, morph0, context, "stat.formattedReviewers");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("a");
          dom.setAttribute(el1,"target","_blank");
          dom.setAttribute(el1,"class","pr-stat");
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","left-1");
          var el3 = dom.createTextNode("\n      ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("div");
          var el4 = dom.createTextNode("\n");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("      ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n    ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2,"class","right-2");
          var el3 = dom.createTextNode("\n");
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("      ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("h4");
          var el4 = dom.createTextNode(" in ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n    ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, element = hooks.element, get = hooks.get, block = hooks.block, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var element0 = dom.childAt(fragment, [1]);
          var element1 = dom.childAt(element0, [1, 1]);
          var element2 = dom.childAt(element0, [3]);
          var element3 = dom.childAt(element2, [2]);
          var morph0 = dom.createMorphAt(element1,0,1);
          var morph1 = dom.createMorphAt(element2,0,1);
          var morph2 = dom.createMorphAt(element3,-1,0);
          var morph3 = dom.createMorphAt(element3,0,-1);
          element(env, element0, context, "bind-attr", [], {"href": "stat.htmlUrl"});
          element(env, element1, context, "bind-attr", [], {"class": ":loc stat.isPositive:positive:negative"});
          block(env, morph0, context, "if", [get(env, context, "metricIsScore")], {}, child0, child1);
          block(env, morph1, context, "if", [get(env, context, "stat.isPositive")], {}, child2, child3);
          content(env, morph2, context, "stat.formattedDate");
          content(env, morph3, context, "stat.repoName");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("h1");
        dom.setAttribute(el1,"class","title");
        var el2 = dom.createTextNode("Results & Analysis");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","wrapper");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        dom.setAttribute(el2,"class","high-text");
        var el3 = dom.createTextNode("Analyzing \n  ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  , ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode(".\n  ");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("p");
        var el3 = dom.createTextNode("\n    You gain goodwill points when you review code for your team, and lose points\n    when they review your code.\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","wrapper");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","center");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("h2");
        dom.setAttribute(el3,"class","goodwill");
        var el4 = dom.createTextNode("Goodwill\n    ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","wrapper");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("h2");
        var el2 = dom.createTextNode("Your pull request history");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","button-block");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline, content = hooks.content, subexpr = hooks.subexpr, element = hooks.element, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element4 = dom.childAt(fragment, [2, 1]);
        var element5 = dom.childAt(fragment, [4, 1]);
        var element6 = dom.childAt(element5, [3]);
        var element7 = dom.childAt(fragment, [11]);
        var morph0 = dom.createMorphAt(element4,0,1);
        var morph1 = dom.createMorphAt(element4,1,2);
        var morph2 = dom.createMorphAt(element4,2,3);
        var morph3 = dom.createMorphAt(dom.childAt(element5, [1]),0,1);
        var morph4 = dom.createMorphAt(element6,0,1);
        var morph5 = dom.createMorphAt(dom.childAt(fragment, [6]),0,1);
        var morph6 = dom.createMorphAt(fragment,9,10,contextualElement);
        var morph7 = dom.createMorphAt(element7,0,1);
        var morph8 = dom.createMorphAt(element7,1,2);
        inline(env, morph0, context, "select-2", [], {"content": get(env, context, "metrics"), "value": get(env, context, "metric"), "optionLabelPath": "name", "optionValuePath": "id", "searchEnabled": false});
        content(env, morph1, context, "metricDescription");
        inline(env, morph2, context, "link-to", ["[?]", "faq", subexpr(env, context, "query-params", [], {"anchor": "metrics"})], {});
        inline(env, morph3, context, "link-to", ["[?]", "faq", subexpr(env, context, "query-params", [], {"anchor": "goodwill"})], {});
        element(env, element6, context, "bind-attr", [], {"class": ":goodwill totalGoodwillIsPositive:positive:negative"});
        content(env, morph4, context, "totalGoodwill");
        inline(env, morph5, context, "time-series-chart", [], {"lineData": get(env, context, "goodwillOverTime"), "selectedSeedColor": "rgb(62,27,144)"});
        block(env, morph6, context, "each", [get(env, context, "stats")], {"keyword": "stat"}, child0, null);
        inline(env, morph7, context, "link-to", ["Back", "step.repositories"], {"class": "back-btn"});
        inline(env, morph8, context, "link-to", ["Home", "index"], {"class": "home-btn"});
        return fragment;
      }
    };
  }()));

});
define('goodwill/templates/step/username', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("h1");
        dom.setAttribute(el1,"class","title");
        var el2 = dom.createTextNode("Username and Authentication");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("h2");
        var el2 = dom.createTextNode("What is your GitHub username?");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","username-input");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("h2");
        var el2 = dom.createTextNode("Want to analyze private repositories?");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("p");
        var el2 = dom.createTextNode("\n  To analyze private repositories, or avoid rate-limiting, you'll need to\n  authenticate to GitHub. It's optional but recommended.\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("p");
        var el2 = dom.createTextNode("\n  Concerned about security? Good! But here's why giving access is ok:\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","three-panel-block");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","panel");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("h3");
        var el4 = dom.createTextNode("It's Open Source");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("p");
        var el4 = dom.createTextNode("\n      You can read the source code\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4,"href","https://github.com/azirbel/goodwill");
        var el5 = dom.createTextNode("on GitHub");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n      and see that nothing sketchy is going on.\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","panel");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("h3");
        var el4 = dom.createTextNode("It's Read-Only");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("p");
        var el4 = dom.createTextNode("\n      Restricted persmissions mean Goodwill can't edit any of your data.\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2,"class","panel");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("h3");
        var el4 = dom.createTextNode("It's Temporary");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("p");
        var el4 = dom.createTextNode("\n      Your token isn't saved to a database, and you can delete it when you're\n      done.\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("p");
        var el2 = dom.createTextNode("\n  Here's how to authenticate:\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("ol");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("li");
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4,"target","_blank");
        dom.setAttribute(el4,"href","https://github.com/settings/tokens/new");
        var el5 = dom.createTextNode("\n      Tell GitHub you want a new personal access token");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode(".\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("li");
        var el4 = dom.createTextNode("\n      Confirm your GitHub password.\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("li");
        var el4 = dom.createTextNode("\n      Write a description so you remember what the token is for.\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("br");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("Something like \"Goodwill - Temporary\" will do fine.\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("li");
        var el4 = dom.createTextNode("\n      Select scopes - the defaults are fine.\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("br");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("All we need is \"repo\" (read-only access to repositories).\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("li");
        var el4 = dom.createTextNode("\n      Hit \"Generate Token\", copy the resulting token, and paste it back here.\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","token-input");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1,"class","button-block");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline, subexpr = hooks.subexpr;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var element0 = dom.childAt(fragment, [18]);
        var morph0 = dom.createMorphAt(dom.childAt(fragment, [4]),0,1);
        var morph1 = dom.createMorphAt(dom.childAt(fragment, [14, 1, 1]),2,3);
        var morph2 = dom.createMorphAt(dom.childAt(fragment, [16]),0,1);
        var morph3 = dom.createMorphAt(element0,0,1);
        var morph4 = dom.createMorphAt(element0,1,2);
        inline(env, morph0, context, "input", [], {"value": get(env, context, "username"), "placeholder": "GitHub username"});
        inline(env, morph1, context, "link-to", ["[?]", "faq", subexpr(env, context, "query-params", [], {"anchor": "tokens"})], {});
        inline(env, morph2, context, "input", [], {"value": get(env, context, "token"), "placeholder": "GitHub token, e.g. \"d94116...\""});
        inline(env, morph3, context, "link-to", ["Home", "index"], {"class": "home-btn"});
        inline(env, morph4, context, "link-to", ["Next", "step.repositories"], {"class": "next-btn"});
        return fragment;
      }
    };
  }()));

});
define('goodwill/tests/app.jshint', function () {

  'use strict';

  module('JSHint - .');
  test('app.js should pass jshint', function() { 
    ok(true, 'app.js should pass jshint.'); 
  });

});
define('goodwill/tests/controllers/application.jshint', function () {

  'use strict';

  module('JSHint - controllers');
  test('controllers/application.js should pass jshint', function() { 
    ok(true, 'controllers/application.js should pass jshint.'); 
  });

});
define('goodwill/tests/controllers/faq.jshint', function () {

  'use strict';

  module('JSHint - controllers');
  test('controllers/faq.js should pass jshint', function() { 
    ok(true, 'controllers/faq.js should pass jshint.'); 
  });

});
define('goodwill/tests/controllers/index.jshint', function () {

  'use strict';

  module('JSHint - controllers');
  test('controllers/index.js should pass jshint', function() { 
    ok(true, 'controllers/index.js should pass jshint.'); 
  });

});
define('goodwill/tests/controllers/step/repositories.jshint', function () {

  'use strict';

  module('JSHint - controllers/step');
  test('controllers/step/repositories.js should pass jshint', function() { 
    ok(true, 'controllers/step/repositories.js should pass jshint.'); 
  });

});
define('goodwill/tests/controllers/step/results.jshint', function () {

  'use strict';

  module('JSHint - controllers/step');
  test('controllers/step/results.js should pass jshint', function() { 
    ok(true, 'controllers/step/results.js should pass jshint.'); 
  });

});
define('goodwill/tests/controllers/step/username.jshint', function () {

  'use strict';

  module('JSHint - controllers/step');
  test('controllers/step/username.js should pass jshint', function() { 
    ok(true, 'controllers/step/username.js should pass jshint.'); 
  });

});
define('goodwill/tests/helpers/github.jshint', function () {

  'use strict';

  module('JSHint - helpers');
  test('helpers/github.js should pass jshint', function() { 
    ok(true, 'helpers/github.js should pass jshint.'); 
  });

});
define('goodwill/tests/helpers/resolver', ['exports', 'ember/resolver', 'goodwill/config/environment'], function (exports, Resolver, config) {

  'use strict';

  var resolver = Resolver['default'].create();

  resolver.namespace = {
    modulePrefix: config['default'].modulePrefix,
    podModulePrefix: config['default'].podModulePrefix
  };

  exports['default'] = resolver;

});
define('goodwill/tests/helpers/resolver.jshint', function () {

  'use strict';

  module('JSHint - helpers');
  test('helpers/resolver.js should pass jshint', function() { 
    ok(true, 'helpers/resolver.js should pass jshint.'); 
  });

});
define('goodwill/tests/helpers/start-app', ['exports', 'ember', 'goodwill/app', 'goodwill/router', 'goodwill/config/environment'], function (exports, Ember, Application, Router, config) {

  'use strict';



  exports['default'] = startApp;
  function startApp(attrs) {
    var application;

    var attributes = Ember['default'].merge({}, config['default'].APP);
    attributes = Ember['default'].merge(attributes, attrs); // use defaults, but you can override;

    Ember['default'].run(function () {
      application = Application['default'].create(attributes);
      application.setupForTesting();
      application.injectTestHelpers();
    });

    return application;
  }

});
define('goodwill/tests/helpers/start-app.jshint', function () {

  'use strict';

  module('JSHint - helpers');
  test('helpers/start-app.js should pass jshint', function() { 
    ok(true, 'helpers/start-app.js should pass jshint.'); 
  });

});
define('goodwill/tests/helpers/validation.jshint', function () {

  'use strict';

  module('JSHint - helpers');
  test('helpers/validation.js should pass jshint', function() { 
    ok(true, 'helpers/validation.js should pass jshint.'); 
  });

});
define('goodwill/tests/router.jshint', function () {

  'use strict';

  module('JSHint - .');
  test('router.js should pass jshint', function() { 
    ok(true, 'router.js should pass jshint.'); 
  });

});
define('goodwill/tests/routes/application.jshint', function () {

  'use strict';

  module('JSHint - routes');
  test('routes/application.js should pass jshint', function() { 
    ok(true, 'routes/application.js should pass jshint.'); 
  });

});
define('goodwill/tests/routes/faq.jshint', function () {

  'use strict';

  module('JSHint - routes');
  test('routes/faq.js should pass jshint', function() { 
    ok(true, 'routes/faq.js should pass jshint.'); 
  });

});
define('goodwill/tests/routes/step/repositories.jshint', function () {

  'use strict';

  module('JSHint - routes/step');
  test('routes/step/repositories.js should pass jshint', function() { 
    ok(true, 'routes/step/repositories.js should pass jshint.'); 
  });

});
define('goodwill/tests/routes/step/results.jshint', function () {

  'use strict';

  module('JSHint - routes/step');
  test('routes/step/results.js should pass jshint', function() { 
    ok(true, 'routes/step/results.js should pass jshint.'); 
  });

});
define('goodwill/tests/routes/step/username.jshint', function () {

  'use strict';

  module('JSHint - routes/step');
  test('routes/step/username.js should pass jshint', function() { 
    ok(true, 'routes/step/username.js should pass jshint.'); 
  });

});
define('goodwill/tests/test-helper', ['goodwill/tests/helpers/resolver', 'ember-qunit'], function (resolver, ember_qunit) {

	'use strict';

	ember_qunit.setResolver(resolver['default']);

});
define('goodwill/tests/test-helper.jshint', function () {

  'use strict';

  module('JSHint - .');
  test('test-helper.js should pass jshint', function() { 
    ok(true, 'test-helper.js should pass jshint.'); 
  });

});
/* jshint ignore:start */

/* jshint ignore:end */

/* jshint ignore:start */

define('goodwill/config/environment', ['ember'], function(Ember) {
  var prefix = 'goodwill';
/* jshint ignore:start */

try {
  var metaName = prefix + '/config/environment';
  var rawConfig = Ember['default'].$('meta[name="' + metaName + '"]').attr('content');
  var config = JSON.parse(unescape(rawConfig));

  return { 'default': config };
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

/* jshint ignore:end */

});

if (runningTests) {
  require("goodwill/tests/test-helper");
} else {
  require("goodwill/app")["default"].create({"name":"goodwill","version":"0.5.0.7421df4f"});
}

/* jshint ignore:end */
//# sourceMappingURL=goodwill.map