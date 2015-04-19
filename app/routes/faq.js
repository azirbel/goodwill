import Ember from 'ember';

export default Ember.Route.extend({
  goToAnchor: function() {
    console.log('activate');
    this.controllerFor('faq').goToAnchor();
  }.on('activate')
});
