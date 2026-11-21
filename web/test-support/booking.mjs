export function acceptance(revision=1) {
  return {revision,serviceDate:'2026-12-04',scope:'Gepackte Kartons zwischen zwei vereinbarten Bordsteinen',
    customerAccepted:true,acceptanceChannel:'email',acceptanceRef:'TEST-ANNAHME-01'};
}

export function bookTestOffer(store,ref,gross=498,cost=300.09,ms=Date.now()) {
  store.stage(ref,'qualified',null,null,ms);
  store.quote(ref,1,gross,cost,ms);
  return store.book(ref,acceptance(),ms);
}
