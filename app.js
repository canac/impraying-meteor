const Prayers = new Mongo.Collection('prayers');
const Comments = new Mongo.Collection('comments');

if (Meteor.isClient) {
  // This code only runs on the client
  const app = angular.module('im-praying', ['angular-meteor', 'ui.router', 'ngMaterial', 'angularMoment']);

  app.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider.state('prayer-list', {
      url: '/prayers',
      templateUrl: 'client/prayer-list.ng.html',
      controller: 'PrayerListCtrl',
      controllerAs: 'prayerList',
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

  app.controller('PrayerListCtrl', function($meteor, $state) {
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
    this.comments = $meteor.collection(() => Comments.find({ prayerId }, { sort: { timestamp: -1 } }));

    // Create a new comment on the prayer request
    this.createComment = function() {
      this.comments.push({
        author: Meteor.userId(),
        prayerId,
        content: this.comment,
        timestamp: new Date(),
      });

      // Clear the comment in preparation for creating the next one
      this.comment = '';
    };

    // Delete the prayer request and all of its comments
    this.destroyPrayer = function() {
      Prayers.remove(prayerId);
      $state.go('prayer-list');
    };
  });
}

if (Meteor.isServer) {
  Meteor.startup(function() {
    // Code to run on server at startup
  });
}
