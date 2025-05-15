var x=Object.defineProperty;var A=(e,r,t)=>r in e?x(e,r,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[r]=t;var u=(e,r,t)=>A(e,typeof r!="symbol"?r+"":r,t);import{ab as I,ac as _,f as q,b as c,ae as f,m as g,T as w,$ as y,g as k,h as O,C as v,P,n as F}from"./index-BHqySXo4.js";import{O as p,F as S}from"./orderBook-BNMMkkrL.js";import C from"./OrderTable-0VvzHYYp.js";import"./ScrollableTableMixin-C9crfC47.js";const{IndexerType:m}=q,$=e=>e?f.PriceVariant.Buy:f.PriceVariant.Sell,l=e=>e*1e3,T=I`
  query SubqueryAccountOrdersQuery($after: Cursor, $filter: OrderBookOrderFilter) {
    data: orderBookOrders(orderBy: TIMESTAMP_DESC, after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          type
          orderId
          orderBookId
          accountId
          timestamp
          isBuy
          price
          amount
          amountFilled
          lifetime
          expiresAt
          status
        }
      }
    }
  }
`,D=I`
  query SubsquidAccountOrdersQuery($after: Cursor, $where: OrderBookOrderWhereInput) {
    data: orderBookOrdersConnection(orderBy: timestamp_DESC, after: $after, where: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          type
          orderId
          orderBook {
            id
          }
          account {
            id
          }
          timestamp
          isBuy
          price
          amount
          amountFilled
          lifetime
          expiresAt
          status
        }
      }
    }
  }
`,B=e=>{const r="accountId"in e?e.accountId:e.account.id,t="orderBookId"in e?e.orderBookId:e.orderBook.id,[s,o,a]=t.split("-"),n=new c.FPNumber(e.amount),b=new c.FPNumber(e.amountFilled),h=n.sub(b);return{orderBookId:{dexId:Number(s),base:o,quote:a},owner:r,time:l(e.timestamp),side:$(e.isBuy),price:new c.FPNumber(e.price),originalAmount:n,amount:h,id:e.orderId??0,lifespan:l(e.lifetime),expiresAt:l(e.expiresAt),status:e.status}},E=(e,r)=>{const t={and:[{accountId:{equalTo:e}},{status:{notEqualTo:p.Active}}]};if(r){const s=[r.dexId,r.base,r.quote].join("-");t.and.push({orderBookId:{equalTo:s}})}return t},N=(e,r)=>{const t={account:{id_eq:e},status_not_eq:p.Active};if(r){const s=[r.dexId,r.base,r.quote].join("-");t.orderBook={id_eq:s}}return t};async function Q(e,r){const t=_();switch(t.type){case m.SUBQUERY:{const o={filter:E(e,r)};return await t.services.explorer.fetchAllEntities(T,o,B)}case m.SUBSQUID:{const o={where:N(e,r)};return await t.services.explorer.fetchAllEntitiesConnection(D,o,B)}}return null}var M=Object.defineProperty,j=Object.getOwnPropertyDescriptor,i=(e,r,t,s)=>{for(var o=s>1?void 0:s?j(r,t):r,a=e.length-1,n;a>=0;a--)(n=e[a])&&(o=(s?n(r,t,o):n(o))||o);return s&&o&&M(r,t,o),o};let d=class extends g(w,y.LoadingMixin,y.FormattedAmountMixin){constructor(){super(...arguments);u(this,"filter");u(this,"accountAddress");u(this,"currentOrderBook");u(this,"getAsset");u(this,"orders",[])}mounted(){this.fetchData()}get filtered(){return this.filter!==S.executed?this.orders:this.orders.filter(r=>r.status===p.Filled)}async fetchData(){this.accountAddress&&await this.withLoading(async()=>{var t;const r=await Q(this.accountAddress,(t=this.currentOrderBook)==null?void 0:t.orderBookId);this.orders=r??[]})}};i([P({default:"",type:String})],d.prototype,"filter",2);i([k.wallet.account.address],d.prototype,"accountAddress",2);i([O.orderBook.currentOrderBook],d.prototype,"currentOrderBook",2);i([O.assets.assetDataByAddress],d.prototype,"getAsset",2);d=i([v({components:{OrderTable:C}})],d);var U=function(){var r=this,t=r._self._c;return r._self._setupProxy,t("order-table",{attrs:{orders:r.filtered,"parent-loading":r.loading}})},L=[],R=F(d,U,L,!1,null,null);const H=R.exports;export{H as default};
