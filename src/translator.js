var config = require('config');
var MsTranslator = require('mstranslator');

// Second parameter to constructor (true) indicates that
// the token should be auto-generated.
var client = new MsTranslator({
  client_id: config.get('MicrosoftTranslatorAPI.clientId')
  , client_secret: config.get('MicrosoftTranslatorAPI.clientSecret')
}, true);

function Translator() {
}

Translator.prototype.translate = function (params) {
  if (!params.text) {
    return;
  }

  params.from = !!params.from ? params.from : config.get('Translator.translate');
  params.to = !!params.to ? params.to : config.get('Translator.speak');

  // Don't worry about access token, it will be auto-generated if needed.
  client.translate(params, function (err, data) {
    if (err === null) {
      params.callback(data);
    } else {
      params.callback(`Failed to translate the following text\n${params.text}`);
    }
  }.bind(this));
};

module.exports = Translator;
