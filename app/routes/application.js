import Ember from 'ember';

export default Ember.Route.extend({
  actions: {
    // Workaround to allow linking to an anchor on another page
    goToAnchor: function(route, anchor) {
      this.transitionTo(route).then(function() {
        Em.run.schedule('afterRender', function() {
          var $elem = $('#' + anchor);
          $('html,body').animate({
              scrollTop: $elem.offset().top - 15
          }, 0);              
        });
      });
    }
  }
});
