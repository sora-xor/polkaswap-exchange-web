import * as enJson from '../../../src/lang/en.json';
import * as ruJson from '../../../src/lang/ru.json';
import * as csJson from '../../../src/lang/cs.json';
import * as deJson from '../../../src/lang/de.json';
import * as esJson from '../../../src/lang/es.json';
import * as frJson from '../../../src/lang/fr.json';
import * as hrJson from '../../../src/lang/hr.json';
import * as huJson from '../../../src/lang/hu.json';
import * as hyJson from '../../../src/lang/hy.json';
import * as idJson from '../../../src/lang/id.json';
import * as itJson from '../../../src/lang/it.json';
import * as nlJson from '../../../src/lang/nl.json';
import * as noJson from '../../../src/lang/no.json';
import * as plJson from '../../../src/lang/pl.json';
import * as skJson from '../../../src/lang/sk.json';
import * as srJson from '../../../src/lang/sr.json';
import * as svJson from '../../../src/lang/sv.json';
import * as viJson from '../../../src/lang/vi.json';
import * as yoJson from '../../../src/lang/yo.json';
import * as zhCnJson from '../../../src/lang/zh_CN.json';

import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

const TranslationConsts = WALLET_CONSTS.TranslationConsts;

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

describe('Translation tests', () => {
  test('Translation constants check and fix', () => {
    // Some items have translations, but they should be in en only (SORA, XYK, Polkaswap for ex.).
    let brokenConstsNumber = 0;
    const checkConstTranslation = (
      constKey: string,
      translation: string,
      lang: string,
      translationKeys: Array<string>
    ) => {
      const constValue = TranslationConsts[constKey];
      const indexOfKey = translation.indexOf(constValue);
      if (indexOfKey !== -1) {
        brokenConstsNumber++;

        const endIndexOfKey = indexOfKey + constValue.length;
        let newValue = '';
        if (translation.charAt(endIndexOfKey) === '.') {
          newValue = `${translation.substring(0, indexOfKey)}@:(${constKey}).${translation.substring(
            endIndexOfKey + 1
          )}`;
        } else {
          newValue = `${translation.substring(0, indexOfKey)}@:${constKey}|{${constKey}}${translation.substring(
            endIndexOfKey
          )}`;
        }
        generateErrorLog(
          `${constValue} instead of @:${constKey}|{${constKey}}`,
          translation,
          newValue,
          lang,
          translationKeys
        );
      }

      translationKeys.pop();
    };

    const checkTranslationItem = (
      lang: string,
      initTranslationJson: any,
      translationJson: any,
      constKey: string,
      translationKeys: Array<string> = []
    ) => {
      for (const translationKey of Object.keys(translationJson)) {
        const translation = translationJson[translationKey];
        translationKeys.push(translationKey);
        // The translation file can have different levels of nested strustures, we should work with translation value only (go deeper if needed)
        if (typeof translation === 'string') {
          checkConstTranslation(constKey, translationJson[translationKey], lang, translationKeys);
        } else {
          checkTranslationItem(lang, initTranslationJson, translation, constKey, translationKeys);
          translationKeys.pop();
        }
      }
    };

    // for (const constKey in TranslationConsts) {
    //   checkTranslationItem('en', enJson, enJson, constKey);
    //   checkTranslationItem('ru', ruJson, ruJson, constKey);
    //   checkTranslationItem('cs', csJson, csJson, constKey);
    //   checkTranslationItem('de', deJson, deJson, constKey);
    //   checkTranslationItem('es', esJson, esJson, constKey);
    //   checkTranslationItem('fr', frJson, frJson, constKey);
    //   checkTranslationItem('hr', hrJson, hrJson, constKey);
    //   checkTranslationItem('hu', huJson, huJson, constKey);
    //   checkTranslationItem('hy', hyJson, hyJson, constKey);
    //   checkTranslationItem('id', idJson, idJson, constKey);
    //   checkTranslationItem('it', itJson, itJson, constKey);
    //   checkTranslationItem('nl', nlJson, nlJson, constKey);
    //   checkTranslationItem('no', noJson, noJson, constKey);
    //   checkTranslationItem('pl', plJson, plJson, constKey);
    //   checkTranslationItem('sk', skJson, skJson, constKey);
    //   checkTranslationItem('sr', srJson, srJson, constKey);
    //   checkTranslationItem('sv', svJson, svJson, constKey);
    //   checkTranslationItem('vi', viJson, viJson, constKey);
    //   checkTranslationItem('yo', yoJson, yoJson, constKey);
    //   checkTranslationItem('zh-CN', zhCnJson, zhCnJson, constKey);
    // }

    expect(false).toEqual(!!brokenConstsNumber);
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

  checkTranslationItem('en', enJson, enJson);
  checkTranslationItem('ru', ruJson, ruJson);
  checkTranslationItem('cs', csJson, csJson);
  checkTranslationItem('de', deJson, deJson);
  checkTranslationItem('es', esJson, esJson);
  checkTranslationItem('fr', frJson, frJson);
  checkTranslationItem('hr', hrJson, hrJson);
  checkTranslationItem('hu', huJson, huJson);
  checkTranslationItem('hy', hyJson, hyJson);
  checkTranslationItem('id', idJson, idJson);
  checkTranslationItem('it', itJson, itJson);
  checkTranslationItem('nl', nlJson, nlJson);
  checkTranslationItem('no', noJson, noJson);
  checkTranslationItem('pl', plJson, plJson);
  checkTranslationItem('sk', skJson, skJson);
  checkTranslationItem('sr', srJson, srJson);
  checkTranslationItem('sv', svJson, svJson);
  checkTranslationItem('vi', viJson, viJson);
  checkTranslationItem('yo', yoJson, yoJson);
  checkTranslationItem('zh-CN', zhCnJson, zhCnJson);

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
  checkTranslationItem('hr', hrJson, hrJson);
  checkTranslationItem('hu', huJson, huJson);
  checkTranslationItem('hy', hyJson, hyJson);
  checkTranslationItem('id', idJson, idJson);
  checkTranslationItem('it', itJson, itJson);
  checkTranslationItem('nl', nlJson, nlJson);
  checkTranslationItem('no', noJson, noJson);
  checkTranslationItem('pl', plJson, plJson);
  checkTranslationItem('sk', skJson, skJson);
  checkTranslationItem('sr', srJson, srJson);
  checkTranslationItem('sv', svJson, svJson);
  checkTranslationItem('vi', viJson, viJson);
  checkTranslationItem('yo', yoJson, yoJson);
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
  checkTranslationItem('hr', hrJson, hrJson);
  checkTranslationItem('hu', huJson, huJson);
  checkTranslationItem('hy', hyJson, hyJson);
  checkTranslationItem('id', idJson, idJson);
  checkTranslationItem('it', itJson, itJson);
  checkTranslationItem('nl', nlJson, nlJson);
  checkTranslationItem('no', noJson, noJson);
  checkTranslationItem('pl', plJson, plJson);
  checkTranslationItem('sk', skJson, skJson);
  checkTranslationItem('sr', srJson, srJson);
  checkTranslationItem('sv', svJson, svJson);
  checkTranslationItem('vi', viJson, viJson);
  checkTranslationItem('yo', yoJson, yoJson);
  checkTranslationItem('zh-CN', zhCnJson, zhCnJson);

  // Prints all current errors
  console.info(brokenTranslation);

  expect(false).toEqual(!!brokenBracesNumber);
});
