"use strict";(self.webpackChunkpolkaswap_exchange_web=self.webpackChunkpolkaswap_exchange_web||[]).push([[9076],{49076:function(t,e,s){s.r(e),s.d(e,{default:function(){return S}});var a=s(23166),i=s(97582),o=s(86424),r=s(89445),n=s(40535),l=s(89334),u=s(68282),d=s(37981),m=s(79934);const{IndexerType:p}=o.WALLET_CONSTS,c=m.Ps`
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
`,h=m.Ps`
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
`,f=(t,e)=>{const s={vaultId:{equalTo:String(t)}};return e&&(s.timestamp={greaterThan:e}),s},y=t=>({amount:t.amount?new d.FPNumber(t.amount):null,timestamp:1e3*t.timestamp,type:t.type});var g=s(94503),b=s(49053);let C=class extends((0,r.Wr)(l.Z,n.Z)){constructor(...t){super(...t),(0,a.Z)(this,"HiddenValue",o.WALLET_CONSTS.HiddenValue),(0,a.Z)(this,"DateFormat","ll LT"),(0,a.Z)(this,"id",void 0),(0,a.Z)(this,"lockedAsset",void 0),(0,a.Z)(this,"debtAsset",void 0),(0,a.Z)(this,"shouldBalanceBeHidden",void 0),(0,a.Z)(this,"pageAmount",5)}async updateHistory(t,e){this.checkTriggerUpdate(t,e)}get lockedAssetSymbol(){return this.lockedAsset?.symbol??""}get debtAssetSymbol(){return this.debtAsset?.symbol??""}get dataVariables(){return{id:this.id,first:this.pageAmount,offset:this.pageAmount*(this.currentPage-1)}}get updateVariables(){return{id:this.id,fromTimestamp:this.intervalTimestamp}}getItemTimestamp(t){return t?.timestamp??0}async requestData(t){return await async function(t){const e=(0,o.HZ)(),{id:s,first:a,offset:i,fromTimestamp:r}=t;let n=0,l=[];if(!s)return{totalCount:n,items:l};switch(e.type){case p.SUBQUERY:{const t={first:a,offset:i,filter:f(s,r)},o=e,u=await o.services.explorer.fetchEntities(c,t);u&&(n=u.totalCount,l=u.edges.map((t=>y(t.node))));break}case p.SUBSQUID:{const t={first:a,offset:i,filter:f(s,r)},o=e,u=await o.services.explorer.fetchEntities(h,t);u&&(n=u.totalCount,l=u.nodes.map((t=>y(t))));break}}return{totalCount:n,items:l}}(t)}getTitle(t){switch(t){case g.rC.Created:return this.t("operations.CreateVault");case g.rC.Closed:return this.t("operations.CloseVault");case g.rC.DebtIncreased:return this.t("operations.BorrowVaultDebt");case g.rC.CollateralDeposit:return this.t("operations.DepositCollateral");case g.rC.DebtPayment:return this.t("operations.RepayVaultDebt");case g.rC.Liquidated:return this.t("kensetsu.liquidated");default:return""}}getAmount(t,e){return t?this.HiddenValue:e.amount?.toLocaleString()??""}getOperationMessage(t){const e=this.shouldBalanceBeHidden;switch(t.type){case g.rC.Created:return this.t("operations.finalized.CreateVault",{symbol:this.debtAssetSymbol,symbol2:this.lockedAssetSymbol});case g.rC.Closed:return this.t("operations.finalized.CloseVault",{symbol:this.debtAssetSymbol,symbol2:this.lockedAssetSymbol});case g.rC.DebtIncreased:return this.t("operations.finalized.BorrowVaultDebt",{symbol:this.debtAssetSymbol,amount:this.getAmount(e,t)});case g.rC.CollateralDeposit:return this.t("operations.finalized.DepositCollateral",{symbol:this.lockedAssetSymbol,amount:this.getAmount(e,t)});case g.rC.DebtPayment:return this.t("operations.finalized.RepayVaultDebt",{symbol:this.debtAssetSymbol,amount:this.getAmount(e,t)});case g.rC.Liquidated:return this.t("kensetsu.liquidatedMessage",{symbol:this.lockedAssetSymbol,amount:this.getAmount(e,t)});default:return""}}};(0,i.gn)([(0,r.fI)({default:void 0,type:Number})],C.prototype,"id",void 0),(0,i.gn)([(0,r.fI)({default:u.u8,type:Object})],C.prototype,"lockedAsset",void 0),(0,i.gn)([(0,r.fI)({default:u.u8,type:Object})],C.prototype,"debtAsset",void 0),(0,i.gn)([b.SB.wallet.settings.shouldBalanceBeHidden],C.prototype,"shouldBalanceBeHidden",void 0),(0,i.gn)([(0,r.RL)("id",{immediate:!0})],C.prototype,"updateHistory",null),C=(0,i.gn)([(0,r.wA)({components:{HistoryPagination:o.wx.HistoryPagination}})],C);var v=C,S=(0,s(1001).Z)(v,(function(){var t=this,e=t._self._c;t._self._setupProxy;return e("s-card",{staticClass:"details-history",attrs:{"border-radius":"small",size:"big",primary:""},scopedSlots:t._u([{key:"header",fn:function(){return[e("h4",[t._v(t._s(t.$t("kensetsu.positionHistory")))])]},proxy:!0}])},[t.hasItems?[e("div",{directives:[{name:"loading",rawName:"v-loading",value:t.loadingState,expression:"loadingState"}],staticClass:"details-history__items s-flex-column"},t._l(t.items,(function(s,a){return e("div",{key:a,staticClass:"history-item s-flex-column"},[e("div",{staticClass:"history-item-info s-flex"},[e("div",{staticClass:"history-item-operation ch3",attrs:{"data-type":s.type}},[t._v(t._s(t.getTitle(s.type)))]),e("div",{staticClass:"history-item-title p4"},[t._v(t._s(t.getOperationMessage(s)))])]),e("div",{staticClass:"history-item-date"},[t._v(t._s(t.formatDate(s.timestamp,t.DateFormat)))])])})),0),e("history-pagination",{attrs:{"current-page":t.currentPage,"page-amount":t.pageAmount,loading:t.loading,total:t.total,"last-page":t.lastPage},on:{"pagination-click":t.onPaginationClick}})]:e("div",{directives:[{name:"loading",rawName:"v-loading",value:t.loadingState,expression:"loadingState"}],staticClass:"details-history__empty p4"},[t._v(t._s(t.t("noDataText")))])],2)}),[],!1,null,"5abbc46d",null).exports}}]);