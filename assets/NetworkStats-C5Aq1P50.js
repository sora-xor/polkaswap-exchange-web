var y=Object.defineProperty;var w=(n,t,a)=>t in n?y(n,t,{enumerable:!0,configurable:!0,writable:!0,value:a}):n[t]=a;var i=(n,t,a)=>w(n,typeof t!="symbol"?t+"":t,a);import{ab as _,ac as v,f as m,F as c,m as C,C as x,T as D,g as I,aI as E,b as O,l as p,k as d,A as P,n as $}from"./index-FQSVVDWu.js";import{N as f,S as F}from"./snapshots--1nPnMp6.js";const{IndexerType:h}=m,A=_`
  query StatsQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
        }
      }
    }
  }
`,q=_`
  query StatsQuery($after: String, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          accounts
          transactions
          bridgeIncomingTransactions
          bridgeOutgoingTransactions
        }
      }
    }
  }
`,T=n=>({timestamp:+n.timestamp*1e3,accounts:new c(n.accounts),transactions:new c(n.transactions),bridgeIncomingTransactions:new c(n.bridgeIncomingTransactions),bridgeOutgoingTransactions:new c(n.bridgeOutgoingTransactions)});async function S(n,t,a){const e=v();let s;switch(e.type){case h.SUBQUERY:{s=await e.services.explorer.fetchAllEntities(A,{from:n,to:t,type:a},T);break}case h.SUBSQUID:{s=await e.services.explorer.fetchAllEntitiesConnection(q,{from:n,to:t,type:a},T);break}}return s??[]}var R=Object.defineProperty,N=Object.getOwnPropertyDescriptor,z=(n,t,a,e)=>{for(var s=e>1?void 0:e?N(t,a):t,r=n.length-1,o;r>=0;r--)(o=n[r])&&(s=(e?o(t,a,s):o(s))||s);return e&&s&&R(t,a,s),s};let g=class extends C(x.LoadingMixin,D){constructor(){super(...arguments);i(this,"FontSizeRate",m.FontSizeRate);i(this,"FontWeightRate",m.FontWeightRate);i(this,"filters",f);i(this,"Arrow",String.fromCodePoint(8594));i(this,"filter",f[0]);i(this,"currData",null);i(this,"prevData",null)}created(){this.updateData()}get columns(){const{Sora:t,Ethereum:a}=this.TranslationConsts;return[{title:this.tc("transactionText",2),tooltip:this.t("tooltips.transactions"),prop:"transactions"},{title:this.t("newAccountsText"),tooltip:this.t("tooltips.accounts"),prop:"accounts"},{title:[a,this.Arrow,t].join(" "),tooltip:this.t("tooltips.bridgeTransactions",{from:a,to:t}),prop:"bridgeIncomingTransactions"},{title:[t,this.Arrow,a].join(" "),tooltip:this.t("tooltips.bridgeTransactions",{from:t,to:a}),prop:"bridgeOutgoingTransactions"}]}get statsColumns(){const{currData:t,prevData:a}=this;return this.columns.map(({prop:e,title:s,tooltip:r})=>{const o=(t==null?void 0:t[e])??c.ZERO,l=(a==null?void 0:a[e])??c.ZERO,u=I(o,l),b=E(o);return{title:s,tooltip:r,value:b,change:u}})}changeFilter(t){this.filter=t,this.updateData()}groupData(t){return t.reduce((a,e)=>{if(!a)return e;for(const{prop:s}of this.columns)a[s]=a[s].add(e[s]);return a},null)}async updateData(){await this.withLoading(async()=>{await this.withParentLoading(async()=>{const{type:t,count:a}=this.filter,e=F[t],s=Math.floor(Date.now()/(e*1e3))*e,r=s-e*a,o=r-e*a,[l,u]=await Promise.all([S(s,r,t),S(r,o,t)]);this.currData=Object.freeze(this.groupData(l)),this.prevData=Object.freeze(this.groupData(u))})})}};g=z([O({components:{PriceChange:p(d.PriceChange),BaseWidget:p(d.BaseWidget),StatsFilter:p(d.StatsFilter),FormattedAmount:P.FormattedAmount}})],g);var M=function(){var t=this,a=t._self._c;return t._self._setupProxy,a("base-widget",t._b({attrs:{title:t.t("networkStatisticsText")},scopedSlots:t._u([{key:"filters",fn:function(){return[a("stats-filter",{attrs:{disabled:t.loading,filters:t.filters,value:t.filter},on:{input:t.changeFilter}})]},proxy:!0}])},"base-widget",t.$attrs,!1),[a("div",{staticClass:"stats-row"},t._l(t.statsColumns,function({title:e,tooltip:s,value:r,change:o}){return a("div",{directives:[{name:"loading",rawName:"v-loading",value:t.loading,expression:"loading"}],key:e,staticClass:"stats-column"},[a("s-card",{attrs:{size:"small","border-radius":"mini"}},[a("div",{staticClass:"stats-card-title",attrs:{slot:"header"},slot:"header"},[a("span",[t._v(t._s(e))]),a("s-tooltip",{attrs:{"border-radius":"mini",content:s}},[a("s-icon",{attrs:{name:"info-16",size:"14px"}})],1)],1),a("div",{staticClass:"stats-card-data"},[a("formatted-amount",{staticClass:"stats-card-value",attrs:{"font-weight-rate":t.FontWeightRate.MEDIUM,"font-size-rate":t.FontSizeRate.MEDIUM,value:r.amount,"asset-symbol":r.suffix,"symbol-as-decimal":""}}),a("price-change",{attrs:{value:o}})],1)])],1)}),0)])},W=[],j=$(g,M,W,!1,null,"12d42f10");const k=j.exports;export{k as default};
