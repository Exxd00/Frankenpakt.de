export const businessProjects = {
  firmenkunden: {label:'Firmenanfrage',service:''},
  bueroaufloesung: {label:'Büroauflösung',service:'entruempelung'},
  bueroumzug: {label:'Büroumzug',service:'umzug'},
  hausverwaltung: {label:'Entrümpelung für Hausverwaltungen',service:'entruempelung'},
  bueromoebel: {label:'Büromöbel ausräumen',service:'entsorgung'}
};

export function businessLines(business) {
  if (!business || !Object.hasOwn(businessProjects,business.project)) return [];
  const rows = [
    ['Vorhaben',businessProjects[business.project].label],
    ['Unternehmen',business.company],
    ['Projekt- oder Objektnummer',business.reference],
    ['Angebot erbeten bis',business.offerBy && business.offerBy.split('-').reverse().join('.')],
    ['Organisation vor Ort',business.logistics],
    ['Angebotsempfänger',business.recipient]
  ];
  return rows.filter(([,value])=>value);
}
