import fs from 'fs';

import { FPNumber } from '@sora-substrate/math';
import fetch from 'node-fetch';

FPNumber.DELIMITERS_CONFIG = {
  thousand: '',
  decimal: ',',
};

const xor = '0x0200000000000000000000000000000000000000000000000000000000000000';
const kusd = '0x02000c0000000000000000000000000000000000000000000000000000000000';

const blockchainWSUrl = 'wss://mof3.sora.org';
const indexerUrl = 'https://api.subquery.network/sq/sora-xor/sora-prod';

const ROW_DELIMETER = '\r\n';
const CELL_DELIMETER = ';';

function getRpcEndpoint(wsEndpoint: string): string {
  return wsEndpoint.replace(/^ws(s)?:\/\/(ws)?/, (_, p1, p2) => {
    let str = 'http';
    if (p1) str += p1;
    str += '://';
    if (p2) str += 'rpc';
    return str;
  });
}

function formatAmount(value: FPNumber | number | string): string {
  let amount!: FPNumber;

  if (!(value instanceof FPNumber)) {
    amount = new FPNumber(value);
  } else {
    amount = value;
  }

  return amount.dp(2).toString().replace(/\./g, ',');
}

async function delay(ms = 1000) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestIndexer(requestArgs: { query: string; variables: any; operationName: string }) {
  await delay(200);

  const body = JSON.stringify(requestArgs);

  console.info(`[Indexer Request] operationName: "${requestArgs.operationName}"`);

  const response = await fetch(indexerUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const error = (await response.json()) as any;

    console.info(`[Indexer Response Status] ${response.status} ${response.statusText}`);
    console.info(`[Indexer Error] ${error.message}`);

    if (response.status === 502) {
      return await requestIndexer(requestArgs);
    } else {
      throw new Error('Indexer error not processed');
    }
  } else {
    const responseData = await response.json();
    const responsePayload = responseData.data.data;

    return responsePayload;
  }
}

const metaQuery = `
query AccountMetasQuery($after: Cursor, $filter: AccountMetaFilter) {
  data: accountMetas(after: $after, filter: $filter, orderBy: [CREATED_AT_BLOCK_ASC, ID_ASC]) {
    pageInfo {
      hasNextPage,
      endCursor
    }
    edges {
      cursor
      node {
        id
        createdAtTimestamp
        createdAtBlock
        xorFees
        xorBurned
        xorStakingValRewards
        orderBook
        vault
        governance
        deposit
      }
    }
  }
}
`;

const referralsQuery = `
query ReferrerRewardsQuery($first: Int = 100, $filter: ReferrerRewardFilter, $after: Cursor = "") {
  data: referrerRewards(first: $first, filter: $filter, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        referral
        amount
      }
    }
  }
}`;

const requestReferralRewards = async (accountId: string) => {
  const filter = { referrer: { equalTo: accountId } };

  let hasNextPage = true;
  let after = '';

  let total = FPNumber.ZERO;

  while (hasNextPage) {
    const variables = { filter, after };
    const { pageInfo, edges } = await requestIndexer({
      operationName: 'ReferrerRewardsQuery',
      query: referralsQuery,
      variables,
    });

    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;

    for (const { node } of edges) {
      const amount = FPNumber.fromCodecValue(node.amount);
      total = total.add(amount);
    }
  }

  return formatAmount(total);
};

const poolTokensPriceQuery = `
query PoolTokensPrice($first: Int = 100, $after: Cursor = "") {
  data: poolXYKs(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        poolTokenPriceUSD
      }
    }
  }
}
`;

const requestPoolTokensPrices = async () => {
  let hasNextPage = true;
  let after = '';

  const prices: Record<string, FPNumber> = {};

  while (hasNextPage) {
    const variables = { after };
    const { pageInfo, edges } = await requestIndexer({
      operationName: 'PoolTokensPrice',
      query: poolTokensPriceQuery,
      variables,
    });

    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;

    for (const { node } of edges) {
      const poolId = node.id;
      const value = new FPNumber(node.poolTokenPriceUSD);
      const price = value.isFinity() && !value.isNaN() ? value : FPNumber.ZERO;

      prices[poolId] = price;
    }
  }

  return prices;
};

const accountLiquiditiesQuery = `
query AccountLiquidities($first: Int = 100, $after: Cursor = "", $filter: AccountLiquidityFilter) {
  data: accountLiquidities(first: $first, after: $after, filter: $filter) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      cursor
      node {
        poolId
        poolTokens
      }
    }
  }
}
`;

const requestAccountLiquiditiesAmount = async (accountId: string, prices: any) => {
  let hasNextPage = true;
  let after = '';

  let total = FPNumber.ZERO;

  while (hasNextPage) {
    const filter = { accountId: { equalTo: accountId } };
    const variables = { after, filter };
    const { pageInfo, edges } = await requestIndexer({
      operationName: 'AccountLiquidities',
      query: accountLiquiditiesQuery,
      variables,
    });

    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;

    for (const { node } of edges) {
      const poolId = node.poolId;
      const value = FPNumber.fromCodecValue(node.poolTokens);
      const poolTokens = value.isFinity() && !value.isNaN() ? value : FPNumber.ZERO;

      if (poolId in prices && !poolTokens.isZero()) {
        const amountUSD = poolTokens.mul(prices[poolId]);

        total = total.add(amountUSD);
      }
    }
  }

  return formatAmount(total);
};

const requestAssetBalance = async (accountId: string, assetId: string) => {
  const rpc = getRpcEndpoint(blockchainWSUrl);

  const body = JSON.stringify({
    id: 1,
    jsonrpc: '2.0',
    method: 'assets_freeBalance',
    params: [accountId, assetId],
  });

  const response = await fetch(rpc, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  const responseData = await response.json();

  const balance = FPNumber.fromCodecValue(responseData.result.balance);

  return formatAmount(balance);
};

const parseAccountMetaData = (item) => {
  const accountTimestamp = Number(item.createdAtTimestamp) * 1000;

  const account = item.id;
  const datetime = new Date(accountTimestamp).toISOString();
  const fees = formatAmount(item.xorFees.amountUSD);
  const burned = formatAmount(item.xorBurned.amountUSD);
  const staking = formatAmount(item.xorStakingValRewards.amountUSD);
  const orderbook = formatAmount(item.orderBook.amountUSD);
  const kensetsu = formatAmount(item.vault.amountUSD);
  const governance = formatAmount(item.governance.amountUSD);
  const deposit = formatAmount(new FPNumber(item.deposit.incomingUSD).add(new FPNumber(item.deposit.incomingUSD)));

  return [account, datetime, fees, burned, staking, orderbook, kensetsu, governance, deposit];
};

function formatRow(data: string[]) {
  return data.join(CELL_DELIMETER).concat(ROW_DELIMETER);
}

(async function main() {
  const buildDir = './scripts/pointSystem/data';

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  const csvPath = `${buildDir}/users.csv`;

  const continueWrite = fs.existsSync(csvPath);

  const append = (data: string) => fs.appendFileSync(csvPath, data);

  const tableHeader = [
    'Cursor (Indexer)',
    'Account (ID)',
    'Created at (Date)',
    'XOR Fees (USD)',
    'XOR Burned (USD)',
    'VAL staking rewards (USD)',
    'Orderbook volume (USD)',
    'Kensetsu repaid (USD)',
    'Governance (USD)',
    'Bridge (USD)',
    'XOR Hold (Amount)',
    'KUSD Hold (Amount)',
    'Referral rewards (XOR)',
    'Luquidities (USD)',
  ];

  if (!continueWrite) {
    append(formatRow(tableHeader));
  }

  let hasNextPage = true;
  let after = '';

  if (continueWrite) {
    const text = fs.readFileSync(csvPath, { encoding: 'utf8', flag: 'r' });
    const rows = text.split(ROW_DELIMETER);
    const lastRow = rows[rows.length - 2]; // file has row delimeter at the end, so lat item is empty after split
    const cells = lastRow.split(CELL_DELIMETER);

    after = cells[0];
  }

  console.info(`[Main] Start collecting users`);

  const poolTokensPrices = await requestPoolTokensPrices();

  while (hasNextPage) {
    const variables = { after, filter: undefined };
    const { pageInfo, edges } = await requestIndexer({
      operationName: 'AccountMetasQuery',
      query: metaQuery,
      variables,
    });

    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;

    for (const { cursor, node } of edges) {
      const meta = parseAccountMetaData(node);
      const accountId = meta[0];

      const row: string[] = [];
      row.push(cursor, ...meta);

      const xorBalance = await requestAssetBalance(accountId, xor);
      row.push(xorBalance);
      const kusdBalance = await requestAssetBalance(accountId, kusd);
      row.push(kusdBalance);
      const referralRewards = await requestReferralRewards(accountId);
      row.push(referralRewards);
      const liquidities = await requestAccountLiquiditiesAmount(accountId, poolTokensPrices);
      row.push(liquidities);

      append(formatRow(row));

      console.info(`[Main] Processed user: "${accountId}"`);
    }
  }

  console.info(`[Main] Users are collected`);
})();
