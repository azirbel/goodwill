import Ember from 'ember';

export default Ember.Route.extend({
  activate: function() {
    this.controllerFor('application').set('showIndex', true);
  },

  deactivate: function() {
    this.controllerFor('application').set('showIndex', false);
  }
});
