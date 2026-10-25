import { packageInfo as sharedInfo } from '@polkadot/ui-shared/packageInfo';
import { detectPackage } from '@polkadot/util';
import { packageInfo } from './packageInfo.js';
detectPackage(packageInfo, null, [sharedInfo]);
