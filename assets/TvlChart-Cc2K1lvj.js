var x=Object.defineProperty;var v=(r,t,e)=>t in r?x(r,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):r[t]=e;var i=(r,t,e)=>v(r,typeof t!="symbol"?t+"":t,e);import{ab as S,ac as w,f as p,m as C,$ as b,F as l,aG as $,aH as T,aI as m,c as D,aJ as F,b8 as q,h as _,C as I,l as u,j as h,_ as E,n as P}from"./index-BHqySXo4.js";import"./index-xje9WUu-.js";import{C as R}from"./ChartSpecMixin-GBpLmNyN.js";import{N as d,S as N}from"./snapshots-CDsBWfuS.js";const{IndexerType:y}=p,A=S`
  query NetworkTvlQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
          { liquidityUSD: { greaterThan: "0" } }
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
          liquidityUSD
        }
      }
    }
  }
`,k=S`
  query NetworkTvlQuery($after: String, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }, { liquidityUSD_gt: "0" }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          liquidityUSD
        }
      }
    }
  }
`,g=r=>{const t=+r.liquidityUSD;return{timestamp:+r.timestamp*1e3,value:Number.isFinite(t)?t:0}};async function O(r,t,e){const s=w();let a;switch(s.type){case y.SUBQUERY:{a=await s.services.explorer.fetchAllEntities(A,{from:r,to:t,type:e},g);break}case y.SUBSQUID:{a=await s.services.explorer.fetchAllEntitiesConnection(k,{from:r,to:t,type:e},g);break}}return a??[]}var U=Object.defineProperty,L=Object.getOwnPropertyDescriptor,f=(r,t,e,s)=>{for(var a=s>1?void 0:s?L(t,e):t,n=r.length-1,o;n>=0;n--)(o=r[n])&&(a=(s?o(t,e,a):o(a))||a);return s&&a&&U(t,e,a),a};let c=class extends C(b.LoadingMixin,R){constructor(){super(...arguments);i(this,"exchangeRate");i(this,"currencySymbol");i(this,"FontSizeRate",p.FontSizeRate);i(this,"FontWeightRate",p.FontWeightRate);i(this,"filters",d);i(this,"filter",d[0]);i(this,"data",[]);i(this,"isFetchingError",!1)}created(){this.updateData()}get chartKey(){return`tvl-chart-${this.currencySymbol}-rate-${this.exchangeRate}`}get firstValue(){var e;return new l(((e=$(this.data))==null?void 0:e.value)??0)}get lastValue(){var e;return new l(((e=T(this.data))==null?void 0:e.value)??0)}get amount(){return m(this.firstValue.mul(this.exchangeRate))}get priceChange(){return D(this.firstValue,this.lastValue)}get chartSpec(){return{dataset:{source:this.data.map(e=>[e.timestamp,e.value]),dimensions:["timestamp","value"]},grid:this.gridSpec({top:20,left:45}),xAxis:this.xAxisSpec(),yAxis:this.yAxisSpec({axisLabel:{formatter:e=>{const s=new l(e).mul(this.exchangeRate),{amount:a,suffix:n}=m(s);return`${a} ${n}`}}}),tooltip:this.tooltipSpec({formatter:e=>{const{data:s}=e[0],[,a]=s,n=new l(a).mul(this.exchangeRate);return`${this.currencySymbol} ${F(n)}`}}),series:[this.lineSeriesSpec({areaStyle:{opacity:.8,color:new q(0,0,0,1,[{offset:0,color:"rgba(248, 8, 123, 0.25)"},{offset:1,color:"rgba(255, 49, 148, 0.03)"}])}})]}}changeFilter(e){this.filter=e,this.updateData()}async updateData(){await this.withLoading(async()=>{await this.withParentLoading(async()=>{try{const{type:e,count:s}=this.filter,a=N[e],n=Math.floor(Date.now()/(a*1e3))*a,o=n-a*s;this.data=Object.freeze(await O(n,o,e)),this.isFetchingError=!1}catch(e){console.error(e),this.isFetchingError=!0}})})}};f([_.wallet.settings.exchangeRate],c.prototype,"exchangeRate",2);f([_.wallet.settings.currencySymbol],c.prototype,"currencySymbol",2);c=f([I({components:{BaseWidget:u(h.BaseWidget),ChartSkeleton:u(h.ChartSkeleton),PriceChange:u(h.PriceChange),StatsFilter:u(h.StatsFilter),FormattedAmount:E.FormattedAmount}})],c);var V=function(){var t=this,e=t._self._c;return t._self._setupProxy,e("base-widget",t._b({attrs:{title:t.TranslationConsts.TVL,tooltip:t.t("tooltips.tvl")},scopedSlots:t._u([{key:"filters",fn:function(){return[e("stats-filter",{attrs:{"is-dropdown":"",filters:t.filters,value:t.filter},on:{input:t.changeFilter}})]},proxy:!0}])},"base-widget",t.$attrs,!1),[e("chart-skeleton",{attrs:{loading:t.parentLoading||t.loading,"is-empty":t.data.length===0,"is-error":t.isFetchingError},on:{retry:t.updateData}},[e("formatted-amount",{staticClass:"chart-price",attrs:{value:t.amount.amount},scopedSlots:t._u([{key:"prefix",fn:function(){return[t._v(t._s(t.currencySymbol))]},proxy:!0}])},[t._v(" "+t._s(t.amount.suffix)+" ")]),e("price-change",{attrs:{value:t.priceChange}}),e("v-chart",{key:t.chartKey,ref:"chart",staticClass:"chart",attrs:{option:t.chartSpec,autoresize:""}})],1)],1)},z=[],B=P(c,V,z,!1,null,null);const Y=B.exports;export{Y as default};
