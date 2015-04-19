import Ember from 'ember';

export default Ember.Controller.extend({
  queryParams: ['anchor'],

  anchor: 'top',
  goToAnchor: function() {
    var _this = this;
    Ember.run.schedule('afterRender', function() {
      var anchor = _this.get('anchor');
      if (!anchor) {
        return;
      }
      var $elem = Ember.$('#' + anchor);
      var scrollTo = 0;
      if ($elem.length > 0) {
        scrollTo = $elem.offset().top - 15;
      }
      Ember.$(document).ready(function() {
         Ember.$("html,body").animate({ scrollTop: scrollTo }, 1000);
      });
    });
  }
});
