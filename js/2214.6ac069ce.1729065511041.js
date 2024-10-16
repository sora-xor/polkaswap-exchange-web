"use strict";(self.webpackChunkpolkaswap_exchange_web=self.webpackChunkpolkaswap_exchange_web||[]).push([[2214],{22214:function(e,t,r){r.r(t),r.d(t,{default:function(){return w}});var s=r(23166),o=r(97582),i=r(89445),a=r(89334),n=r(68282),d=r(89383),u=r(86424),c=r(79934);const{IndexerType:p}=u.WALLET_CONSTS,l=e=>{const t=1e3*+e.timestamp,r=(e=>{const{open:t,close:r,low:s,high:o}=e.price;return[+t,+r,+s,+o]})(e);return{timestamp:t,price:r,volume:+e.volumeUSD}},h=c.Ps`
  query SubqueryOrderBookPriceQuery($after: Cursor, $filter: OrderBookSnapshotFilter, $first: Int = 100) {
    data: orderBookSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          price
          timestamp
          volumeUSD
        }
      }
    }
  }
`,f=c.Ps`
  query SubsquidOrderBookPriceQuery($after: String, $where: OrderBookSnapshotWhereInput, $first: Int = 100) {
    data: orderBookSnapshotsConnection(after: $after, first: $first, where: $where, orderBy: timestamp_DESC) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          price {
            close
            high
            low
            open
          }
          timestamp
          volumeUSD
        }
      }
    }
  }
`;async function g(e,t,r,s){const o=(0,u.HZ)();let i;switch(o.type){case p.SUBQUERY:{const a=o,n=((e,t)=>({orderBookId:{equalTo:e},type:{equalTo:t}}))(e,t),d={filter:n,first:r,after:s};i=await a.services.explorer.fetchEntities(h,d);break}case p.SUBSQUID:{const a=o,n=((e,t)=>({orderBook:{id_eq:e},type_eq:t}))(e,t),d={where:n,first:r,after:s};i=await a.services.explorer.fetchEntitiesConnection(f,d);break}}return i?{...i,edges:i.edges.map((e=>({...e,node:l(e.node)})))}:null}var k=r(69781),q=r(49053);let b=class extends((0,i.Wr)(a.Z)){constructor(...e){super(...e),(0,s.Z)(this,"baseAsset",void 0),(0,s.Z)(this,"quoteAsset",void 0),(0,s.Z)(this,"dexId",void 0)}get orderBookId(){return this.baseAsset&&this.quoteAsset?[this.dexId,this.baseAsset.address,this.quoteAsset.address].join("-"):null}get requestMethod(){return g}get requestSubscription(){const e=this.orderBookId;return e?async t=>await(0,d.j)(e,t,console.error):null}};(0,o.gn)([q.Yn.orderBook.baseAsset],b.prototype,"baseAsset",void 0),(0,o.gn)([q.Yn.orderBook.quoteAsset],b.prototype,"quoteAsset",void 0),(0,o.gn)([q.SB.orderBook.dexId],b.prototype,"dexId",void 0),b=(0,o.gn)([(0,i.wA)({components:{PriceChartWidget:(0,k.kF)(n.z8.PriceChartWidget)}})],b);var S=b,w=(0,r(1001).Z)(S,(function(){var e=this,t=e._self._c;e._self._setupProxy;return t("price-chart-widget",e._b({staticClass:"order-book-chart",attrs:{"base-asset":e.baseAsset,"quote-asset":e.quoteAsset,"request-entity-id":e.orderBookId,"request-method":e.requestMethod,"request-subscription":e.requestSubscription,"is-available":""}},"price-chart-widget",e.$attrs,!1))}),[],!1,null,null,null).exports}}]);