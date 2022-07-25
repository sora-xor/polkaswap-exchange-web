const TranslationConsts = {
  appName: 'Polkaswap',
  ethereum: 'Ethereum',
  hashi: 'HASHI',
  xyk: 'XYK',
  metamask: 'MetaMask',
  polkadot: 'Polkadot',
  kusama: 'Kusama',
  polkadotJs: 'Polkadot.js',
  etherscan: 'Etherscan',
};

const enJson = {
  about: {
    swap: {
      first:
        'Go beyond the limits of current         DEXs by adding tokens from the Polkadot ecosystem as well as other blockchains.',
      second: 'Create, list              and trade your.. own tokens on the SORA... test network....',
      third:
        'Our core infrastructure   uses Parity @:substrate.test. which is more scalable than Ethereum, and     does not use expensive mining for @consensus.     ',
    },
  },
};

const esJson = {
  about: {
    swap: {
      first:
        'Vaya más allá de los límites de los DEX actuales agregando tokens del ecosistema Polkadot, así como de otras cadenas de bloques.',
      second: 'Cree, enumere y opere con sus propios tokens en la red СОРА.',
      third:
        'Nuestra infraestructura principal utiliza Parity Substrate, que es más escalable que Ethereum, y no utiliza la costosa minería para el consenso.',
    },
  },
};

const frJson = {
  about: {
    swap: {
      first:
        'Allez au-delà des limites des DEX actuels en ajoutant des jetons de l’écosystème Polkadot ainsi que d’autres blockchains.',
      second: 'Créez, listez et échangez vos propres jetons sur le réseau SORA.',
      third:
        'Notre infrastructure de base utilise Parity Substrate, qui est plus évolutif qu’Ethereum, et n’utilise pas d’exploitation minière coûteuse pour le consensus.',
    },
  },
};

const brokenTranslation: any = {};

const generateErrorLog = (message: string, translation: string, lang: string, translationKeys: Array<string>) => {
  if (!brokenTranslation[lang]) {
    brokenTranslation[lang] = {};
  }
  brokenTranslation[lang][translationKeys.join('::')] = {
    error:
      brokenTranslation[lang][translationKeys.join('::')] && brokenTranslation[lang][translationKeys.join('::')].error
        ? (brokenTranslation[lang][translationKeys.join('::')].error += `; ${message}`)
        : message,
    value: translation,
  };
};

const updateTranslation = (translation: string, translationKeys: Array<string>, initTranslationJson: any) => {
  switch (translationKeys.length + '') {
    case '1':
      initTranslationJson[translationKeys[0]] = translation;
      break;
    case '2':
      initTranslationJson[translationKeys[0]][translationKeys[1]] = translation;
      break;
    case '3':
      initTranslationJson[translationKeys[0]][translationKeys[1]][translationKeys[2]] = translation;
      break;
    case '4':
      initTranslationJson[translationKeys[0]][translationKeys[1]][translationKeys[2]][translationKeys[3]] = translation;
      break;
    case '5':
      initTranslationJson[translationKeys[0]][translationKeys[1]][translationKeys[2]][translationKeys[3]][
        translationKeys[4]
      ] = translation;
      break;
    default:
      break;
  }
};

describe('Translation tests', () => {
  test('Translation constants check and fix', () => {
    // Some items have translations, but they should be in en only (SORA, XYK, Polkaswap for ex.).
    let brokenConstsNumber = 0;
    const checkConstTranslation = (
      constKey: string,
      translation: string,
      lang: string,
      translationKeys: Array<string>,
      initTranslationJson: any
    ) => {
      const constValue = TranslationConsts[constKey];
      const indexOfKey = translation.indexOf(constValue);
      if (indexOfKey !== -1) {
        brokenConstsNumber++;
        generateErrorLog(`${constValue} instead of @:${constKey}`, translation, lang, translationKeys);

        const endIndexOfKey = indexOfKey + constValue.length;
        let newValue = '';
        if (translation.charAt(endIndexOfKey) === '.') {
          newValue = `${translation.substring(0, indexOfKey)}@:(${constKey}).${translation.substring(
            endIndexOfKey + 1
          )}`;
        } else {
          newValue = `${translation.substring(0, indexOfKey)}@${constKey}${translation.substring(endIndexOfKey)}`;
        }
        updateTranslation(newValue, translationKeys, initTranslationJson);
        // TODO: return value
      } else {
        translationKeys.pop();
      }
    };

    const checkTranslationItem = (
      lang: string,
      initTranslationJson: any,
      translationJson: any,
      constKey: string,
      translationKeys: Array<string> = []
    ) => {
      for (const translationKey in translationJson) {
        const translation = translationJson[translationKey];
        translationKeys.push(translationKey);
        // The translation file can have different levels of nested strustures, we should work with translation value only (go deeper if needed)
        if (typeof translation === 'string') {
          checkConstTranslation(constKey, translationJson[translationKey], lang, translationKeys, initTranslationJson);
        } else {
          checkTranslationItem(lang, initTranslationJson, translation, constKey, translationKeys);
        }
      }
    };

    for (const constKey in TranslationConsts) {
      checkTranslationItem('en', enJson, enJson, constKey);
    }
    for (const constKey in TranslationConsts) {
      checkTranslationItem('es', esJson, esJson, constKey);
    }
    for (const constKey in TranslationConsts) {
      checkTranslationItem('fr', frJson, frJson, constKey);
    }

    expect(false).toEqual(!!brokenConstsNumber);
  });
});

test('Translation Multiple Whitespaces check and fix', () => {
  let brokenWhitespacesNumber = 0;
  const checkMultipleWhitespaces = (
    translation: string,
    lang: string,
    translationKeys: Array<string>,
    initTranslationJson: any
  ) => {
    const regExp = /[ ]{2,}/g;
    const matches = [...translation.matchAll(regExp)];
    if (matches.length) {
      brokenWhitespacesNumber++;
      generateErrorLog('Multiple Whitespaces', translation, lang, translationKeys);

      let newValue = '';
      let startIndex = 0;
      matches.forEach((item) => {
        newValue += `${translation.substring(startIndex, item.index)}`;
        startIndex = (item.index ? item.index : 0) + item[0].length;
        if (startIndex !== translation.length) {
          newValue += ` `;
        }
      });
      newValue += `${translation.substring(startIndex)}`;
      updateTranslation(newValue, translationKeys, initTranslationJson);
    }

    translationKeys.pop();
  };

  const checkTranslationItem = (
    lang: string,
    initTranslationJson: any,
    translationJson: any,
    translationKeys: Array<string> = []
  ) => {
    for (const translationKey in translationJson) {
      const translation = translationJson[translationKey];
      translationKeys.push(translationKey);
      // The translation file can have different levels of nested strustures, we should work with translation value only (go deeper if needed)
      if (typeof translation === 'string') {
        checkMultipleWhitespaces(translationJson[translationKey], lang, translationKeys, initTranslationJson);
      } else {
        checkTranslationItem(lang, initTranslationJson, translation, translationKeys);
      }
    }
  };

  checkTranslationItem('en', enJson, enJson);
  checkTranslationItem('es', esJson, esJson);
  checkTranslationItem('fr', frJson, frJson);

  expect(false).toEqual(!!brokenWhitespacesNumber);
});

test('Translation Multiple Dots check and fix', () => {
  let brokenDotsNumber = 0;
  const checkMultipleDots = (
    translation: string,
    lang: string,
    translationKeys: Array<string>,
    initTranslationJson: any
  ) => {
    const regExp = /[.]{4,}|(?<![.])[.]{2}(?![.])/g;
    const matches = [...translation.matchAll(regExp)];
    if (matches.length) {
      brokenDotsNumber++;
      generateErrorLog('Multiple Dots', translation, lang, translationKeys);

      let newValue = '';
      let startIndex = 0;
      matches.forEach((item) => {
        newValue += `${translation.substring(startIndex, item.index)}.`;
        startIndex = (item.index ? item.index : 0) + item[0].length;
      });
      newValue += `${translation.substring(startIndex)}`;
      updateTranslation(newValue, translationKeys, initTranslationJson);
    }
    translationKeys.pop();
  };

  const checkTranslationItem = (
    lang: string,
    initTranslationJson: any,
    translationJson: any,
    translationKeys: Array<string> = []
  ) => {
    for (const translationKey in translationJson) {
      const translation = translationJson[translationKey];
      translationKeys.push(translationKey);
      // The translation file can have different levels of nested strustures, we should work with translation value only (go deeper if needed)
      if (typeof translation === 'string') {
        checkMultipleDots(translationJson[translationKey], lang, translationKeys, initTranslationJson);
      } else {
        checkTranslationItem(lang, initTranslationJson, translation, translationKeys);
      }
    }
  };

  checkTranslationItem('en', enJson, enJson);
  checkTranslationItem('es', esJson, esJson);
  checkTranslationItem('fr', frJson, frJson);

  expect(false).toEqual(!!brokenDotsNumber);
});

test('Translation Missed Braces check and fix', () => {
  // No braces wrap before the end of the sentence. ex. Lorem ipsum @text. instead of Lorem ipsum @:(text).
  let brokenBracesNumber = 0;
  const checkMissedBraces = (
    translation: string,
    lang: string,
    translationKeys: Array<string>,
    initTranslationJson: any
  ) => {
    const regExp = /@:?[a-zA-Z0-9.]{1,}(?= |$)/g;
    const matches = [...translation.matchAll(regExp)];
    if (matches.length) {
      brokenBracesNumber++;
      generateErrorLog('Missed Braces', translation, lang, translationKeys);

      let newValue = '';
      let startIndex = 0;
      matches.forEach((item) => {
        const itemIndex = item.index ? item.index : 0;
        newValue += `${translation.substring(startIndex, item.index)}@:(${translation.substring(
          itemIndex,
          itemIndex + item[0].length - 1
        )}).`;
        startIndex = (item.index ? item.index : 0) + item[0].length;
      });
      newValue += `${translation.substring(startIndex)}`;
      updateTranslation(newValue, translationKeys, initTranslationJson);
    }
    translationKeys.pop();
  };

  const checkTranslationItem = (
    lang: string,
    initTranslationJson: any,
    translationJson: any,
    translationKeys: Array<string> = []
  ) => {
    for (const translationKey in translationJson) {
      const translation = translationJson[translationKey];
      translationKeys.push(translationKey);
      // The translation file can have different levels of nested strustures, we should work with translation value only (go deeper if needed)
      if (typeof translation === 'string') {
        checkMissedBraces(translationJson[translationKey], lang, translationKeys, initTranslationJson);
      } else {
        checkTranslationItem(lang, initTranslationJson, translation, translationKeys);
      }
    }
  };

  checkTranslationItem('en', enJson, enJson);
  checkTranslationItem('es', esJson, esJson);
  checkTranslationItem('fr', frJson, frJson);
  console.log(brokenTranslation);
  console.log('enJson');
  console.log(enJson);
  console.log('esJson');
  console.log(esJson);
  console.log('frJson');
  console.log(frJson);

  expect(false).toEqual(!!brokenBracesNumber);
});
