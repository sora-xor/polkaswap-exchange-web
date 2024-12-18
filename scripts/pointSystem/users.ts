import fs from 'fs';

import fetch from 'node-fetch';

const url = 'https://api.subquery.network/sq/sora-xor/sora-test';

const query = `
query AccountMetasQuery($after: Cursor) {
  data: accountMetas(after: $after) {
    pageInfo {
      hasNextPage,
      endCursor
    }
    nodes {
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
`;

const request = async (after: string = '', first = 100) => {
  const variables = { after, first };
  const body = JSON.stringify({
    query,
    variables,
  });

  console.info(`[Request] ${first} items after cursor "${after}"`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  const responseData = await response.json();

  return responseData.data.data;
};

const parseAccountMetaData = (item) => {
  const accountTimestamp = Number(item.createdAtTimestamp) * 1000;

  const account = item.id;
  const datetime = new Date(accountTimestamp).toISOString();
  const fees = Number(item.xorFees.amountUSD).toLocaleString();
  const burned = Number(item.xorBurned.amountUSD).toLocaleString();
  const staking = Number(item.xorStakingValRewards.amountUSD).toLocaleString();
  const orderbook = Number(item.orderBook.amountUSD).toLocaleString();
  const kensetsu = Number(item.vault.amountUSD).toLocaleString();
  const governance = Number(item.governance.amountUSD).toLocaleString();
  const deposit = (Number(item.deposit.incomingUSD) + Number(item.deposit.incomingUSD)).toLocaleString();

  return [account, datetime, fees, burned, staking, orderbook, kensetsu, governance, deposit];
};

/**
 * Convert a 2D array into a CSV string
 */
function arrayToCsv(data) {
  return data
    .map(
      (row) => row.join(';') // separator
    )
    .join('\r\n'); // rows starting on new lines
}

(async function main() {
  console.info(`[Main] Start collecting users`);

  let hasNextPage = true;
  let after = '';

  const tableData: any[] = [];

  while (hasNextPage) {
    const { pageInfo, nodes } = await request(after);

    hasNextPage = pageInfo.hasNextPage;
    after = pageInfo.endCursor;

    nodes.forEach((node) => {
      const row = parseAccountMetaData(node);

      tableData.push(row);
    });
  }

  console.info(`[Main] Users are collected. Total: ${tableData.length} items`);

  const tableHeader = [
    'account',
    'created',
    'fees',
    'burned',
    'staking',
    'orderbook',
    'kensetsu',
    'governance',
    'deposit',
  ];

  const table = [tableHeader].concat(tableData);

  const csv = arrayToCsv(table);

  const buildDir = './scripts/pointSystem/data';

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  fs.writeFileSync(`${buildDir}/users-${Date.now()}.csv`, csv);
})();
