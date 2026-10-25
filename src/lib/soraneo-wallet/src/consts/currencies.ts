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

export { CURRENCY_RATE_ENDPOINT as API_ENDPOINT } from '@/services/currency/rates';
