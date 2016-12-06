import loadAdapter from '../AdapterLoader';

const facebook = require('./facebook');
const instagram = require("./instagram");
const linkedin = require("./linkedin");
const meetup = require("./meetup");
const google = require("./google");
const github = require("./github");
const twitter = require("./twitter");
const spotify = require("./spotify");
const digits = require("./twitter"); // digits tokens are validated by twitter
const janrainengage = require("./janrainengage");
const janraincapture = require("./janraincapture");
const vkontakte = require("./vkontakte");
const qq = require("./qq");
const wechat = require("./wechat");
const weibo = require("./weibo");

const anonymous = {
  validateAuthData: () => {
    return Promise.resolve();
  },
  validateAppId: () => {
    return Promise.resolve();
  }
}

const providers = {
  facebook,
  instagram,
  linkedin,
  meetup,
  google,
  github,
  twitter,
  spotify,
  anonymous,
  digits,
  janrainengage,
  janraincapture,
  vkontakte,
  qq,
  wechat,
  weibo
}

function authDataValidator(adapter, appIds, options) {
  return function(authData) {
    return adapter.validateAuthData(authData, options).then(() => {
      if (appIds) {
        return adapter.validateAppId(appIds, authData, options);
      }
      return Promise.resolve();
    });
  }
}

module.exports = function(authOptions = {}, enableAnonymousUsers = true) {
  let _enableAnonymousUsers = enableAnonymousUsers;
  let setEnableAnonymousUsers = function(enable) {
    _enableAnonymousUsers = enable;
  }
  // To handle the test cases on configuration
  let getValidatorForProvider = function(provider) {

    if (provider === 'anonymous' && !_enableAnonymousUsers) {
      return;
    }

    const defaultAdapter = providers[provider];
    let adapter = defaultAdapter;
    const providerOptions = authOptions[provider];

    if (!defaultAdapter && !providerOptions) {
      return;
    }

    const appIds = providerOptions ? providerOptions.appIds : undefined;

    // Try the configuration methods
    if (providerOptions) {
      const optionalAdapter = loadAdapter(providerOptions, undefined, providerOptions);
      if (optionalAdapter) {
        adapter = optionalAdapter;
      }
    }

    if (!adapter.validateAuthData || !adapter.validateAppId) {
      return;
    }

    return authDataValidator(adapter, appIds, providerOptions);
  }

  return Object.freeze({
    getValidatorForProvider,
    setEnableAnonymousUsers,
  })
}
