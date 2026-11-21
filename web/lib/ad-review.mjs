import {cleanMoney, InputError, isGoogleAdVariant} from './inputs.mjs';

function calendarDay(value){
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-'))return false;
  const day=new Date(value+'T00:00:00Z');
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0,10)===value;
}

export function reviewAdSpend(store,from,to,adVariant,confirmedSpendEUR){
  if(!calendarDay(from) || !calendarDay(to) || from>to){
    throw new InputError('Gültige Kalendertage VON BIS im Format YYYY-MM-DD angeben.');
  }
  if(!isGoogleAdVariant(adVariant))throw new InputError('Eindeutige Google-Anzeigenvariante angeben.');
  const spendCents=cleanMoney(confirmedSpendEUR);
  if(!Number.isInteger(spendCents))throw new InputError('Bestätigte Kosten dieser Anzeigenvariante im Zeitraum in EUR angeben (z. B. 118.00).');

  const report=store.report(from,to);
  const cohort=report.googleAdCohorts.find(row=>row.adVariant===adVariant);
  const paidJobs=cohort?.currentlyPaidInFull ?? 0;
  const paidMargin=cohort?.fullyPaidContributionBeforeAdsEUR ?? 0;
  const collectedMargin=cohort?.collectedContributionBeforeAdsEUR ?? 0;
  return {
    asOf:report.asOf, inquiryCohortDatesBerlin:{start:from,end:to}, source:'google', adVariant,
    attributedInquiries:cohort?.inquiries ?? 0,
    currentlyFullyPaidCompletedJobs:paidJobs,
    confirmedAdSpendEUR:spendCents/100,
    costPerFullyPaidCompletedJobEUR:paidJobs ? Math.round(spendCents/paidJobs)/100 : null,
    fullyPaidContributionBeforeAdsEUR:paidMargin,
    fullyPaidContributionAfterAdsEUR:(Math.round(paidMargin*100)-spendCents)/100,
    collectedContributionBeforeAdsEUR:collectedMargin,
    collectedContributionAfterAdsEUR:(Math.round(collectedMargin*100)-spendCents)/100
  };
}
