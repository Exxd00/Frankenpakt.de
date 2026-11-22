import {businessProjects} from './business-projects.js';

export function mountBusinessInquiry(form,params,callback) {
  const toggle=form.querySelector('#business-mode');
  const fields=form.querySelector('#business-fields');
  const options=form.querySelector('#business-options');
  const company=form.querySelector('#business-company');
  const service=form.elements.service;
  const originalMove=service.querySelector('[value="umzug"]').textContent;
  const originalTransport=service.querySelector('[value="transport"]').textContent;
  let project=params.get('projekt');
  if(!Object.hasOwn(businessProjects,project))project='firmenkunden';
  toggle.checked=params.get('kundentyp')==='firma';
  const initialService=toggle.checked ? businessProjects[project].service : '';
  function update(){
    fields.hidden=fields.disabled=!toggle.checked;
    company.required=toggle.checked&&!callback;
    form.querySelector('#business-name-rule').textContent=callback?'(optional)':'*';
    options.hidden=callback;
    options.querySelectorAll('input,textarea').forEach(input=>{input.disabled=callback;});
    if(businessProjects[project].service && service.value && businessProjects[project].service!==service.value)project='firmenkunden';
    fields.querySelector('legend').textContent=businessProjects[project].label;
    service.querySelector('[value="umzug"]').textContent=toggle.checked?'Büro- oder Firmenumzug':originalMove;
    service.querySelector('[value="transport"]').textContent=toggle.checked?'Transport von Inventar':originalTransport;
  }
  function writeContext(url){
    url.searchParams.delete('kundentyp');
    url.searchParams.delete('projekt');
    if(toggle.checked && url.pathname==='/anfrage/'){
      url.searchParams.set('kundentyp','firma');
      url.searchParams.set('projekt',project);
    }
  }
  function value(){
    if(!toggle.checked)return undefined;
    const business={project,company:company.value.trim()};
    if(!callback)for(const input of options.querySelectorAll('[data-business]')){
      const entered=input.value.trim();
      if(entered)business[input.dataset.business]=entered;
    }
    return business;
  }
  return {toggle,initialService,update,writeContext,value};
}
