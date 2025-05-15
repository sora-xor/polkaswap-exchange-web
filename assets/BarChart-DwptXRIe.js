var I=Object.defineProperty;var P=(a,e,t)=>e in a?I(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var i=(a,e,t)=>P(a,typeof e!="symbol"?e+"":e,t);import{ab as C,ac as O,f as y,F as l,m as k,$ as q,X as f,aG as A,aH as F,aI as d,c as N,aJ as g,h as D,C as B,l as p,j as h,_ as S,P as z,n as V}from"./index-BHqySXo4.js";import{C as L}from"./ChartSpecMixin-GBpLmNyN.js";import{N as v,S as U}from"./snapshots-CDsBWfuS.js";const{IndexerType:_}=y,Q=C`
  query NetworkVolumeQuery($after: Cursor, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
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
          volumeUSD @skip(if: $fees)
          fees @include(if: $fees)
        }
      }
    }
  }
`,W=C`
  query NetworkVolumeQuery($after: String, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
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
          volumeUSD @skip(if: $fees)
          fees @include(if: $fees)
        }
      }
    }
  }
`,x=a=>e=>{const t=a?l.fromCodecValue(e.fees):new l(e.volumeUSD);return{timestamp:+e.timestamp*1e3,value:t.isFinity()?t:l.ZERO}};async function b(a,e,t,s){const r=O();let o;switch(r.type){case _.SUBQUERY:{o=await r.services.explorer.fetchAllEntities(Q,{fees:a,from:e,to:t,type:s},x(a));break}case _.SUBSQUID:{o=await r.services.explorer.fetchAllEntitiesConnection(W,{fees:a,from:e,to:t,type:s},x(a));break}}return o??[]}var j=Object.defineProperty,M=Object.getOwnPropertyDescriptor,m=(a,e,t,s)=>{for(var r=s>1?void 0:s?M(e,t):e,o=a.length-1,n;o>=0;o--)(n=a[o])&&(r=(s?n(e,t,r):n(r))||r);return s&&r&&j(e,t,r),r};const $=a=>a.reduce((e,t)=>e.add(t.value),l.ZERO),K=(a,e,t)=>{const s=[];for(;(e+=t)<a;)s.push({timestamp:e,value:l.ZERO});return s.reverse()},w=(a,e,t,s)=>{var n;const r=((n=F(a))==null?void 0:n.timestamp)??t,o=K(r,s,e);a.push(...o)};let u=class extends k(q.LoadingMixin,L){constructor(){super(...arguments);i(this,"exchangeRate");i(this,"currencySymbol");i(this,"fees");i(this,"FontSizeRate",y.FontSizeRate);i(this,"FontWeightRate",y.FontWeightRate);i(this,"filters",v);i(this,"XOR",f);i(this,"filter",v[0]);i(this,"data",[]);i(this,"prevData",[]);i(this,"isFetchingError",!1)}created(){this.updateData()}get chartKey(){if(!this.fees)return`bar-chart-${this.currencySymbol}-rate-${this.exchangeRate}`}get symbol(){return this.fees?f.symbol:this.currencySymbol}get title(){return this.fees?"Fees":"Volume"}get tooltip(){return this.t(this.fees?"tooltips.fees":"tooltips.volume")}get firstValue(){var t;return new l(((t=A(this.data))==null?void 0:t.value)??0)}get lastValue(){var t;return new l(((t=F(this.data))==null?void 0:t.value)??0)}get total(){return $(this.data)}get amount(){return this.fees?d(this.total):d(this.total.mul(this.exchangeRate))}get priceChange(){const t=$(this.prevData);return N(this.total,t)}get chartSpec(){return{dataset:{source:this.data.map(t=>[t.timestamp,t.value.toNumber()]),dimensions:["timestamp","value"]},grid:this.gridSpec({top:20,left:45}),xAxis:this.xAxisSpec(),yAxis:this.yAxisSpec({axisLabel:{formatter:t=>{const s=new l(t).mul(this.exchangeRate),{amount:r,suffix:o}=d(s);return`${r} ${o}`}}}),tooltip:this.tooltipSpec({formatter:t=>{const{data:s}=t[0],[,r]=s;if(this.fees)return`${g(r)} ${f.symbol}`;const o=new l(r).mul(this.exchangeRate);return`${this.currencySymbol} ${g(o)}`}}),series:[this.barSeriesSpec({itemStyle:{color:"#C86FFF"}})]}}changeFilter(t){this.filter=t,this.updateData()}normalizeData(t,s,r,o){const n=[];for(const c of t)w(n,s,r,c.timestamp),n.push(c);return w(n,s,r,o),n}async updateData(){await this.withLoading(async()=>{await this.withParentLoading(async()=>{try{const{fees:t}=this,{type:s,count:r}=this.filter,o=U[s],n=Math.floor(Date.now()/(o*1e3))*o,c=n-o*r,T=c-o*r,[R,E]=await Promise.all([b(t,n,c,s),b(t,c,T,s)]);this.data=Object.freeze(this.normalizeData(R,o*1e3,n*1e3,c*1e3)),this.prevData=Object.freeze(E),this.isFetchingError=!1}catch(t){console.error(t),this.isFetchingError=!0}})})}};m([D.wallet.settings.exchangeRate],u.prototype,"exchangeRate",2);m([D.wallet.settings.currencySymbol],u.prototype,"currencySymbol",2);m([z({default:!1,type:Boolean})],u.prototype,"fees",2);u=m([B({components:{BaseWidget:p(h.BaseWidget),ChartSkeleton:p(h.ChartSkeleton),PriceChange:p(h.PriceChange),StatsFilter:p(h.StatsFilter),FormattedAmount:S.FormattedAmount,TokenLogo:S.TokenLogo}})],u);var X=function(){var e=this,t=e._self._c;return e._self._setupProxy,t("base-widget",e._b({attrs:{title:e.title,tooltip:e.tooltip},scopedSlots:e._u([{key:"filters",fn:function(){return[t("stats-filter",{attrs:{"is-dropdown":"",filters:e.filters,value:e.filter},on:{input:e.changeFilter}})]},proxy:!0}])},"base-widget",e.$attrs,!1),[t("chart-skeleton",{attrs:{loading:e.parentLoading||e.loading,"is-empty":e.data.length===0,"is-error":e.isFetchingError},on:{retry:e.updateData}},[t("formatted-amount",{staticClass:"chart-price",attrs:{value:e.amount.amount},scopedSlots:e._u([{key:"prefix",fn:function(){return[e._v(e._s(e.symbol))]},proxy:!0}])},[e._v(" "+e._s(e.amount.suffix)+" ")]),t("price-change",{attrs:{value:e.priceChange}}),t("v-chart",{key:e.chartKey,ref:"chart",staticClass:"chart",attrs:{option:e.chartSpec,autoresize:""}})],1)],1)},Z=[],Y=V(u,X,Z,!1,null,null);const ae=Y.exports;export{ae as default};
