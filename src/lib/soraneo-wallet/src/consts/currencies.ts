import { Currency, type CurrencyFields } from '@/types/currency';

export const DaiCurrency = { key: Currency.DAI, name: 'Dai', symbol: '$' };

export const Currencies = [
  DaiCurrency,
  { key: Currency.USD, name: 'US Dollar', symbol: '$' },
  { key: Currency.XOR, name: 'SORA', symbol: 'XOR' },
  { key: Currency.AED, name: 'United Arab Emirates Dirham', symbol: 'د.إ' },
  { key: Currency.ARS, name: 'Argentine Peso', symbol: 'ARS$' },
  { key: Currency.AUD, name: 'Australian Dollar', symbol: 'AU$' },
  { key: Currency.BDT, name: 'Bangladeshi Taka', symbol: '৳' },
  { key: Currency.BHD, name: 'Bahraini Dinar', symbol: '.د.ب' },
  { key: Currency.BMD, name: 'Bermudian Dollar', symbol: 'BD$' },
  { key: Currency.GBP, name: 'British Pound Sterling', symbol: '£' },
  { key: Currency.BRL, name: 'Brazil Real', symbol: 'R$' },
  { key: Currency.CAD, name: 'Canadian Dollar', symbol: 'CA$' },
  { key: Currency.CHF, name: 'Switzerland Franc', symbol: 'F' },
  { key: Currency.CLP, name: 'Chilean Peso', symbol: 'CLP$' },
  { key: Currency.CNY, name: 'Chinese yuan', symbol: 'CN¥' },
  { key: Currency.CZK, name: 'Czech Koruna', symbol: 'Kč' },
  { key: Currency.DKK, name: 'Denmark Krone', symbol: 'kr.' },
  { key: Currency.EUR, name: 'Euro', symbol: '€' },
  { key: Currency.GEL, name: 'Georgian Lari', symbol: '₾' },
  { key: Currency.HKD, name: 'Hong Kong Dollar', symbol: 'HK$' },
  { key: Currency.HUF, name: 'Hungarian Forint', symbol: 'Ft' },
  { key: Currency.IDR, name: 'Indonesian Rupiah', symbol: 'Rp' },
  { key: Currency.ILS, name: 'Israel New Shekel', symbol: '₪' },
  { key: Currency.INR, name: 'Indian Rupee', symbol: '₹' },
  { key: Currency.JPY, name: 'Japanese Yen', symbol: '¥' },
  { key: Currency.KRW, name: 'South Korean Won', symbol: '₩' },
  { key: Currency.KWD, name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { key: Currency.LKR, name: 'Sri Lankan Rupee', symbol: '₨' },
  { key: Currency.MMK, name: 'Myanmar Kyat', symbol: 'K' },
  { key: Currency.MXN, name: 'Mexican Peso', symbol: 'MX$' },
  { key: Currency.MYR, name: 'Malaysian Ringgit', symbol: 'RM' },
  { key: Currency.NGN, name: 'Nigerian Naira', symbol: '₦' },
  { key: Currency.NOK, name: 'Norwegian Krone', symbol: 'kr' },
  { key: Currency.NZD, name: 'New Zealand Dollar', symbol: 'NZ$' },
  { key: Currency.PHP, name: 'Philippine Pesso', symbol: '₱' },
  { key: Currency.PKR, name: 'Pakistani Rupee', symbol: '₨.' },
  { key: Currency.PLN, name: 'Polish Zloty', symbol: 'zł' },
  { key: Currency.RUB, name: 'Russian Ruble', symbol: '₽' },
  { key: Currency.SAR, name: 'Saudi Riyal', symbol: 'ر.س' },
  { key: Currency.SEK, name: 'Swedish Krona', symbol: 'kr' },
  { key: Currency.SGD, name: 'Singapore Dollar', symbol: 'S$' },
  { key: Currency.TRY, name: 'Turkish Lira', symbol: '₺' },
  { key: Currency.THB, name: 'Thai Baht', symbol: '฿' },
  { key: Currency.TWD, name: 'New Taiwan Dollar', symbol: 'NT$' },
  { key: Currency.UAH, name: 'Ukrainian hryvnia', symbol: '₴' },
  { key: Currency.VEF, name: 'Venezuelan bolivar fuente', symbol: 'Bs.F.' },
  { key: Currency.VND, name: 'Vietnamese dong', symbol: '₫' },
  { key: Currency.XAG, name: 'Silver', symbol: 'XAG' },
  { key: Currency.XAU, name: 'Gold', symbol: 'XAU' },
  { key: Currency.ZAR, name: 'South African Rand', symbol: 'R' },
] as Array<CurrencyFields>;

export function getCurrenciesState(isServiceUp: boolean): Array<CurrencyFields> {
  const disabled = !isServiceUp;

  return Currencies.map((currency: CurrencyFields) => {
    if ([DaiCurrency.key, Currency.XOR].includes(currency.key)) {
      return { ...currency, disabled: false };
    }
    return { ...currency, disabled };
  });
}

export const API_ENDPOINT =
  'https://api.coingecko.com/api/v3/simple/price?ids=dai&vs_currencies=btc%2Ceth%2Cusd%2Caed%2Cars%2Caud%2Cbdt%2Cbhd%2Cbmd%2Cbrl%2Ccad%2Cchf%2Cclp%2Ccny%2Cczk%2Cdkk%2Ceur%2Cgbp%2Cgel%2Chkd%2Chuf%2Cidr%2Cils%2Cinr%2Cjpy%2Ckrw%2Ckwd%2Clkr%2Cmmk%2Cmxn%2Cmyr%2Cngn%2Cnok%2Cnzd%2Cphp%2Cpkr%2Cpln%2Crub%2Csar%2Csek%2Csgd%2Cthb%2Ctry%2Ctwd%2Cuah%2Cvef%2Cvnd%2Czar%2Cxdr%2Cxag%2Cxau';
