"use strict";(self.webpackChunkpolkaswap_exchange_web=self.webpackChunkpolkaswap_exchange_web||[]).push([[1629],{91629:function(t,e,s){s.r(e),s.d(e,{default:function(){return S}});var a=s(23166),o=s(97582),i=s(69826),r=s(86424),n=s(89445),l=s(36113),d=s(68282),u=s(94393),c=s(37981),p=s(79934);const{IndexerType:h}=r.WALLET_CONSTS;var _;!function(t){t.Swap="swap",t.PoolDeposit="poolDeposit",t.PoolWithdraw="poolWithdraw"}(_||(_={}));const g=p.Ps`
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
`,m=p.Ps`
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
`,f=t=>{const e=t.data;return{amount:new c.FPNumber(e.amount),assetId:e.assetId,type:e.sidechainAddress?"outgoing":"incoming"}};const v={[h.SUBQUERY]:{[_.Swap]:'{ module: { equalTo: "liquidityProxy" } } { method: { equalTo: "swap" } }',[_.PoolDeposit]:'{ module: { equalTo: "poolXYK" } } { method: { equalTo: "depositLiquidity" } }',[_.PoolWithdraw]:'{ module: { equalTo: "poolXYK" } } { method: { equalTo: "withdrawLiquidity" } }'},[h.SUBSQUID]:{[_.Swap]:'{ module_eq: "liquidityProxy" } { method_eq: "swap" }',[_.PoolDeposit]:'{ module_eq: "poolXYK" } { method_eq: "depositLiquidity" }',[_.PoolWithdraw]:'{ module_eq: "poolXYK" } { method_eq: "withdrawLiquidity" }'}};async function w(t,e,s,a){const o=(0,r.HZ)(),i={start:t,end:e,account:s},n=v[o.type]?.[a];switch(o.type){case h.SUBQUERY:{const t=o,e=await t.services.explorer.fetchEntities((t=>p.Ps`
  query CountQuery($start: Int = 0, $end: Int = 0, $account: String = "", $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          { address: { equalTo: $account } }
          ${t}
        ]
      }
    ) {
      totalCount
    }
  }
`)(n),i);return e?.totalCount??0}case h.SUBSQUID:{const t=o,e=await t.services.explorer.fetchEntitiesConnection((t=>p.Ps`
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
          ${t}
        ]
      }
    ) {
      totalCount
    }
  }
`)(n),i);return e?.totalCount??0}}return 0}var C=s(49053),y=s(50961);let b=class extends((0,n.Wr)(r.tA.LoadingMixin,r.tA.FormattedAmountMixin,l.Z)){constructor(...t){super(...t),(0,a.Z)(this,"LogoSize",r.WALLET_CONSTS.LogoSize),(0,a.Z)(this,"referralRewards",void 0),(0,a.Z)(this,"blockNumber",void 0),(0,a.Z)(this,"networkFees",void 0),(0,a.Z)(this,"libraryTheme",void 0),(0,a.Z)(this,"account",void 0),(0,a.Z)(this,"xor",void 0),(0,a.Z)(this,"currencySymbol",void 0),(0,a.Z)(this,"getAccountReferralRewards",void 0),(0,a.Z)(this,"burnData",null),(0,a.Z)(this,"bridgeData",[]),(0,a.Z)(this,"poolDepositCount",0),(0,a.Z)(this,"poolWithdrawCount",0),(0,a.Z)(this,"totalSwapTxs",0)}updateSubscriptions(t){t?this.withLoading(this.initData):(this.burnData=null,this.bridgeData=[],this.poolDepositCount=0,this.poolWithdrawCount=0,this.totalSwapTxs=0)}get xorSymbol(){return i.XOR.symbol}get referralsCardStyles(){return{backgroundImage:`url('/points/${this.libraryTheme}/referrals.png')`}}get bridgeCardStyles(){return{backgroundImage:`url('/points/${this.libraryTheme}/bridge.png')`}}get totalReferrals(){return this.referralRewards?Object.keys(this.referralRewards.invitedUserRewards).length:0}get bridgeVolume(){return this.bridgeData.reduce(((t,{amount:e,assetId:s})=>{const a=this.getFPNumberFiatAmountByFPNumber(e,{address:s});return a?t.add(a):t}),this.Zero)}get totalBridgeVolume(){return(0,y.kF)(this.bridgeVolume)}get xorBurned(){return(0,y.kF)(this.burnData??this.Zero)}get xorBurnedFiat(){return this.burnData&&this.getFiatAmountByFPNumber(this.burnData)||d.m8}get totalOutgoingBridgeTxs(){return this.bridgeData.filter((({type:t})=>"outgoing"===t)).length}get totalBridgeTxs(){return this.bridgeData.length}get totalPoolTxs(){return this.poolDepositCount+this.poolWithdrawCount}get totalFees(){let t=this.Zero;return this.totalSwapTxs&&this.networkFees.Swap&&(t=t.add(this.getFPNumberFromCodec(this.networkFees.Swap).mul(this.totalSwapTxs))),this.totalOutgoingBridgeTxs&&this.networkFees.EthBridgeOutgoing&&(t=t.add(this.getFPNumberFromCodec(this.networkFees.EthBridgeOutgoing).mul(this.totalOutgoingBridgeTxs))),this.poolDepositCount&&this.networkFees.AddLiquidity&&(t=t.add(this.getFPNumberFromCodec(this.networkFees.AddLiquidity).mul(this.poolDepositCount))),this.poolWithdrawCount&&this.networkFees.RemoveLiquidity&&(t=t.add(this.getFPNumberFromCodec(this.networkFees.RemoveLiquidity).mul(this.poolWithdrawCount))),t}get feesSpent(){return(0,y.kF)(this.totalFees)}get feesSpentFiat(){return this.getFiatAmountByFPNumber(this.totalFees)||d.m8}get totalReferralRewards(){return(0,y.kF)(this.referralRewards?.rewards??this.Zero)}get totalReferralRewardsFiat(){return this.referralRewards?.rewards&&this.getFiatAmountByFPNumber(this.referralRewards.rewards)||d.m8}async initData(){if(this.isLoggedIn){await this.getAccountReferralRewards();const t=this.account.address,e=this.blockNumber;if(!t||!e)return;const s=await(0,u.r)(0,e,t);this.burnData=s.reduce(((t,{amount:e})=>t.add(e)),this.Zero),this.bridgeData=await async function(t,e,s){const a=(0,r.HZ)(),o={start:t,end:e,account:s};switch(a.type){case h.SUBQUERY:{const t=a;return await t.services.explorer.fetchAllEntities(g,o,f)??[]}case h.SUBSQUID:{const t=a;return await t.services.explorer.fetchAllEntitiesConnection(m,o,f)??[]}}return[]}(0,e,t),this.totalSwapTxs=await w(0,e,t,_.Swap),this.poolDepositCount=await w(0,e,t,_.PoolDeposit),this.poolWithdrawCount=await w(0,e,t,_.PoolWithdraw)}}created(){this.withApi((async()=>{await this.initData()}))}};(0,o.gn)([C.SB.referrals.referralRewards],b.prototype,"referralRewards",void 0),(0,o.gn)([C.SB.settings.blockNumber],b.prototype,"blockNumber",void 0),(0,o.gn)([C.SB.wallet.settings.networkFees],b.prototype,"networkFees",void 0),(0,o.gn)([C.Yn.libraryTheme],b.prototype,"libraryTheme",void 0),(0,o.gn)([C.Yn.wallet.account.account],b.prototype,"account",void 0),(0,o.gn)([C.Yn.assets.xor],b.prototype,"xor",void 0),(0,o.gn)([C.Yn.wallet.settings.currencySymbol],b.prototype,"currencySymbol",void 0),(0,o.gn)([C.aD.referrals.getAccountReferralRewards],b.prototype,"getAccountReferralRewards",void 0),(0,o.gn)([(0,n.RL)("isLoggedIn")],b.prototype,"updateSubscriptions",null),b=(0,o.gn)([(0,n.wA)({components:{FormattedAmount:r.wx.FormattedAmount,TokenLogo:r.wx.TokenLogo}})],b);var x=b,S=(0,s(1001).Z)(x,(function(){var t=this,e=t._self._c;t._self._setupProxy;return e("div",{staticClass:"points__container"},[e("s-card",{staticClass:"points",attrs:{"border-radius":"small",shadow:"always",size:"medium",pressed:""},scopedSlots:t._u([{key:"header",fn:function(){return[e("h3",{staticClass:"points__header"},[t._v(t._s(t.t("points.title")))])]},proxy:!0}])},[e("div",{staticClass:"points__main s-flex-column"},[t.isLoggedIn?e("div",{directives:[{name:"loading",rawName:"v-loading",value:t.loading,expression:"loading"}]},[e("div",{staticClass:"points__card points__card-bridge",style:t.bridgeCardStyles},[e("div",{staticClass:"points__card-header s-flex-column"},[e("span",{staticClass:"points__card-title"},[t._v(t._s(t.t("points.bridgeVolume")))]),e("formatted-amount",{staticClass:"points__card-value",attrs:{"font-weight-rate":t.FontWeightRate.MEDIUM,"font-size-rate":t.FontSizeRate.MEDIUM,value:t.totalBridgeVolume.amount,"asset-symbol":t.totalBridgeVolume.suffix,"symbol-as-decimal":""},scopedSlots:t._u([{key:"prefix",fn:function(){return[t._v(t._s(t.currencySymbol))]},proxy:!0}])})],1)]),e("div",{staticClass:"points__card points__card-xor"},[e("div",{staticClass:"item s-flex"},[e("span",{staticClass:"item-title"},[t._v(t._s(t.t("points.feesSpent")))]),e("div",{staticClass:"item-value s-flex"},[e("div",{staticClass:"s-flex-column"},[e("formatted-amount",{staticClass:"item-value__tokens",attrs:{value:t.feesSpent.amount},scopedSlots:t._u([{key:"prefix",fn:function(){return[t._v(t._s(t.xorSymbol))]},proxy:!0}])},[t._v(" "+t._s(t.feesSpent.suffix)+" ")]),e("formatted-amount",{staticClass:"item-value__fiat",attrs:{"is-fiat-value":"","fiat-default-rounding":"","value-can-be-hidden":"","font-size-rate":t.FontSizeRate.MEDIUM,value:t.feesSpentFiat,"is-formatted":""}})],1),e("token-logo",{staticClass:"item-value__icon",attrs:{token:t.xor,size:t.LogoSize.SMALL}})],1)]),e("s-divider",{staticClass:"points__card-divider"}),e("div",{staticClass:"item s-flex"},[e("span",{staticClass:"item-title"},[t._v(t._s(t.t("points.xorBurned")))]),e("div",{staticClass:"item-value s-flex"},[e("div",{staticClass:"s-flex-column"},[e("formatted-amount",{staticClass:"item-value__tokens",attrs:{value:t.xorBurned.amount},scopedSlots:t._u([{key:"prefix",fn:function(){return[t._v(t._s(t.xorSymbol))]},proxy:!0}])},[t._v(" "+t._s(t.xorBurned.suffix)+" ")]),e("formatted-amount",{staticClass:"item-value__fiat",attrs:{"is-fiat-value":"","fiat-default-rounding":"","value-can-be-hidden":"","font-size-rate":t.FontSizeRate.MEDIUM,value:t.xorBurnedFiat,"is-formatted":""}})],1),e("token-logo",{staticClass:"item-value__icon",attrs:{token:t.xor,size:t.LogoSize.SMALL}})],1)])],1),e("div",{staticClass:"points__txs s-flex"},[e("div",{staticClass:"points__block swap s-flex-column"},[e("span",{staticClass:"points__block-header"},[t._v("SWAP TXNS")]),e("span",{staticClass:"points__block-value"},[t._v(t._s(t.totalSwapTxs))])]),e("div",{staticClass:"points__block bridge s-flex-column"},[e("span",{staticClass:"points__block-header"},[t._v("BRIDGE TXNS")]),e("span",{staticClass:"points__block-value"},[t._v(t._s(t.totalBridgeTxs))])]),e("div",{staticClass:"points__block pool s-flex-column"},[e("span",{staticClass:"points__block-header"},[t._v("POOL TXNS")]),e("span",{staticClass:"points__block-value"},[t._v(t._s(t.totalPoolTxs))])])]),e("div",{staticClass:"points__card points__card-referrals",style:t.referralsCardStyles},[e("div",{staticClass:"points__card-header s-flex-column"},[e("span",{staticClass:"points__card-title"},[t._v(t._s(t.t("points.yourReferrals")))]),e("span",{staticClass:"points__card-value s-flex"},[e("span",{staticClass:"account-icon"}),t._v(" "+t._s(t.t("points.accountsText",{amount:t.totalReferrals}))+" ")])]),e("s-divider",{staticClass:"points__card-divider"}),e("div",{staticClass:"item s-flex"},[e("span",{staticClass:"item-title"},[t._v(t._s(t.t("points.yourRewards")))]),e("div",{staticClass:"item-value s-flex"},[e("div",{staticClass:"s-flex-column"},[e("formatted-amount",{staticClass:"item-value__tokens",attrs:{value:t.totalReferralRewards.amount},scopedSlots:t._u([{key:"prefix",fn:function(){return[t._v(t._s(t.xorSymbol))]},proxy:!0}])},[t._v(" "+t._s(t.totalReferralRewards.suffix)+" ")]),e("formatted-amount",{staticClass:"item-value__fiat",attrs:{"is-fiat-value":"","fiat-default-rounding":"","value-can-be-hidden":"","font-size-rate":t.FontSizeRate.MEDIUM,value:t.totalReferralRewardsFiat,"is-formatted":""}})],1),e("token-logo",{staticClass:"item-value__icon",attrs:{token:t.xor,size:t.LogoSize.SMALL}})],1)])],1)]):e("div",{staticClass:"points__connect s-flex-column"},[e("span",{staticClass:"points__connect-title d2"},[t._v(t._s(t.t("points.loginText")))]),e("s-button",{staticClass:"points__connect-action s-typography-button--medium",attrs:{type:"primary"},on:{click:t.connectSoraWallet}},[t._v(" "+t._s(t.t("connectWalletText"))+" ")])],1),e("a",{staticClass:"points__soratopia s-flex",attrs:{rel:"nofollow noopener",target:"_blank",href:"https://t.me/soratopia_bot/app"}},[e("div",{staticClass:"points__soratopia-container s-flex"},[e("button",{staticClass:"points__soratopia-action"},[t._v(t._s(t.t("points.openTelegram")))]),e("span",{staticClass:"points__soratopia-text"},[t._v(t._s(t.t("points.toEarnPoints")))])])])])])],1)}),[],!1,null,"1ecd01de",null).exports}}]);