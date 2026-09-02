document.addEventListener('DOMContentLoaded',()=>{
  const translations={
    'Tours & Vehicles — local, on-time, verified':'टूर्स आणि वाहने — स्थानिक, वेळेवर आणि विश्वासार्ह',
    'Choose the journey you need':'तुम्हाला हवा असलेला प्रवास निवडा',
    'Airport pickup and drop':'विमानतळ पिकअप आणि ड्रॉप','Local and outstation travel':'स्थानिक आणि बाहेरगावी प्रवास','Vehicle rental with driver':'चालकासह वाहन भाडे','Tadoba and Pench safari transport':'ताडोबा आणि पेंच सफारी वाहतूक','Pilgrimage and family tours':'तीर्थयात्रा आणि कौटुंबिक सहली','Corporate and group travel':'कॉर्पोरेट आणि समूह प्रवास',
    'Choose your ride — 3D or photo':'तुमचे वाहन निवडा — 3D किंवा फोटो','Clear guidance, owner-confirmed quote':'स्पष्ट माहिती आणि मालकाकडून निश्चित दर','Request travel quote':'प्रवासाचा दर मागवा',
    'Banking & Citizen Help':'बँकिंग आणि नागरिक सेवा','Banking & Citizen Help — choose what you need':'बँकिंग आणि नागरिक सेवा — आवश्यक सेवा निवडा','Banking services':'बँकिंग सेवा','Ask required documents':'आवश्यक कागदपत्रांची माहिती विचारा',
    'Print, Photo & Documents':'प्रिंट, फोटो आणि कागदपत्रे','Xerox • Photo • Scan • Lamination':'झेरॉक्स • फोटो • स्कॅन • लॅमिनेशन','Print services':'प्रिंट सेवा','Request print/photo service':'प्रिंट किंवा फोटो सेवेची चौकशी',
    'Online Services':'ऑनलाइन सेवा','Search, filter, then enquire':'शोधा, निवडा आणि चौकशी करा','Online services':'ऑनलाइन सेवा','Request online assistance':'ऑनलाइन सहाय्याची विनंती',
    'Visit or call':'भेट द्या किंवा कॉल करा','How can we help?':'आम्ही कशी मदत करू शकतो?','Contact the right service':'योग्य सेवा विभागाशी संपर्क करा','Before you contact us':'संपर्क करण्यापूर्वी'
  };
  document.querySelectorAll('h1,h2,h3').forEach(element=>{const key=element.textContent.trim();const mr=translations[key];if(mr&&!element.querySelector('.marathi-copy')){const span=document.createElement('span');span.className='marathi-copy';span.lang='mr';span.textContent=mr;element.appendChild(span)}});
  const actions=document.querySelector('.nav-actions');
  if(actions&&!actions.querySelector('.site-lang-switch')){
    const control=document.createElement('div');control.className='site-lang-switch';control.setAttribute('role','group');control.setAttribute('aria-label','Language display');control.innerHTML='<button type="button" data-site-lang="bilingual">EN + मराठी</button><button type="button" data-site-lang="english">EN</button>';actions.prepend(control);
    const apply=mode=>{const selected=mode==='english'?'english':'bilingual';document.body.classList.toggle('english-only',selected==='english');control.querySelectorAll('button').forEach(button=>{const active=button.dataset.siteLang===selected;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});localStorage.setItem('replica_site_language',selected)};
    control.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.siteLang)));
    apply(localStorage.getItem('replica_site_language')||'bilingual');
  }
});
