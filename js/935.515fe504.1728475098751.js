"use strict";(self.webpackChunkpolkaswap_exchange_web=self.webpackChunkpolkaswap_exchange_web||[]).push([[935,6543],{12274:function(e,t,r){r.r(t),r.d(t,{default:function(){return w}});var o=r(23166),s=r(97582),n=r(86424),i=r(89445),d=r(89334),a=(r(70560),r(99278)),u=r(37981),c=r(79934),l=r(74655);const{IndexerType:p}=n.WALLET_CONSTS,f=e=>1e3*e,h=c.Ps`
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
`,m=c.Ps`
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
`,B=e=>{const t="accountId"in e?e.accountId:e.account.id,r="orderBookId"in e?e.orderBookId:e.orderBook.id,[o,s,n]=r.split("-"),i=new u.FPNumber(e.amount),d=new u.FPNumber(e.amountFilled),c=i.sub(d);return{orderBookId:{dexId:Number(o),base:s,quote:n},owner:t,time:f(e.timestamp),side:(l=e.isBuy,l?a.PriceVariant.Buy:a.PriceVariant.Sell),price:new u.FPNumber(e.price),originalAmount:i,amount:c,id:e.orderId??0,lifespan:f(e.lifetime),expiresAt:f(e.expiresAt),status:e.status};var l};async function y(e,t){const r=(0,n.HZ)();switch(r.type){case p.SUBQUERY:{const o=((e,t)=>{const r={and:[{accountId:{equalTo:e}},{status:{notEqualTo:l.iF.Active}}]};if(t){const e=[t.dexId,t.base,t.quote].join("-");r.and.push({orderBookId:{equalTo:e}})}return r})(e,t),s={filter:o},n=r;return await n.services.explorer.fetchAllEntities(h,s,B)}case p.SUBSQUID:{const o=((e,t)=>{const r={account:{id_eq:e},status_not_eq:l.iF.Active};if(t){const e=[t.dexId,t.base,t.quote].join("-");r.orderBook={id_eq:e}}return r})(e,t),s={where:o},n=r;return await n.services.explorer.fetchAllEntitiesConnection(m,s,B)}}return null}var k=r(49053),A=r(81732);let I=class extends((0,i.Wr)(d.Z,n.tA.LoadingMixin,n.tA.FormattedAmountMixin)){constructor(...e){super(...e),(0,o.Z)(this,"filter",void 0),(0,o.Z)(this,"accountAddress",void 0),(0,o.Z)(this,"currentOrderBook",void 0),(0,o.Z)(this,"getAsset",void 0),(0,o.Z)(this,"orders",[])}mounted(){this.fetchData()}get filtered(){return this.filter!==l.wn.executed?this.orders:this.orders.filter((e=>e.status===l.iF.Filled))}async fetchData(){this.accountAddress&&await this.withLoading((async()=>{const e=await y(this.accountAddress,this.currentOrderBook?.orderBookId);this.orders=e??[]}))}};(0,s.gn)([(0,i.fI)({default:"",type:String})],I.prototype,"filter",void 0),(0,s.gn)([k.SB.wallet.account.address],I.prototype,"accountAddress",void 0),(0,s.gn)([k.Yn.orderBook.currentOrderBook],I.prototype,"currentOrderBook",void 0),(0,s.gn)([k.Yn.assets.assetDataByAddress],I.prototype,"getAsset",void 0),I=(0,s.gn)([(0,i.wA)({components:{OrderTable:A.default}})],I);var g=I,w=(0,r(1001).Z)(g,(function(){var e=this,t=e._self._c;e._self._setupProxy;return t("order-table",{attrs:{orders:e.filtered,"parent-loading":e.loading}})}),[],!1,null,null,null).exports}}]);