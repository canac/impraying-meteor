const Prayers = new Mongo.Collection('prayers');

if (Meteor.isClient) {
  // This code only runs on the client
  const app = angular.module('im-praying', ['angular-meteor', 'ui.router', 'ngMaterial', 'angularMoment']);

  app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider.state('prayers', {
      url: '/prayers',
      templateUrl: 'client/prayers.ng.html',
      controller: 'PrayersCtrl',
      controllerAs: 'prayers',
    }).state('prayer-detail', {
      url: '/prayers/:id',
      templateUrl: 'client/prayer-detail.ng.html',
      controller: 'PrayerDetailCtrl',
      controllerAs: 'prayerDetail',
    });

    $urlRouterProvider.otherwise('/prayers');
  });

  app.controller('ImPrayingCtrl', function($scope) {
    $scope.lookupUser = (userId) => Meteor.users.findOne(userId);
  });

  app.controller('PrayersCtrl', function($meteor, $state) {
    // Initialize the scope variables
    this.request = '';
    this.prayers = $meteor.collection(() => Prayers.find({}, { sort: { timestamp: -1 } }));

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

    // Open the detail page for the specified prayer
    this.openPrayer = function(prayerId) {
      $state.go('prayer-detail', { id: prayerId });
    };
  });

  app.controller('PrayerDetailCtrl', function($meteor, $state, $stateParams) {
    const prayerId = $stateParams.id;
    this.prayer = Prayers.findOne(prayerId);

    this.destroyPrayer = function() {
      Prayers.remove(prayerId);
      $state.go('prayers');
    };
  });
}

if (Meteor.isServer) {
  Meteor.startup(function() {
    // Code to run on server at startup
  });
}
