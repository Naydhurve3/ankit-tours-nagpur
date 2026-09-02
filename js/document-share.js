async function sendServiceEnquiry(message,form){
  const input=form?.querySelector('input[type="file"]');
  const file=input?.files?.[0];
  if(file){
    const allowed=['application/pdf','image/jpeg','image/png'];
    if(!allowed.includes(file.type)){alert('Please choose a PDF, JPG or PNG file only.');return false;}
    if(file.size>5*1024*1024){alert('The file must be 5 MB or smaller.');return false;}
    const withFile=`${message}\nSelected document: ${file.name}`;
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      try{await navigator.share({title:'Replica Click enquiry',text:withFile,files:[file]});return true;}catch(error){if(error?.name==='AbortError')return false;}
    }
    window.open(`https://wa.me/917276066532?text=${encodeURIComponent(withFile+'\n\nPlease attach the selected document in this chat before sending.')}`,'_blank','noopener');
    window.setTimeout(()=>alert(`WhatsApp is ready. Please attach “${file.name}” using the paperclip button before sending.`),350);
    return true;
  }
  window.open(`https://wa.me/917276066532?text=${encodeURIComponent(message)}`,'_blank','noopener');
  return true;
}
