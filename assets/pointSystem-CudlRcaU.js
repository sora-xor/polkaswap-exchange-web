import{ab as c,f as y,ac as m,b as a}from"./index-BHqySXo4.js";const{IndexerType:i}=y;var $=(e=>(e.Swap="swap",e.PoolDeposit="poolDeposit",e.PoolWithdraw="poolWithdraw",e))($||{});const p=c`
  query BridgeQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          {
            or: [
              {
                and: [
                  { data: { contains: { to: $account } } }
                  { module: { equalTo: "bridgeMultisig" } }
                  { method: { equalTo: "asMulti" } }
                ]
              }
              {
                and: [
                  { address: { equalTo: $account } }
                  { module: { equalTo: "ethBridge" } }
                  { method: { equalTo: "transferToSidechain" } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          data
        }
      }
    }
  }
`,b=c`
  query BridgeQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          {
            OR: [
              {
                AND: [
                  { data_jsonContains: { to: $account } }
                  { module_eq: "bridgeMultisig" }
                  { method_eq: "asMulti" }
                ]
              }
              { AND: [{ address_eq: $account }, { module_eq: "ethBridge" }, { method_eq: "transferToSidechain" }] }
            ]
          }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          data
        }
      }
    }
  }
`,q=e=>{const t=e.data;return{amount:new a.FPNumber(t.amount),assetId:t.assetId,type:t.sidechainAddress?"outgoing":"incoming"}};async function A(e,t,n){const r=m(),o={start:e,end:t,account:n};switch(r.type){case i.SUBQUERY:return await r.services.explorer.fetchAllEntities(p,o,q)??[];case i.SUBSQUID:return await r.services.explorer.fetchAllEntitiesConnection(b,o,q)??[]}return[]}const S=e=>c`
  query CountQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          { address: { equalTo: $account } }
          ${e}
        ]
      }
    ) {
      totalCount
    }
  }
`,w=e=>c`
  query CountQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          { address_eq: $account }
          ${e}
        ]
      }
    ) {
      totalCount
    }
  }
`,x={[i.SUBQUERY]:{swap:'{ module: { equalTo: "liquidityProxy" } } { method: { equalTo: "swap" } }',poolDeposit:'{ module: { equalTo: "poolXYK" } } { method: { equalTo: "depositLiquidity" } }',poolWithdraw:'{ module: { equalTo: "poolXYK" } } { method: { equalTo: "withdrawLiquidity" } }'},[i.SUBSQUID]:{swap:'{ module_eq: "liquidityProxy" } { method_eq: "swap" }',poolDeposit:'{ module_eq: "poolXYK" } { method_eq: "depositLiquidity" }',poolWithdraw:'{ module_eq: "poolXYK" } { method_eq: "withdrawLiquidity" }'}};async function k(e,t,n,r){var l;const o=m(),d={start:e,end:t,account:n},s=(l=x[o.type])==null?void 0:l[r];switch(o.type){case i.SUBQUERY:{const u=await o.services.explorer.fetchEntities(S(s),d);return(u==null?void 0:u.totalCount)??0}case i.SUBSQUID:{const u=await o.services.explorer.fetchEntitiesConnection(w(s),d);return(u==null?void 0:u.totalCount)??0}}return 0}const I=c`
  query AccountMetaQuery($id: String = "") {
    data: accountMeta(id: $id) {
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
`;c`
  query AccountPointSystemsQuery($id: String = "", $after: Cursor) {
    data: accountPointSystems(orderBy: ID_ASC, after: $after, filter: { accountId: { equalTo: $id } }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          accountId
          version
          startedAtBlock
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
`;const g=e=>({amount:new a.FPNumber(e.amount),amountUSD:new a.FPNumber(e.amountUSD)}),f=e=>({created:new a.FPNumber(e.created),closed:new a.FPNumber(e.closed),amountUSD:new a.FPNumber(e.amountUSD)}),B=e=>{const{xorFees:t,xorBurned:n,xorStakingValRewards:r,orderBook:o,vault:d,governance:s,deposit:l}=e;return{fees:g(t),burned:g(n),staking:g(r),orderBook:f(o),kensetsu:f(d),governance:{votes:new a.FPNumber(s.votes),...g(s)},bridge:{incomingUSD:new a.FPNumber(l.incomingUSD),outgoingUSD:new a.FPNumber(l.outgoingUSD)}}},C=e=>{const{createdAtTimestamp:t,createdAtBlock:n}=e,r=Number(n);return{createdAt:{block:r,timestamp:Number(t)*1e3},points:[{version:1,startedAtBlock:r,...B(e)}]}};async function D(e){const t=m(),n={id:e};try{if(t.type===i.SUBQUERY){const o=await t.services.explorer.request(I,n);return o?C(o.data):null}return null}catch(r){return console.error(r),null}}export{$ as C,k as a,D as b,A as f};
