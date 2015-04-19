define("reciprocity/app",["exports","ember","ember/resolver","ember/load-initializers","./config/environment"],function(e,t,s,a,r){"use strict";t["default"].MODEL_FACTORY_INJECTIONS=!0;var n=t["default"].Application.extend({modulePrefix:r["default"].modulePrefix,podModulePrefix:r["default"].podModulePrefix,Resolver:s["default"]});a["default"](n,r["default"].modulePrefix),e["default"]=n}),define("reciprocity/controllers/application",["exports","ember","ic-ajax"],function(e,t,s){"use strict";e["default"]=t["default"].Controller.extend({queryParams:["step"],step:0,isHome:t["default"].computed.equal("step",0),isUsername:t["default"].computed.equal("step",1),isRepositories:t["default"].computed.equal("step",2),isResults:t["default"].computed.equal("step",3),numSteps:4,username:"",isLoadingRepositories:!1,availableRepositories:t["default"].A(),selectedRepositories:t["default"].computed.filterBy("availableRepositories","checked"),selectedRepositoryNames:t["default"].computed.mapBy("selectedRepositories","full_name"),usernameObserver:function(){console.log("AJAX request to load repositories."),this.loadRepositories()}.observes("username"),loadRepositories:function(){var e=this,a="https://api.github.com/users/"+this.get("username")+"/starred?per_page=100";this.set("isLoadingRepositories",!0),s["default"](a).then(function(s){e.set("availableRepositories",t["default"].A(s)),e.get("availableRepositories").setEach("checked",!1),e.set("isLoadingRepositories",!1)})["catch"](function(t){console.log("Error loading repositories: "+t),e.set("isLoadingRepositories",!1)})},isLoadingStats:!1,previousSelectedRepositoryNames:t["default"].A(),associatedIssues:t["default"].A(),statsObserver:function(){2!==this.get("step")&&0!==this.get("selectedRepositories.length")&&JSON.stringify(this.get("previousSelectedRepositoryNames"))!==JSON.stringify(this.get("selectedRepositoryNames"))&&(this.set("previousSelectedRepositoryNames",this.get("selectedRepositoryNames").copy()),console.log("AJAX request (search) to load involvement."),this.loadStats())}.observes("selectedRepositories","step"),loadStats:function(){var e,a,r,n,i=this,o=this.get("username"),u=this.get("selectedRepositories").map(function(t){return e=t.full_name,a="https://api.github.com/search/issues?q=type:pr+involves:"+o+"+repo:"+e+"&per_page=3",s["default"](a)});this.set("isLoadingStats",!0),t["default"].RSVP.all(u).then(function(e){return r=e.reduce(function(e,t){return e.concat(t.items)},[]),t["default"].RSVP.all(r.map(function(e){return s["default"](e.pull_request.url)}))}).then(function(e){return n=e,t["default"].RSVP.all(e.map(function(e){return s["default"](e.comments_url)}))}).then(function(e){i.computeStatsObjects(n,e),i.set("isLoadingStats",!1)})["catch"](function(e){console.log("Error loading stats: "+e),i.set("isLoadingStats",!1)})},computeStatsObjects:function(e,t){var s=this,a=this.get("username"),r=_.zip(e,t).map(function(e){var t=e[0],r=e[1],n=t.user.login,i=s.getReviewersFromComments(r),o=i.length>0&&(n===a||i.contains(a));return{additions:t.additions,deletions:t.deletions,loc:t.additions+t.deletions,author:n,reviewers:i,created:t.created_at,url:t.url,htmlUrl:t.html_url,valid:o}});this.set("allStats",r)},getReviewersFromComments:function(e){var t=e.filter(function(e){return e.body.indexOf("LGTM")>-1});return t.map(function(e){return e.user.login})},finalStats:t["default"].computed.filterBy("allStats","valid"),totalGoodwill:function(){return this.get("finalStats").reduce(function(e,t){return e+t.loc},0)}.property("finalStats"),actions:{nextStep:function(){this.get("step")<this.get("numSteps")-1&&this.incrementProperty("step")},previousStep:function(){this.get("step")>0&&this.decrementProperty("step")},submitUsername:function(e){this.set("username",e),this.send("nextStep")}}})}),define("reciprocity/initializers/export-application-global",["exports","ember","../config/environment"],function(e,t,s){"use strict";function a(e,a){var r=t["default"].String.classify(s["default"].modulePrefix);s["default"].exportApplicationGlobal&&(window[r]=a)}e.initialize=a,e["default"]={name:"export-application-global",initialize:a}}),define("reciprocity/router",["exports","ember","./config/environment"],function(e,t,s){"use strict";var a=t["default"].Router.extend({location:s["default"].locationType});a.map(function(){}),e["default"]=a}),define("reciprocity/templates/application",["exports","ember"],function(e,t){"use strict";e["default"]=t["default"].Handlebars.template(function(e,s,a,r,n){function i(e,t){t.buffer.push("\n  <div class='section'>Section 1</div>\n  <div class='section'>Section 2</div>\n  <div class='section'>Section 3</div>\n")}function o(e,t){var s,r,n="";return t.buffer.push("\n  "),t.buffer.push(c((s=a.partial||e&&e.partial,r={hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["STRING"],data:t},s?s.call(e,"username",r):f.call(e,"partial","username",r)))),t.buffer.push("\n"),n}function u(e,t){var s,r,n="";return t.buffer.push("\n  "),t.buffer.push(c((s=a.partial||e&&e.partial,r={hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["STRING"],data:t},s?s.call(e,"repositories",r):f.call(e,"partial","repositories",r)))),t.buffer.push("\n"),n}function p(e,t){var s,r,n="";return t.buffer.push("\n  "),t.buffer.push(c((s=a.partial||e&&e.partial,r={hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["STRING"],data:t},s?s.call(e,"results",r):f.call(e,"partial","results",r)))),t.buffer.push("\n"),n}this.compilerInfo=[4,">= 1.0.0"],a=this.merge(a,t["default"].Handlebars.helpers),n=n||{};var l,h="",f=a.helperMissing,c=this.escapeExpression,d=this;return n.buffer.push("<h1>Reciprocity</h2>\n\n<h3>Score yourself on code reviews!</h3>\n\n<button "),n.buffer.push(c(a.action.call(s,"previousStep",{hash:{},hashTypes:{},hashContexts:{},contexts:[s],types:["STRING"],data:n}))),n.buffer.push(">Previous</button>\n<button "),n.buffer.push(c(a.action.call(s,"nextStep",{hash:{},hashTypes:{},hashContexts:{},contexts:[s],types:["STRING"],data:n}))),n.buffer.push(">Next</button>\n\n<br/>\n<br/>\n\n\n\n"),l=a["if"].call(s,"isHome",{hash:{},hashTypes:{},hashContexts:{},inverse:d.noop,fn:d.program(1,i,n),contexts:[s],types:["ID"],data:n}),(l||0===l)&&n.buffer.push(l),n.buffer.push("\n"),l=a["if"].call(s,"isUsername",{hash:{},hashTypes:{},hashContexts:{},inverse:d.noop,fn:d.program(3,o,n),contexts:[s],types:["ID"],data:n}),(l||0===l)&&n.buffer.push(l),n.buffer.push("\n"),l=a["if"].call(s,"isRepositories",{hash:{},hashTypes:{},hashContexts:{},inverse:d.noop,fn:d.program(5,u,n),contexts:[s],types:["ID"],data:n}),(l||0===l)&&n.buffer.push(l),n.buffer.push("\n"),l=a["if"].call(s,"isResults",{hash:{},hashTypes:{},hashContexts:{},inverse:d.noop,fn:d.program(7,p,n),contexts:[s],types:["ID"],data:n}),(l||0===l)&&n.buffer.push(l),n.buffer.push("\n"),h})}),define("reciprocity/templates/repositories",["exports","ember"],function(e,t){"use strict";e["default"]=t["default"].Handlebars.template(function(e,s,a,r,n){function i(e,t){t.buffer.push("\n  Loading...\n")}function o(e,t){var s,r="";return t.buffer.push("\n  <div>Please select from starred repositories:</div>\n  "),s=a.each.call(e,"repository","in","availableRepositories",{hash:{},hashTypes:{},hashContexts:{},inverse:c.noop,fn:c.program(4,u,t),contexts:[e,e,e],types:["ID","ID","ID"],data:t}),(s||0===s)&&t.buffer.push(s),t.buffer.push("\n"),r}function u(e,t){var s,r,n,i="";return t.buffer.push("\n    <div>\n      "),t.buffer.push(f((r=a.input||e&&e.input,n={hash:{type:"checkbox",checkedBinding:"repository.checked"},hashTypes:{type:"STRING",checkedBinding:"STRING"},hashContexts:{type:e,checkedBinding:e},contexts:[],types:[],data:t},r?r.call(e,n):h.call(e,"input",n)))),t.buffer.push("\n      <span>"),s=a._triageMustache.call(e,"repository.full_name",{hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["ID"],data:t}),(s||0===s)&&t.buffer.push(s),t.buffer.push("</span>\n    </div>\n  "),i}this.compilerInfo=[4,">= 1.0.0"],a=this.merge(a,t["default"].Handlebars.helpers),n=n||{};var p,l="",h=a.helperMissing,f=this.escapeExpression,c=this;return n.buffer.push("<div>Something repo</div>\n\n<br/><br/>\n"),p=a["if"].call(s,"isLoadingRepositories",{hash:{},hashTypes:{},hashContexts:{},inverse:c.program(3,o,n),fn:c.program(1,i,n),contexts:[s],types:["ID"],data:n}),(p||0===p)&&n.buffer.push(p),n.buffer.push("\n"),l})}),define("reciprocity/templates/results",["exports","ember"],function(e,t){"use strict";e["default"]=t["default"].Handlebars.template(function(e,s,a,r,n){function i(e,t){t.buffer.push("\n  Loading...\n")}function o(e,t){var s,r="";return t.buffer.push("\n  <div>Goodwill:</div>\n  <div>"),s=a._triageMustache.call(e,"totalGoodwill",{hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["ID"],data:t}),(s||0===s)&&t.buffer.push(s),t.buffer.push("</div>\n\n  <br/><br/>\n\n  "),s=a.each.call(e,"stat","in","finalStats",{hash:{},hashTypes:{},hashContexts:{},inverse:h.noop,fn:h.program(4,u,t),contexts:[e,e,e],types:["ID","ID","ID"],data:t}),(s||0===s)&&t.buffer.push(s),t.buffer.push("\n"),r}function u(e,t){var s,r="";return t.buffer.push("\n    <div>Author: "),s=a._triageMustache.call(e,"stat.author",{hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["ID"],data:t}),(s||0===s)&&t.buffer.push(s),t.buffer.push("</div>\n    <div>Reviewer: "),s=a._triageMustache.call(e,"stat.reviewers",{hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["ID"],data:t}),(s||0===s)&&t.buffer.push(s),t.buffer.push("</div>\n    <div>LOC: "),s=a._triageMustache.call(e,"stat.loc",{hash:{},hashTypes:{},hashContexts:{},contexts:[e],types:["ID"],data:t}),(s||0===s)&&t.buffer.push(s),t.buffer.push("</div>\n    <br/><br/>\n  "),r}this.compilerInfo=[4,">= 1.0.0"],a=this.merge(a,t["default"].Handlebars.helpers),n=n||{};var p,l="",h=this;return n.buffer.push("<h3>Results</h3>\n\n"),p=a["if"].call(s,"isLoadingStats",{hash:{},hashTypes:{},hashContexts:{},inverse:h.program(3,o,n),fn:h.program(1,i,n),contexts:[s],types:["ID"],data:n}),(p||0===p)&&n.buffer.push(p),n.buffer.push("\n"),l})}),define("reciprocity/templates/username",["exports","ember"],function(e,t){"use strict";e["default"]=t["default"].Handlebars.template(function(e,s,a,r,n){this.compilerInfo=[4,">= 1.0.0"],a=this.merge(a,t["default"].Handlebars.helpers),n=n||{};var i,o,u="",p=a.helperMissing,l=this.escapeExpression;return n.buffer.push("<div>Please enter your github username:</div>\n"),n.buffer.push(l((i=a.input||s&&s.input,o={hash:{action:"submitUsername"},hashTypes:{action:"STRING"},hashContexts:{action:s},contexts:[],types:[],data:n},i?i.call(s,o):p.call(s,"input",o)))),n.buffer.push("\n"),u})}),define("reciprocity/config/environment",["ember"],function(e){var t="reciprocity";try{var s=t+"/config/environment",a=e["default"].$('meta[name="'+s+'"]').attr("content"),r=JSON.parse(unescape(a));return{"default":r}}catch(n){throw new Error('Could not read config from meta tag with name "'+s+'".')}}),runningTests?require("reciprocity/tests/test-helper"):require("reciprocity/app")["default"].create({});