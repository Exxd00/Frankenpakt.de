import {fillLevels,serviceNames} from './public/assets/actual-job.js';

function options(labels) {
  return Object.entries(labels).map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('');
}
function moveField(key,label,unit,allowUnknown) {
  return '<div class="actual-field"><label><span>'+label+(unit?' ('+unit+')':'')+'</span><input type="text" inputmode="decimal" name="move'+key+'" maxlength="9"></label>'+
    (allowUnknown?'<label class="actual-unknown"><input type="checkbox" name="unknown'+key+'"> Noch unbekannt</label>':'')+'</div>';
}
export function priceComparison(scopeSlot = '') {
  return `<section id="preisvergleich" class="wrap price-comparison" aria-labelledby="richtpreis">
    <h2 id="richtpreis">Ihr Vorhaben einschätzen</h2>
    <div class="comparison-layout" hidden>
      <form id="comparison-form" autocomplete="off" novalidate>
        <div data-quick-service>
          <label for="comparison-topic">Welche Leistung interessiert Sie?</label>
          <select id="comparison-topic" name="topic"><option value="" disabled selected>Bitte wählen</option>${options(serviceNames)}</select>
        </div>
        <div data-job-panel="entsorgung" hidden>
          <p class="actual-hint">Fassen Sie gleiche Gegenstände in einer Position zusammen.</p>
          <div data-item-rows></div><button type="button" data-add-item>+ Gegenstand hinzufügen</button>
        </div>
        <div data-job-panel="entruempelung" hidden>
          <p class="actual-hint">Tragen Sie jeden betroffenen Raum mit seiner geschätzten Fläche ein.</p>
          <div data-room-rows></div><button type="button" data-add-room>+ Raum hinzufügen</button>
        </div>
        <div data-job-panel="umzug" class="actual-move" hidden>
          ${moveField('Rooms','Anzahl der Zimmer','',false)}
          ${moveField('Area','Wohnfläche','m²',true)}
          ${moveField('Volume','Umzugsgut','m³',true)}
          ${moveField('Distance','Einfache Fahrstrecke','km',true)}
        </div>
        <template data-item-template><fieldset data-item-row><legend></legend><div class="actual-item-fields">
          <label><span>Was möchten Sie entsorgen?</span><input name="itemName" type="text" maxlength="120"></label>
          <label><span>Stückzahl</span><input name="itemQuantity" type="text" inputmode="numeric" maxlength="4"></label>
        </div><button type="button" data-remove-row>Entfernen</button></fieldset></template>
        <template data-room-template><fieldset data-room-row><legend></legend><div class="actual-room-fields">
          <label><span>Welcher Raum?</span><input name="roomName" type="text" maxlength="120"></label>
          <label><span>Fläche (m²)</span><input name="roomArea" type="text" inputmode="decimal" maxlength="9"></label>
          <label><span>Füllstand</span><select name="roomFill"><option value="">Bitte wählen</option>${options(fillLevels)}</select></label>
        </div><button type="button" data-remove-row>Entfernen</button></fieldset></template>
      </form>
      <div class="comparison-result" hidden>
        <div role="status" aria-live="polite" aria-atomic="true"><h3 data-comparison-title></h3><p class="comparison-amount" data-comparison-amount></p><p data-comparison-message></p><p class="comparison-note" data-estimate-scope-note></p></div>
        <div class="comparison-actions"><a href="/anfrage/" data-comparison-inquiry hidden>Angaben zur Anfrage übernehmen</a><a href="#raeumungsrechner" data-scenario-calculator hidden></a></div>
      </div>
    </div>
    ${scopeSlot}
    <noscript><p>Für eine Berechnung mit eigenen Angaben aktivieren Sie JavaScript. Hier finden Sie <a href="#raeumungsrechner">Richtwerte für Container</a> und die <a href="#preisfinder">Umzugspakete</a>.</p></noscript>
  </section>`;
}
