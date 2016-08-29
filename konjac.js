let Bot = require('./src/bot');
let Translator = require('./src/translator');
let config = require('config');

function KonjacBot() {
  Bot.call(this);
  this.translator = new Translator();
  this.speakLang = config.get('Translator.speak');
  this.translateLang = config.get('Translator.translate');
}

KonjacBot.prototype = Object.create(Bot.prototype);
KonjacBot.prototype._parseMessageToText = function (text) {
  text = text.split(' ').map(function (textToken) {
    if (!textToken.match(/<[^<>]+>/)) {
      return textToken;
    }
    return '';
  }).join(' ').trim();
  return text === '' ? null : text;
};
KonjacBot.prototype._getAttachmentTexts = function (message) {
  if (message.message && message.message.attachments) {
    return message.message.attachments.map(function (attachment) {
      return attachment.text;
    });
  }
  return [];
};
KonjacBot.prototype._fireIfCommand = function (message) {
  // TODO: chain of responsibility or command pattern ?
  // TODO: lang for each users?

  let langRegExp = {speakLang: /speak\s+(\w+)/ig, translateLang: /translate\s+(\w+)/ig,};
  for (var key in langRegExp) {
    if (message.text.match(langRegExp[key])) {
      // TODO: ja,en チェック
      this[key] = RegExp.$1;
      this.translator.translate({
        text: `OK! From now, I will translate "${this.translateLang}" into "${this.speakLang}" :)`,
        from: 'en',
        to: this.speakLang,
        callback: function (data) {
          this.rtm.sendMessage(data, message.channel);
        }.bind(this)
      });
      return true;
    }
  }

  return false;
};


let konjacBot = new KonjacBot();
konjacBot.onChannelJoined(function (message) {
  if (message.type === 'channel_joined') {
    let text = `Hi this is ${this.self.name}. I translate "${this.translateLang}" into "${this.speakLang}" as default. Let's talk to me :)`;

    this.translator.translate({
      text: text,
      from: 'en',
      to: this.speakLang,
      callback: function (data) {
        this.rtm.sendMessage(data, message.channel.id);
      }.bind(this)
    });

  }
});

konjacBot.onReceiveMessage(function (message, originalMessage) {
  if (this._fireIfCommand(message)) {
    return;
  }
  // TODO: 下の実装もコマンドに？

  let user = this.rtm.dataStore.getUserById(message.message ? message.message.user : message.user);

  let translateFn = (text, sendMessagePrefix) => {
    let parsedText = this._parseMessageToText(text);
    if (parsedText === null) {
      this.rtm.sendMessage(`${sendMessagePrefix}`, message.channel);
    } else {
      this.translator.translate({
        text: parsedText,
        from: this.translateLang,
        to: this.speakLang,
        callback: (data) => {
          this.rtm.sendMessage(`${sendMessagePrefix} ${data}`, message.channel);
        }
      });
    }
    resolve();
  };

  let sendMainMessage = () => {
    return new Promise(resolve => {
      translateFn(message.text, message.is_channel ? `@${user.name}` : '');
      resolve();
    })
  };

  let previousSendMessage = sendMainMessage();

  this._getAttachmentTexts(originalMessage).forEach(attachmentText => {
    previousSendMessage = previousSendMessage.then(new Promise(resolve => {
      translateFn(attachmentText, '=== Attachment Text Translation === \n');
      resolve();
    }));
  });

});

