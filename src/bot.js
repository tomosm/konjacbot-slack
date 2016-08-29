var SlackClient = require('@slack/client');
var RtmClient = SlackClient.RtmClient;
var RTM_EVENTS = SlackClient.RTM_EVENTS;
// The memory data store is a collection of useful functions we can include in our RtmClient
// var MemoryDataStore = require('@slack/client').MemoryDataStore;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var config = require('config');

if (!config.has('SlackAPI.token')) {
  throw new Error('Slack API Token should be defined in config/production.js and export NODE_ENV=production.');
}

function Bot() {
  // this.
  this.rtm = new RtmClient(config.get('SlackAPI.token'), {
    // Sets the level of logging we require
    logLevel: 'error',
    // Initialise a data store for our client, this will load additional helper functions for the storing and retrieval of data
    // dataStore: new MemoryDataStore()
  });
  this.rtm.start();

  this.rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    this.self = rtmStartData.self;
  }.bind(this));

}

Bot.prototype.onChannelJoined = function (callback) {
  this.rtm.on(RTM_EVENTS.CHANNEL_JOINED, callback.bind(this));
};

Bot.prototype.onReceiveMessage = function (callback) {
  this.rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    if (message.type === 'message') {
      var text = message.message ? message.message.text : message.text;
      var channel = this.rtm.dataStore.getChannelById(message.channel);
      var is_channel = channel !== undefined;
      if (!is_channel || this._checkMessageAgainstMe(text)) {
        callback.bind(this)({
          text: text,
          user: message.message ? message.message.user : message.user,
          channel: message.channel,
          is_channel: is_channel
        }, message);
      }
    }
  }.bind(this));
};

Bot.prototype._checkMessageAgainstMe = function (text) {
  return text.match(new RegExp(`@${this.self.id}`, 'ig'));
};

module.exports = Bot;
