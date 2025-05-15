var b=Object.defineProperty;var q=(r,e,t)=>e in r?b(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var d=(r,e,t)=>q(r,typeof e!="symbol"?e+"":e,t);import{ab as l,ac as m,f as B,m as _,T as g,ad as y,h as f,g as S,C as k,l as v,j as C,n as x}from"./index-BHqySXo4.js";const{IndexerType:p}=B,P=r=>{const{open:e,close:t,low:s,high:o}=r.price;return[+e,+t,+s,+o]},I=r=>{const e=+r.timestamp*1e3,t=P(r),s=+r.volumeUSD;return{timestamp:e,price:t,volume:s}},w=(r,e)=>({orderBookId:{equalTo:r},type:{equalTo:e}}),O=(r,e)=>({orderBook:{id_eq:r},type_eq:e}),$=l`
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
`,A=l`
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
`;async function D(r,e,t,s){const o=m();let n;switch(o.type){case p.SUBQUERY:{const a=o,c={filter:w(r,e),first:t,after:s};n=await a.services.explorer.fetchEntities($,c);break}case p.SUBSQUID:{const a=o,c={where:O(r,e),first:t,after:s};n=await a.services.explorer.fetchEntitiesConnection(A,c);break}}return n?{...n,edges:n.edges.map(a=>({...a,node:I(a.node)}))}:null}var U=Object.defineProperty,T=Object.getOwnPropertyDescriptor,u=(r,e,t,s)=>{for(var o=s>1?void 0:s?T(e,t):e,n=r.length-1,a;n>=0;n--)(a=r[n])&&(o=(s?a(e,t,o):a(o))||o);return s&&o&&U(e,t,o),o};let i=class extends _(g){constructor(){super(...arguments);d(this,"baseAsset");d(this,"quoteAsset");d(this,"dexId")}get orderBookId(){return this.baseAsset&&this.quoteAsset?[this.dexId,this.baseAsset.address,this.quoteAsset.address].join("-"):null}get requestMethod(){return D}get requestSubscription(){const t=this.orderBookId;return t?async s=>await y(t,s,console.error):null}};u([f.orderBook.baseAsset],i.prototype,"baseAsset",2);u([f.orderBook.quoteAsset],i.prototype,"quoteAsset",2);u([S.orderBook.dexId],i.prototype,"dexId",2);i=u([k({components:{PriceChartWidget:v(C.PriceChartWidget)}})],i);var E=function(){var e=this,t=e._self._c;return e._self._setupProxy,t("price-chart-widget",e._b({staticClass:"order-book-chart",attrs:{"base-asset":e.baseAsset,"quote-asset":e.quoteAsset,"request-entity-id":e.orderBookId,"request-method":e.requestMethod,"request-subscription":e.requestSubscription,"is-available":""}},"price-chart-widget",e.$attrs,!1))},Q=[],W=x(i,E,Q,!1,null,null);const z=W.exports;export{z as default};
