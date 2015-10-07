const Prayers = new Mongo.Collection('prayers');

if (Meteor.isClient) {
  // This code only runs on the client
  var app = angular.module('im-praying', ['angular-meteor', 'ui.router', 'ngMaterial', 'angularMoment']);

  app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider.state('prayers', {
      url: '/prayers',
      templateUrl: 'client/prayers.ng.html',
      controller: 'PrayersCtrl',
      controllerAs: 'prayers',
    });

    $urlRouterProvider.otherwise('/prayers');
  });

  app.controller('ImPrayingCtrl', function() {});

  app.controller('PrayersCtrl', function($meteor) {
    // Initialize the scope variables
    this.request = '';
    this.prayers = $meteor.collection(function() {
      return Prayers.find({}, { sort: { timestamp: -1 } });
    });

    // Create a new prayer request
    this.createPrayer = function() {
      this.prayers.push({
        author: Meteor.userId(),
        content: this.request,
        timestamp: new Date(),
      });

      // Clear the request in preparation for creating the next one
      this.request = '';
    };

    this.lookupUser = function(userId) {
      return Meteor.users.findOne(userId);
    };
  });
}

if (Meteor.isServer) {
  Meteor.startup(function() {
    // Code to run on server at startup
  });
}
