import Ember from 'ember';

export default Ember.Route.extend({
  goToAnchor: function() {
    this.controllerFor('faq').goToAnchor();
  }.on('activate')
});
