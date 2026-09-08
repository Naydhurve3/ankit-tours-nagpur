export const phone='917276066532';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const bi=(en,mr,tag='span')=>`<${tag} class="bi"><span class="en">${esc(en)}</span>${mr?`<span class="mr" lang="mr">${esc(mr)}</span>`:''}</${tag}>`;
export const routes=[
  {id:'travel',name:'Tours & vehicles',mr:'प्रवास आणि वाहने',short:'Travel',symbol:'↗',tone:'travel',intro:'Every journey starts closer to home.',introMr:'प्रत्येक प्रवासाची सुरुवात घराजवळून.',description:'Airport pickups, family trips and vehicles with a driver. Plan your journey with Ankit Tours & Travels.',descriptionMr:'अंकित टूर्स अँड ट्रॅव्हल्ससोबत विमानतळ, कौटुंबिक सहली आणि चालकासह वाहन सेवा.',categories:['travel'],note:'Confirm your route, date and passengers. The owner will share availability and a final quote.',noteMr:'मार्ग, तारीख आणि प्रवासी संख्या कळवा. उपलब्धता आणि अंतिम दर मालक कळवतील.'},
  {id:'banking-services',name:'Banking & citizen help',mr:'बँकिंग आणि नागरिक सहाय्य',short:'Banking',symbol:'₹',tone:'banking',intro:'Everyday assistance. A familiar face.',introMr:'रोजच्या कामासाठी, विश्वासाचे सहाय्य.',description:'Mini-bank assistance, identity documents, farmer schemes and citizen services at your local centre.',descriptionMr:'मिनी बँक सहाय्य, ओळख कागदपत्रे, शेतकरी योजना आणि नागरिक सेवांसाठी आपले स्थानिक केंद्र.',categories:['banking','aadhaar','pan','farmer','government','bachat','bus','bills'],note:'Tell us the service you need. Bring required original documents to the centre after confirming with the owner.',noteMr:'आवश्यक सेवा सांगा. मालकाशी खात्री करून मूळ कागदपत्रे केंद्रात आणा.'},
  {id:'print-photo',name:'Print, photo & documents',mr:'प्रिंट, फोटो आणि कागदपत्रे',short:'Print & photo',symbol:'▤',tone:'printing',intro:'Your documents. Ready for the next step.',introMr:'तुमच्या पुढच्या कामासाठी तयार कागदपत्रे.',description:'From a single Xerox to colour prints, passport photos, scanning and lamination.',descriptionMr:'एका झेरॉक्सपासून रंगीत प्रिंट, पासपोर्ट फोटो, स्कॅनिंग आणि लॅमिनेशनपर्यंत.',categories:['printing'],note:'Mention paper size, colour, pages and copies. Charges are confirmed before the job starts.',noteMr:'कागदाचा आकार, रंग, पाने आणि प्रती सांगा. काम सुरू करण्यापूर्वी दर निश्चित केले जातील.'},
  {id:'online-services',name:'Online & application help',mr:'ऑनलाइन आणि अर्ज सहाय्य',short:'Online services',symbol:'⌘',tone:'online',intro:'A little guidance. A lot made easier.',introMr:'योग्य मार्गदर्शनाने ऑनलाइन कामे सोपी.',description:'Education forms, tickets, business registrations and vehicle-document assistance in one place.',descriptionMr:'शैक्षणिक अर्ज, तिकीट, व्यवसाय नोंदणी आणि वाहन कागदपत्र सहाय्य एकाच ठिकाणी.',categories:['education','tickets','business','vehicle'],note:'Choose the exact application and mention any deadline. The owner will confirm the process and documents.',noteMr:'अर्ज निवडा आणि अंतिम तारीख असल्यास कळवा. प्रक्रिया आणि कागदपत्रे मालक स्पष्ट करतील.'}
];
export const travelCategory={id:'travel',title:'Travel services',titleMr:'प्रवास सेवा',items:['Airport pickup and drop','Local and outstation travel','Vehicle rental with driver','Tadoba and Pench safari transport','Pilgrimage and family tours','Corporate and group travel'],itemsMr:['विमानतळ पिकअप आणि ड्रॉप','स्थानिक आणि बाहेरगावी प्रवास','चालकासह वाहन भाडे','ताडोबा आणि पेंच सफारी वाहतूक','तीर्थयात्रा आणि कौटुंबिक सहली','कॉर्पोरेट आणि समूह प्रवास']};
export async function request(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',...options,signal:options.signal||AbortSignal.timeout(8000)});
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(result?.error||'Unable to connect. Please try again.');
  return result;
}
export async function loadCatalog(){
  const localPreview=['127.0.0.1','localhost'].includes(location.hostname);
  const [categories,seed]=await Promise.all([request('/assets/data/replica-services.json'),request('/assets/data/site-data.json')]);
  const [settings,custom,groups]=await Promise.all(['/api/service-settings','/api/service-groups?kind=custom','/api/service-groups?public=true'].map(url=>request(url).catch(()=>null)));
  if(!localPreview&&[settings,custom,groups].some(value=>!Array.isArray(value)))throw new Error('The published catalogue is temporarily unavailable. Please contact the centre.');
  const overrides=new Map((Array.isArray(settings)?settings:[]).map(x=>[x.service_id,x]));
  const allCategories=[travelCategory,...categories];
  const items=allCategories.flatMap(category=>category.items.map((name,i)=>({id:`${category.id}-${i+1}`,category:category.id,name,mr:category.itemsMr?.[i]||'',...overrides.get(`${category.id}-${i+1}`)})));
  for(const item of Array.isArray(custom)?custom:[])items.push({...item,id:`custom-${item.id}`,category:item.category_id,name:item.name_en,mr:item.name_mr,custom:true});
  const siteRoutes=Array.isArray(groups)?groups.filter(g=>g.visible!==false&&(!g.status||g.status==='published')).map(g=>{
    const base=routes.find(r=>r.id===g.id)||{id:g.id,short:g.title,symbol:g.icon||'↗',tone:'online'};
    const mapped=g.replica_ids??g.replicaIds??base.categories??[];
    const ids=Array.isArray(mapped)?mapped:[];
    return {...base,id:g.slug||g.id,accent:/^#[0-9a-f]{6}$/i.test(g.color||'')?g.color:'',name:g.title||base.name,mr:g.title_mr||base.mr,description:g.description||base.description,descriptionMr:g.description_mr||base.descriptionMr,intro:base.intro||g.title,introMr:base.introMr||g.title_mr,categories:[...new Set([...(g.include_tour||g.includeTour?['travel']:[]),...ids])],note:base.note||'Contact the centre to confirm details.',noteMr:base.noteMr||'तपशीलांसाठी केंद्राशी संपर्क करा.'};
  }):routes;
  const admitted=new Set(siteRoutes.flatMap(g=>g.categories));
  return {categories:allCategories,items:items.filter(x=>x.visible!==false&&admitted.has(x.category)).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned)||(a.sort_order||0)-(b.sort_order||0)),allItems:items,routes:siteRoutes,seed,connected:settings!==null,localPreview};
}
export function imageUrl(value){try{const url=new URL(value,location.origin);return url.protocol==='https:'||url.origin===location.origin?url.href:'';}catch{return '';}}
