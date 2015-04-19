import Ember from 'ember';

export default Ember.Controller.extend({
  actions: {
    scrollToInfo: function() {
      // The bottom of the purple "welcome" banner
      var scrollTo = Ember.$('.welcome').outerHeight();
      Ember.$("html,body").animate({ scrollTop: scrollTo }, 1000);
    }
  }
});
