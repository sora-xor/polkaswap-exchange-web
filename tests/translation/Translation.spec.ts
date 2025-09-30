import {
  // describe,
  test,
  expect,
} from 'vitest';

// import { TranslationConsts } from '@/consts';

import * as arJson from '../../src/lang/ar.json';
import * as baJson from '../../src/lang/ba.json';
import * as cardArJson from '../../src/lang/card/ar.json';
import * as cardBaJson from '../../src/lang/card/ba.json';
import * as cardCsJson from '../../src/lang/card/cs.json';
import * as cardDeJson from '../../src/lang/card/de.json';
import * as cardEnJson from '../../src/lang/card/en.json';
import * as cardEsJson from '../../src/lang/card/es.json';
import * as cardFrJson from '../../src/lang/card/fr.json';
import * as cardHeJson from '../../src/lang/card/he.json';
import * as cardIdJson from '../../src/lang/card/id.json';
import * as cardItJson from '../../src/lang/card/it.json';
import * as cardKmJson from '../../src/lang/card/km.json';
import * as cardMyJson from '../../src/lang/card/my.json';
import * as cardNlJson from '../../src/lang/card/nl.json';
import * as cardPisJson from '../../src/lang/card/pis.json';
import * as cardPlJson from '../../src/lang/card/pl.json';
import * as cardRuJson from '../../src/lang/card/ru.json';
import * as cardSrJson from '../../src/lang/card/sr.json';
import * as cardThJson from '../../src/lang/card/th.json';
import * as cardUkJson from '../../src/lang/card/uk.json';
import * as cardUrJson from '../../src/lang/card/ur.json';
import * as cardViJson from '../../src/lang/card/vi.json';
import * as cardZhCnJson from '../../src/lang/card/zh_CN.json';
import * as cardZhTwJson from '../../src/lang/card/zh_TW.json';
import * as csJson from '../../src/lang/cs.json';
import * as deJson from '../../src/lang/de.json';
import * as enJson from '../../src/lang/en.json';
import * as esJson from '../../src/lang/es.json';
import * as frJson from '../../src/lang/fr.json';
import * as heJson from '../../src/lang/he.json';
import * as idJson from '../../src/lang/id.json';
import * as itJson from '../../src/lang/it.json';
import * as kmJson from '../../src/lang/km.json';
import * as myJson from '../../src/lang/my.json';
import * as nlJson from '../../src/lang/nl.json';
import * as pisJson from '../../src/lang/pis.json';
import * as plJson from '../../src/lang/pl.json';
import * as ruJson from '../../src/lang/ru.json';
import * as srJson from '../../src/lang/sr.json';
import * as thJson from '../../src/lang/th.json';
import * as ukJson from '../../src/lang/uk.json';
import * as urJson from '../../src/lang/ur.json';
import * as viJson from '../../src/lang/vi.json';
import * as zhCnJson from '../../src/lang/zh_CN.json';
import * as zhTwJson from '../../src/lang/zh_TW.json';

const brokenTranslation: any = {};

const generateErrorLog = (
  message: string,
  translation: string,
  newValue: string,
  lang: string,
  translationKeys: Array<string>
) => {
  if (!brokenTranslation[lang]) {
    brokenTranslation[lang] = {};
  }
  brokenTranslation[lang][translationKeys.join('::')] = {
    error:
      brokenTranslation[lang][translationKeys.join('::')] && brokenTranslation[lang][translationKeys.join('::')].error
        ? (brokenTranslation[lang][translationKeys.join('::')].error += `; ${message}`)
        : message,
    value: translation,
    newValue: newValue,
  };
};

// describe('Translation tests', () => {
//   test('Translation constants check and fix', () => {
//     // Some items have translations, but they should be in en only (SORA, XYK, Polkaswap for ex.).
//     let brokenConstsNumber = 0;
//     const checkConstTranslation = (
//       constKey: string,
//       translation: string,
//       lang: string,
//       translationKeys: Array<string>
//     ) => {
//       const constValue = TranslationConsts[constKey];
//       const indexOfKey = translation.indexOf(constValue);
//       if (indexOfKey !== -1) {
//         brokenConstsNumber++;

//         const endIndexOfKey = indexOfKey + constValue.length;
//         let newValue = '';
//         if (translation.charAt(endIndexOfKey) === '.') {
//           newValue = `${translation.substring(0, indexOfKey)}@:(${constKey}).${translation.substring(
//             endIndexOfKey + 1
//           )}`;
//         } else {
//           newValue = `${translation.substring(0, indexOfKey)}@:${constKey}|{${constKey}}${translation.substring(
//             endIndexOfKey
//           )}`;
//         }
//         generateErrorLog(
//           `${constValue} instead of @:${constKey}|{${constKey}}`,
//           translation,
//           newValue,
//           lang,
//           translationKeys
//         );
//       }

//       translationKeys.pop();
//     };

//     const checkTranslationItem = (
//       lang: string,
//       initTranslationJson: any,
//       translationJson: any,
//       constKey: string,
//       translationKeys: Array<string> = []
//     ) => {
//       for (const translationKey of Object.keys(translationJson)) {
//         const translation = translationJson[translationKey];
//         translationKeys.push(translationKey);
//         // The translation file can have different levels of nested strustures, we should work with translation value only (go deeper if needed)
//         if (typeof translation === 'string') {
//           checkConstTranslation(constKey, translationJson[translationKey], lang, translationKeys);
//         } else {
//           checkTranslationItem(lang, initTranslationJson, translation, constKey, translationKeys);
//           translationKeys.pop();
//         }
//       }
//     };

//     // for (const constKey in TranslationConsts) {
//     //   checkTranslationItem('en', enJson, enJson, constKey);
//     //   checkTranslationItem('ru', ruJson, ruJson, constKey);
//     //   checkTranslationItem('cs', csJson, csJson, constKey);
//     //   checkTranslationItem('de', deJson, deJson, constKey);
//     //   checkTranslationItem('es', esJson, esJson, constKey);
//     //   checkTranslationItem('fr', frJson, frJson, constKey);
//     //   checkTranslationItem('hr', hrJson, hrJson, constKey);
//     //   checkTranslationItem('hu', huJson, huJson, constKey);
//     //   checkTranslationItem('hy', hyJson, hyJson, constKey);
//     //   checkTranslationItem('id', idJson, idJson, constKey);
//     //   checkTranslationItem('it', itJson, itJson, constKey);
//     //   checkTranslationItem('nl', nlJson, nlJson, constKey);
//     //   checkTranslationItem('no', noJson, noJson, constKey);
//     //   checkTranslationItem('pl', plJson, plJson, constKey);
//     //   checkTranslationItem('sk', skJson, skJson, constKey);
//     //   checkTranslationItem('sr', srJson, srJson, constKey);
//     //   checkTranslationItem('sv', svJson, svJson, constKey);
//     //   checkTranslationItem('vi', viJson, viJson, constKey);
//     //   checkTranslationItem('yo', yoJson, yoJson, constKey);
//     //   checkTranslationItem('zh-CN', zhCnJson, zhCnJson, constKey);
//     // }

//     expect(false).toEqual(!!brokenConstsNumber);
//   });
// });

const getDefault = (module: Record<string, any>) => module.default ?? module;

const flattenTranslationKeys = (source: Record<string, any>, prefix: Array<string> = []): Array<string> => {
  const keys: Array<string> = [];

  Object.keys(source).forEach((key) => {
    const value = source[key];
    const path = [...prefix, key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenTranslationKeys(value, path));
    } else {
      keys.push(path.join('.'));
    }
  });

  return keys;
};

test('Translation catalogs mirror English keys', () => {
  const mainLocales = [
    { lang: 'ba', data: getDefault(baJson) },
    { lang: 'uk', data: getDefault(ukJson) },
    { lang: 'cs', data: getDefault(csJson) },
    { lang: 'de', data: getDefault(deJson) },
    { lang: 'es', data: getDefault(esJson) },
    { lang: 'fr', data: getDefault(frJson) },
    { lang: 'id', data: getDefault(idJson) },
    { lang: 'it', data: getDefault(itJson) },
    { lang: 'nl', data: getDefault(nlJson) },
    { lang: 'pl', data: getDefault(plJson) },
    { lang: 'ru', data: getDefault(ruJson) },
    { lang: 'sr', data: getDefault(srJson) },
    { lang: 'vi', data: getDefault(viJson) },
    { lang: 'zh-CN', data: getDefault(zhCnJson) },
    { lang: 'zh-TW', data: getDefault(zhTwJson) },
    { lang: 'he', data: getDefault(heJson) },
    { lang: 'ar', data: getDefault(arJson) },
    { lang: 'ur', data: getDefault(urJson) },
    { lang: 'km', data: getDefault(kmJson) },
    { lang: 'th', data: getDefault(thJson) },
    { lang: 'pis', data: getDefault(pisJson) },
    { lang: 'my', data: getDefault(myJson) },
  ];

  const expectedKeys = flattenTranslationKeys(getDefault(enJson)).sort();

  mainLocales.forEach(({ data }) => {
    expect(flattenTranslationKeys(data).sort()).toEqual(expectedKeys);
  });

  const cardLocales = [
    { lang: 'ba', data: getDefault(cardBaJson) },
    { lang: 'uk', data: getDefault(cardUkJson) },
    { lang: 'cs', data: getDefault(cardCsJson) },
    { lang: 'de', data: getDefault(cardDeJson) },
    { lang: 'es', data: getDefault(cardEsJson) },
    { lang: 'fr', data: getDefault(cardFrJson) },
    { lang: 'id', data: getDefault(cardIdJson) },
    { lang: 'it', data: getDefault(cardItJson) },
    { lang: 'nl', data: getDefault(cardNlJson) },
    { lang: 'pl', data: getDefault(cardPlJson) },
    { lang: 'ru', data: getDefault(cardRuJson) },
    { lang: 'sr', data: getDefault(cardSrJson) },
    { lang: 'vi', data: getDefault(cardViJson) },
    { lang: 'zh-CN', data: getDefault(cardZhCnJson) },
    { lang: 'zh-TW', data: getDefault(cardZhTwJson) },
    { lang: 'he', data: getDefault(cardHeJson) },
    { lang: 'ar', data: getDefault(cardArJson) },
    { lang: 'ur', data: getDefault(cardUrJson) },
    { lang: 'km', data: getDefault(cardKmJson) },
    { lang: 'th', data: getDefault(cardThJson) },
    { lang: 'pis', data: getDefault(cardPisJson) },
    { lang: 'my', data: getDefault(cardMyJson) },
  ];

  const expectedCardKeys = flattenTranslationKeys(getDefault(cardEnJson)).sort();

  cardLocales.forEach(({ data }) => {
    expect(flattenTranslationKeys(data).sort()).toEqual(expectedCardKeys);
  });
});

test('Translation Multiple Whitespaces check and fix', () => {
  let brokenWhitespacesNumber = 0;
  const checkMultipleWhitespaces = (translation: string, lang: string, translationKeys: Array<string>) => {
    const regExp = /[ ]{2,}/g;
    const matches = [...translation.matchAll(regExp)];
    if (matches.length) {
      brokenWhitespacesNumber++;

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
      generateErrorLog('Multiple Whitespaces', translation, newValue, lang, translationKeys);
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
        checkMultipleWhitespaces(translationJson[translationKey], lang, translationKeys);
      } else {
        checkTranslationItem(lang, initTranslationJson, translation, translationKeys);
        translationKeys.pop();
      }
    }
  };
  // [TODO] some translations have whitespaces
  // checkTranslationItem('en', enJson, enJson);
  // checkTranslationItem('ru', ruJson, ruJson);
  // checkTranslationItem('cs', csJson, csJson);
  // checkTranslationItem('de', deJson, deJson);
  // checkTranslationItem('es', esJson, esJson);
  // checkTranslationItem('fr', frJson, frJson);
  // checkTranslationItem('id', idJson, idJson);
  // checkTranslationItem('it', itJson, itJson);
  // checkTranslationItem('nl', nlJson, nlJson);
  // checkTranslationItem('pl', plJson, plJson);
  // checkTranslationItem('sr', srJson, srJson);
  // checkTranslationItem('vi', viJson, viJson);
  // checkTranslationItem('zh-CN', zhCnJson, zhCnJson);

  expect(false).toEqual(!!brokenWhitespacesNumber);
});

test('Translation Multiple Dots check and fix', () => {
  let brokenDotsNumber = 0;
  const checkMultipleDots = (translation: string, lang: string, translationKeys: Array<string>) => {
    const regExp = /[.]{4,}|(?<![.])[.]{2}(?![.])/g;
    const matches = [...translation.matchAll(regExp)];
    if (matches.length) {
      brokenDotsNumber++;

      let newValue = '';
      let startIndex = 0;
      matches.forEach((item) => {
        newValue += `${translation.substring(startIndex, item.index)}.`;
        startIndex = (item.index ? item.index : 0) + item[0].length;
      });
      newValue += `${translation.substring(startIndex)}`;
      generateErrorLog('Multiple Dots', translation, newValue, lang, translationKeys);
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
        checkMultipleDots(translationJson[translationKey], lang, translationKeys);
      } else {
        checkTranslationItem(lang, initTranslationJson, translation, translationKeys);
        translationKeys.pop();
      }
    }
  };

  checkTranslationItem('en', enJson, enJson);
  checkTranslationItem('ru', ruJson, ruJson);
  checkTranslationItem('cs', csJson, csJson);
  checkTranslationItem('de', deJson, deJson);
  checkTranslationItem('es', esJson, esJson);
  checkTranslationItem('fr', frJson, frJson);
  checkTranslationItem('id', idJson, idJson);
  checkTranslationItem('it', itJson, itJson);
  checkTranslationItem('nl', nlJson, nlJson);
  checkTranslationItem('pl', plJson, plJson);
  checkTranslationItem('sr', srJson, srJson);
  checkTranslationItem('vi', viJson, viJson);
  checkTranslationItem('zh-CN', zhCnJson, zhCnJson);

  expect(false).toEqual(!!brokenDotsNumber);
});

test('Translation Missed Braces check and fix', () => {
  // No braces wrap before the end of the sentence. ex. Lorem ipsum @text. instead of Lorem ipsum @:(text).
  let brokenBracesNumber = 0;
  const checkMissedBraces = (translation: string, lang: string, translationKeys: Array<string>) => {
    const regExp = /(?<=@:)[a-zA-Z0-9.]{1,}[.](?= |$)/g;
    const matches = [...translation.matchAll(regExp)];
    if (matches.length) {
      brokenBracesNumber++;

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
      generateErrorLog('Missed Braces', translation, newValue, lang, translationKeys);
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
        checkMissedBraces(translationJson[translationKey], lang, translationKeys);
      } else {
        checkTranslationItem(lang, initTranslationJson, translation, translationKeys);
        translationKeys.pop();
      }
    }
  };

  checkTranslationItem('en', enJson, enJson);
  checkTranslationItem('ru', ruJson, ruJson);
  checkTranslationItem('cs', csJson, csJson);
  checkTranslationItem('de', deJson, deJson);
  checkTranslationItem('es', esJson, esJson);
  checkTranslationItem('fr', frJson, frJson);
  checkTranslationItem('id', idJson, idJson);
  checkTranslationItem('it', itJson, itJson);
  checkTranslationItem('nl', nlJson, nlJson);
  checkTranslationItem('pl', plJson, plJson);
  checkTranslationItem('sr', srJson, srJson);
  checkTranslationItem('vi', viJson, viJson);
  checkTranslationItem('zh-CN', zhCnJson, zhCnJson);

  // Prints all current errors
  console.info(brokenTranslation);

  expect(false).toEqual(!!brokenBracesNumber);
});
