var A=Object.defineProperty;var V=(a,t,e)=>t in a?A(a,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):a[t]=e;var n=(a,t,e)=>V(a,typeof t!="symbol"?t+"":t,e);import{ab as _,ac as x,f as C,b as I,m as E,T as P,i5 as r,P as h,O as D,g as q,W as w,C as T,_ as B,n as H}from"./index-BHqySXo4.js";import{I as $}from"./IndexerDataFetchMixin-BNoOn5g-.js";const{IndexerType:b}=C,k=_`
  query VaultDetailsQuery($first: Int = null, $offset: Int = null, $filter: VaultEventFilter) {
    data: vaultEvents(first: $first, offset: $offset, filter: $filter, orderBy: [TIMESTAMP_DESC, ID_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          id
          amount
          type
          timestamp
        }
      }
    }
  }
`,O=_`
  query VaultDetailsQuery($first: Int = null, $offset: Int = null, $filter: VaultEventWhereInput) {
    info: vaultEventsConnection(first: 0, where: $filter, orderBy: [timestamp_DESC, id_DESC]) {
      totalCount
    }
    nodes: vaultEvents(limit: $first, offset: $offset, where: $filter, orderBy: [timestamp_DESC, id_DESC]) {
      id
      amount
      type
      timestamp
    }
  }
`,g=(a,t)=>{const e={vaultId:{equalTo:String(a)}};return t&&(e.timestamp={greaterThan:t}),e},v=a=>({amount:a.amount?new I.FPNumber(a.amount):null,timestamp:a.timestamp*1e3,type:a.type});async function z(a){const t=x(),{id:e,first:s,offset:i,fromTimestamp:d}=a;let o=0,p=[];if(!e)return{totalCount:o,items:p};switch(t.type){case b.SUBQUERY:{const m=g(e,d),y={first:s,offset:i,filter:m},u=await t.services.explorer.fetchEntities(k,y);u&&(o=u.totalCount,p=u.edges.map(f=>v(f.node)));break}case b.SUBSQUID:{const m=g(e,d),y={first:s,offset:i,filter:m},u=await t.services.explorer.fetchEntities(O,y);u&&(o=u.totalCount,p=u.nodes.map(f=>v(f)));break}}return{totalCount:o,items:p}}var F=Object.defineProperty,M=Object.getOwnPropertyDescriptor,c=(a,t,e,s)=>{for(var i=s>1?void 0:s?M(t,e):t,d=a.length-1,o;d>=0;d--)(o=a[d])&&(i=(s?o(t,e,i):o(i))||i);return s&&i&&F(t,e,i),i};let l=class extends E(P,$){constructor(){super(...arguments);n(this,"HiddenValue",C.HiddenValue);n(this,"DateFormat","ll LT");n(this,"id");n(this,"lockedAsset");n(this,"debtAsset");n(this,"shouldBalanceBeHidden");n(this,"pageAmount",5)}async updateHistory(e,s){this.checkTriggerUpdate(e,s)}get lockedAssetSymbol(){var e;return((e=this.lockedAsset)==null?void 0:e.symbol)??""}get debtAssetSymbol(){var e;return((e=this.debtAsset)==null?void 0:e.symbol)??""}get dataVariables(){return{id:this.id,first:this.pageAmount,offset:this.pageAmount*(this.currentPage-1)}}get updateVariables(){return{id:this.id,fromTimestamp:this.intervalTimestamp}}getItemTimestamp(e){return(e==null?void 0:e.timestamp)??0}async requestData(e){return await z(e)}getTitle(e){switch(e){case r.Created:return this.t("operations.CreateVault");case r.Closed:return this.t("operations.CloseVault");case r.DebtIncreased:return this.t("operations.BorrowVaultDebt");case r.CollateralDeposit:return this.t("operations.DepositCollateral");case r.DebtPayment:return this.t("operations.RepayVaultDebt");case r.Liquidated:return this.t("kensetsu.liquidated");default:return""}}getAmount(e,s){var i;return e?this.HiddenValue:((i=s.amount)==null?void 0:i.toLocaleString())??""}getOperationMessage(e){const s=this.shouldBalanceBeHidden;switch(e.type){case r.Created:return this.t("operations.finalized.CreateVault",{symbol:this.debtAssetSymbol,symbol2:this.lockedAssetSymbol});case r.Closed:return this.t("operations.finalized.CloseVault",{symbol:this.debtAssetSymbol,symbol2:this.lockedAssetSymbol});case r.DebtIncreased:return this.t("operations.finalized.BorrowVaultDebt",{symbol:this.debtAssetSymbol,amount:this.getAmount(s,e)});case r.CollateralDeposit:return this.t("operations.finalized.DepositCollateral",{symbol:this.lockedAssetSymbol,amount:this.getAmount(s,e)});case r.DebtPayment:return this.t("operations.finalized.RepayVaultDebt",{symbol:this.debtAssetSymbol,amount:this.getAmount(s,e)});case r.Liquidated:return this.t("kensetsu.liquidatedMessage",{symbol:this.lockedAssetSymbol,amount:this.getAmount(s,e)});default:return""}}};c([h({default:void 0,type:Number})],l.prototype,"id",2);c([h({default:D,type:Object})],l.prototype,"lockedAsset",2);c([h({default:D,type:Object})],l.prototype,"debtAsset",2);c([q.wallet.settings.shouldBalanceBeHidden],l.prototype,"shouldBalanceBeHidden",2);c([w("id",{immediate:!0})],l.prototype,"updateHistory",1);l=c([T({components:{HistoryPagination:B.HistoryPagination}})],l);var Q=function(){var t=this,e=t._self._c;return t._self._setupProxy,e("s-card",{staticClass:"details-history",attrs:{"border-radius":"small",size:"big",primary:""},scopedSlots:t._u([{key:"header",fn:function(){return[e("h4",[t._v(t._s(t.$t("kensetsu.positionHistory")))])]},proxy:!0}])},[t.hasItems?[e("div",{directives:[{name:"loading",rawName:"v-loading",value:t.loadingState,expression:"loadingState"}],staticClass:"details-history__items s-flex-column"},t._l(t.items,function(s,i){return e("div",{key:i,staticClass:"history-item s-flex-column"},[e("div",{staticClass:"history-item-info s-flex"},[e("div",{staticClass:"history-item-operation ch3",attrs:{"data-type":s.type}},[t._v(t._s(t.getTitle(s.type)))]),e("div",{staticClass:"history-item-title p4"},[t._v(t._s(t.getOperationMessage(s)))])]),e("div",{staticClass:"history-item-date"},[t._v(t._s(t.formatDate(s.timestamp,t.DateFormat)))])])}),0),e("history-pagination",{attrs:{"current-page":t.currentPage,"page-amount":t.pageAmount,loading:t.loading,total:t.total,"last-page":t.lastPage},on:{"pagination-click":t.handlePaginationClick}})]:e("div",{directives:[{name:"loading",rawName:"v-loading",value:t.loadingState,expression:"loadingState"}],staticClass:"details-history__empty p4"},[t._v(t._s(t.t("noDataText")))])],2)},j=[],N=H(l,Q,j,!1,null,"9cc003aa");const Y=N.exports;export{Y as default};
