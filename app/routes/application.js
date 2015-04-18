import Ember from 'ember';

export default Ember.Route.extend({
  actions: {
    // Workaround to allow linking to an anchor on another page
    // TODO(azirbel): This needs to open in a new window
    goToAnchor: function(route, anchor) {
      // FIXME(azirbel): Try just using scrollTo
      this.transitionTo(route).then(function() {
        Em.run.schedule('afterRender', function() {
          var $elem = $('#' + anchor);
          $('html,body').animate({
              scrollTop: $elem.offset().top - 15
          }, 0);              
        });
      });
    },

    showError: function(errorMessage) {
      var _this = this;
      Ember.run.next(function() {
        _this.controller.set('isShowingError', true);
        _this.controller.set('errorMessage', errorMessage);
      });
    },

    hideError: function() {
      this.controller.set('isShowingError', false);
    }
  }
});
