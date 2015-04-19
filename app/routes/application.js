import Ember from 'ember';

export default Ember.Route.extend({
  actions: {
    // Workaround to allow linking to an anchor on another page
    // TODO(azirbel): Remove
    goToAnchor: function(route, anchor) {
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
