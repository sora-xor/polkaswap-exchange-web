var k=Object.defineProperty;var I=(s,e,t)=>e in s?k(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var o=(s,e,t)=>I(s,typeof e!="symbol"?e+"":e,t);import{gV as _,gW as T,ab as v,ac as $,aC as w,gX as A,f as m,F as d,m as F,aG as P,aH as D,aI as S,c as E,aJ as q,C as W,l,j as c,_ as N,n as B}from"./index-BHqySXo4.js";import{C as R}from"./ChartSpecMixin-GBpLmNyN.js";import{W as L}from"./WithTokenSelect-DGwbNI0S.js";import{A as g,S as z}from"./snapshots-CDsBWfuS.js";const{IndexerType:x}=m,M={[_.address]:334496093779e-4,[T.address]:63450144206195e-4},O=v`
  query AssetSupplyQuery($after: Cursor, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    data: assetSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { assetId: { equalTo: $id } }
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
          supply
          mint
          burn
        }
      }
    }
  }
`,V=v`
  query AssetSupplyQuery($after: String, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    data: assetSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { asset: { id_eq: $id } }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          supply
          mint
          burn
        }
      }
    }
  }
`,h=s=>{const e=d.fromCodecValue(s);return e.isFinity()?e.toNumber():0},b=s=>({timestamp:+s.timestamp*1e3,value:h(s.supply),mint:h(s.mint),burn:h(s.burn)});async function Q(s,e,t,a){const r=$();let n;switch(r.type){case x.SUBQUERY:{n=await r.services.explorer.fetchAllEntities(O,{id:s,from:e,to:t,type:a},b);break}case x.SUBSQUID:{n=await r.services.explorer.fetchAllEntitiesConnection(V,{id:s,from:e,to:t,type:a},b);break}}const i=n??[];if(![_.address,T.address].includes(s)||(w.state.wallet.settings.soraNetwork??await A())!==m.SoraNetwork.Prod)return i;const C=M[s];return i.map(u=>({...u,value:u.value-C}))}var U=Object.defineProperty,j=Object.getOwnPropertyDescriptor,G=(s,e,t,a)=>{for(var r=a>1?void 0:a?j(e,t):e,n=s.length-1,i;n>=0;n--)(i=s[n])&&(r=(a?i(e,t,r):i(r))||r);return a&&r&&U(e,t,r),r};const p=(s,e,t=!1)=>s.reduce((a,r)=>Math[t?"min":"max"](a,r[e]),t?1/0:0);let f=class extends F(L,R){constructor(){super(...arguments);o(this,"FontSizeRate",m.FontSizeRate);o(this,"FontWeightRate",m.FontWeightRate);o(this,"filters",g);o(this,"filter",g[0]);o(this,"isFetchingError",!1);o(this,"data",[])}get firstValue(){var t;return new d(((t=P(this.data))==null?void 0:t.value)??0)}get lastValue(){var t;return new d(((t=D(this.data))==null?void 0:t.value)??0)}get amount(){return S(this.firstValue)}get priceChange(){return E(this.firstValue,this.lastValue)}get mintBurnRange(){const t=Math.max(p(this.data,"mint"),p(this.data,"burn")),a=Math.min(p(this.data,"mint",!0),p(this.data,"burn",!0)),r=(t-a)*1.05;return[t+r,a]}created(){this.updateData()}get chartSpec(){const t=a=>{const r=new d(a),{amount:n,suffix:i}=S(r);return`${n} ${i}`};return{dataset:{source:this.data.map(a=>[a.timestamp,a.value,a.mint,a.burn]),dimensions:["timestamp","supply","mint","burn"]},grid:this.gridSpec({top:40,left:50,right:50}),xAxis:this.xAxisSpec(),yAxis:[this.yAxisSpec({name:`Remint
Burn`,nameGap:12,nameTextStyle:{align:"right"},type:"log",min:1,axisLabel:{formatter:t},splitLine:!1}),this.yAxisSpec({name:"Supply",nameGap:22,nameTextStyle:{align:"left"},axisLabel:{formatter:t}})],tooltip:this.tooltipSpec({formatter:a=>`
              <table>
                ${a.map(r=>`
                  <tr>
                    <td>${r.marker} ${r.seriesName}</td>
                    <td align="right">${q(r.data[r.seriesIndex+1])}</td>
                  </tr>
                `).join("")}
              </table>
            `}),series:[this.lineSeriesSpec({encode:{y:"value"},itemStyle:{color:this.theme.color.status.info},name:"Supply",yAxisIndex:1,areaStyle:void 0}),this.seriesSpec({type:"bar",encode:{y:"mint"},itemStyle:{color:this.theme.color.status.success,opacity:.5},name:"Remint",yAxisIndex:0,areaStyle:void 0}),this.seriesSpec({type:"bar",encode:{y:"burn"},itemStyle:{color:this.theme.color.status.error,opacity:.5},name:"Burn",yAxisIndex:0,areaStyle:void 0})],legend:{orient:"horizontal",top:0,left:"center",icon:"circle",textStyle:{color:this.theme.color.base.content.primary,fontSize:12,fontWeight:400,lineHeight:1.5},selectedMode:!1}}}changeFilter(t){this.filter=t,this.updateData()}onTokenChange(t){this.changeToken(t),this.updateData()}async updateData(){await this.withLoading(async()=>{await this.withParentLoading(async()=>{try{const t=this.selectedToken.address,{type:a,count:r}=this.filter,n=z[a],i=Math.floor(Date.now()/(n*1e3))*n,y=i-n*r;this.data=Object.freeze(await Q(t,i,y,a)),this.isFetchingError=!1}catch(t){console.error(t),this.isFetchingError=!0}})})}};f=G([W({components:{ChartSkeleton:l(c.ChartSkeleton),PriceChange:l(c.PriceChange),BaseWidget:l(c.BaseWidget),StatsFilter:l(c.StatsFilter),TokenSelectButton:l(c.TokenSelectButton),SelectToken:l(c.SelectToken),FormattedAmount:N.FormattedAmount}})],f);var Y=function(){var e=this,t=e._self._c;return e._self._setupProxy,t("base-widget",e._b({attrs:{title:e.t("createToken.tokenSupply.placeholder"),tooltip:e.t("tooltips.supply")},scopedSlots:e._u([{key:"filters",fn:function(){return[t("stats-filter",{attrs:{"is-dropdown":"",filters:e.filters,value:e.filter},on:{input:e.changeFilter}})]},proxy:!0},e.predefinedToken?null:{key:"types",fn:function(){return[t("token-select-button",{attrs:{icon:e.selectTokenIcon,token:e.selectedToken,tabindex:e.tokenTabIndex},on:{click:function(a){return a.stopPropagation(),e.handleSelectToken.apply(null,arguments)}}})]},proxy:!0}],null,!0)},"base-widget",e.$attrs,!1),[t("chart-skeleton",{attrs:{loading:e.areActionsDisabled,"is-empty":e.data.length===0,"is-error":e.isFetchingError},on:{retry:e.updateData}},[t("formatted-amount",{staticClass:"chart-price",attrs:{value:e.amount.amount}},[e._v(" "+e._s(e.amount.suffix)+" ")]),t("price-change",{attrs:{value:e.priceChange}}),t("v-chart",{ref:"chart",staticClass:"chart",attrs:{option:e.chartSpec,autoresize:""}})],1),e.predefinedToken?e._e():t("select-token",{attrs:{"disabled-custom":"",visible:e.showSelectTokenDialog,asset:e.selectedToken},on:{"update:visible":function(a){e.showSelectTokenDialog=a},select:e.onTokenChange}})],1)},H=[],J=B(f,Y,H,!1,null,null);const se=J.exports;export{se as default};
