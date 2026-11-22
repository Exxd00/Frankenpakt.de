import {taskPages} from './task-pages.mjs';

export const publicOrigin = 'https://frankenpakt.de';
export const guideServices = Object.fromEntries(taskPages.map(page => [page.path, page.service]));
const serviceRoutes = {
  entruempelung:'/raeumung/', entsorgung:'/entsorgung/', umzug:'/umzug/',
  moebeltaxi:'/moebeltaxi/', seniorenumzug:'/seniorenumzug/'
};
const sectionNames = {
  '/':'Startseite', '/raeumung/':'Entrümpelung', '/entsorgung/':'Entsorgung',
  '/umzug/':'Privatumzug', '/moebeltaxi/':'Möbeltaxi', '/seniorenumzug/':'Seniorenumzug',
  '/preise/':'Preise'
};
export const searchPaths = [...Object.keys(sectionNames), ...taskPages.map(page => page.path)];
export const utilityPaths = ['/anfrage/', '/impressum/', '/datenschutz/', '/danke/'];
export const publicPagePaths = [...searchPaths,...utilityPaths];

export function breadcrumbItems(pathname) {
  const task=taskPages.find(page=>page.path===pathname);
  if (task) {
    const parent=serviceRoutes[task.service];
    return [['Startseite','/'],[sectionNames[parent],parent],[task.label,task.path]];
  }
  if (pathname!=='/' && Object.hasOwn(sectionNames,pathname)) {
    return [['Startseite','/'],[sectionNames[pathname],pathname]];
  }
  return [];
}

export function sitemap(origin) {
  const urls=searchPaths.map(path=>'<url><loc>'+new URL(path,origin).href+'</loc></url>');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.join('\n')+'\n</urlset>\n';
}

export function robots(origin) {
  if(!origin)return 'User-agent: *\nDisallow: /\n';
  return 'User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: '+new URL('/sitemap.xml',origin).href+'\n';
}

function escapeAttribute(value) {
  return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

export function searchHead(html,settings,canonical) {
  const {origin,pathname}=new URL(canonical);
  const canonicalTag='<link rel="canonical" href="'+escapeAttribute(canonical)+'">';
  if(!searchPaths.includes(pathname))return canonicalTag;
  // These values are already escaped in the template. The JSON graph below uses plain strings.
  const title=html.match(/<title>([^<]*)<\/title>/)?.[1];
  const description=html.match(/<meta name="description" content="([^"]*)">/)?.[1];
  if(!title||!description)return canonicalTag;
  const photo=html.match(/<img src="(\/assets\/(?:[^"/]+)\.webp)"/)?.[1];
  const tags=[canonicalTag,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="de_DE">',
    '<meta property="og:site_name" content="FrankenPackt">',
    '<meta property="og:title" content="'+title+'">',
    '<meta property="og:description" content="'+description+'">',
    '<meta property="og:url" content="'+escapeAttribute(canonical)+'">'
  ];
  if(photo)tags.push('<meta property="og:image" content="'+escapeAttribute(origin+photo)+'">');
  const businessId=origin+'/#betrieb', siteId=origin+'/#website';
  const graph=[];
  const unescape=value=>value.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const webPage={'@type':'WebPage','@id':canonical+'#webpage',url:canonical,name:unescape(title),description:unescape(description),inLanguage:'de-DE',
    isPartOf:{'@id':siteId},publisher:{'@id':businessId}};
  if(pathname==='/'){
    const business={'@type':'LocalBusiness','@id':businessId,name:'FrankenPackt',url:canonical,
      legalName:settings.operatorName,telephone:settings.phone,email:settings.email,
      logo:origin+'/assets/favicon.svg',areaServed:{'@type':'City',name:'Nürnberg'}};
    const address=(settings.legalAddress||'').trim().match(/^([^\r\n]+)\r?\n(\d{5})\s+([^\r\n]+)$/);
    if(address)business.address={'@type':'PostalAddress',streetAddress:address[1],postalCode:address[2],addressLocality:address[3],addressCountry:'DE'};
    if(photo)business.image=origin+photo;
    graph.push(business,{'@type':'WebSite','@id':siteId,url:canonical,name:'FrankenPackt',inLanguage:'de-DE',publisher:{'@id':businessId}});
  }
  const crumbs=breadcrumbItems(pathname);
  if(crumbs.length){
    webPage.breadcrumb={'@id':canonical+'#pfad'};
    graph.push({'@type':'BreadcrumbList','@id':canonical+'#pfad',itemListElement:crumbs.map(([name,path],i)=>({
      '@type':'ListItem',position:i+1,name,item:origin+path
    }))});
  }
  graph.push(webPage);
  const json=JSON.stringify({'@context':'https://schema.org','@graph':graph}).replaceAll('<','\\u003c');
  tags.push('<script type="application/ld+json">'+json+'</script>');
  return tags.join('');
}
