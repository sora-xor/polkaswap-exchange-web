import{b as e,ac as h,f,ab as i}from"./index-BHqySXo4.js";const{IndexerType:d}=f,u=[{address:"cnV21a8zn14wUTuxUK6wy5Fmus8PXaGrsBUchz33MqavYqxHE",amount:e.FPNumber.fromCodecValue("2000000000000000000000000"),blockHeight:14496081},{address:"cnXES5tPEMkhLmhG57v55aYW4x1DtqHFM9Ft8rBcLNyHHFVSm",amount:e.FPNumber.fromCodecValue("1000000000000000000000000"),blockHeight:14488966},{address:"cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN",amount:e.FPNumber.fromCodecValue("25000000000000000000000000"),blockHeight:14482098},{address:"cnRdTJwjwpn67KgnWGcbBJpMipryNNos15NEFWV4sEfSnNnM6",amount:e.FPNumber.fromCodecValue("4000000000000000000000000"),blockHeight:14473177},{address:"cnW4cSTA6CB3zDw2kLknDwZRqPPwPDdFURN2nhHVg8C2SnrNX",amount:e.FPNumber.fromCodecValue("1000000000000000000000000"),blockHeight:14471099},{address:"cnTmBrrR4CFs3GDA1DjWhAMsXXAJQJwUCkFtbsRsXhXJWTB3J",amount:e.FPNumber.fromCodecValue("1000000000000000000000000"),blockHeight:14467209},{address:"cnTYLL7UNk9tak7gRZnZXxfor5UvMSEebBUsSLwwhyZvDdKWB",amount:e.FPNumber.fromCodecValue("1500000000000000000000000"),blockHeight:14467173},{address:"cnVA8S2CNn2h4CjW2vTnqnSRqEL4P2ShvPWYA46TYEdTtao3S",amount:e.FPNumber.fromCodecValue("1000000000000000000000000"),blockHeight:14467085},{address:"cnTdA96vs4okPqpfSaPwSCPunkEn6AYTLek6rBvP9LbXbinAh",amount:e.FPNumber.fromCodecValue("10000000000000000000000000"),blockHeight:14466510},{address:"cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB",amount:e.FPNumber.fromCodecValue("1500000000000000000000000"),blockHeight:14465935},{address:"cnV5d93J89p5kC4dRqF5WWtDNCk1XZ3HQo9dEhGUxBQnohxEB",amount:e.FPNumber.fromCodecValue("10000000000000000000000000"),blockHeight:14464669},{address:"cnTkiF9YpNT8uzwQvJFJHf7Vr3KtFppF2VGxE22C1MTMbHEmN",amount:e.FPNumber.fromCodecValue("1000000000000000000000000"),blockHeight:14464111}],g=t=>i`
  query XorBurnQuery($start: Int = 0, $end: Int = 0, $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          { module: { equalTo: "assets" } }
          { method: { equalTo: "burn" } }
          { data: { contains: { assetId: "0x0200000000000000000000000000000000000000000000000000000000000000" } } }
          ${t?`{ address: { equalTo: "${t}" } }`:""}
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          address
          data
          blockHeight
        }
      }
    }
  }
`,k=t=>i`
  query XorBurnQuery($start: Int = 0, $end: Int = 0, $after: String = null, $first: Int = 100) {
    data: historyElementsConnection(
      orderBy: id_ASC
      first: $first
      after: $after
      where: {
        AND: [
          { blockHeight_gte: $start }
          { blockHeight_lte: $end }
          { module_eq: "assets" }
          { method_eq: "burn" }
          { data_jsonContains: { assetId: "0x0200000000000000000000000000000000000000000000000000000000000000" } }
          ${t?`{ address_eq: "${t}" }`:""}
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          address
          data
          blockHeight
        }
      }
    }
  }
`,c=t=>{const s=t.data;return{address:t.address,amount:new e.FPNumber(s.amount),blockHeight:+t.blockHeight}};async function F(t,s,r){const a=h(),n={start:t,end:s};switch(a.type){case d.SUBQUERY:{const o=await a.services.explorer.fetchAllEntities(g(r),n,c),m=r?u.filter(b=>b.address===r):u;return[...o??[],...m]}case d.SUBSQUID:return await a.services.explorer.fetchAllEntitiesConnection(k(r),n,c)??[]}return[]}export{F as f};
