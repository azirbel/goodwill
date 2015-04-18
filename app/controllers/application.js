import Ember from 'ember';

export default Ember.Controller.extend({
  showIndex: false,

  isShowingError: false,
  errorMessage: '',

  // Scroll to the top of pages when we switch routes
  currentPathChanged: function () {
    window.scrollTo(0, 0);
  }.observes('currentPath')
});
