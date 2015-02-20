import Ember from 'ember';

export default Ember.Controller.extend({
  needs: ['application'],

  selectedRepositories:
    Ember.computed.alias('controllers.application.repositories'),

  allRepositories: function() {
    return (this.get('model') || []).mapBy('full_name').sort();
  }.property('model.[]'),

  // Get the list of repositories and add a "checked" attribute to each object
  displayRepoWrappers: function() {
    var selectedRepositories = this.get('selectedRepositories');
    return this.get('allRepositories').map(function(repository) {
      return Ember.Object.create({
        name: repository,
        checked: selectedRepositories.contains(repository)
      });
    });
  }.property('allRepositories.[]', 'selectedRepositories.[]'),

  persistenceObserver: function() {
    Cookies.set('repositories', this.get('selectedRepositories'));
  }.on('init').observes('selectedRepositories.[]'),

  actions: {
    toggleChecked: function(repository) {
      if (this.get('selectedRepositories').contains(repository)) {
        this.get('selectedRepositories').removeObject(repository);
      } else {
        this.get('selectedRepositories').pushObject(repository);
      }
    }
  }
});
