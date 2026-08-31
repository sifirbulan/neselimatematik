const configuredApiUrl=(import.meta.env.VITE_API_URL??'').trim().replace(/\/+$/,'');
const API_URL=!configuredApiUrl||configuredApiUrl==='https://nesevren-api.onrender.com'?'https://nesevren-api-v2.onrender.com':configuredApiUrl;

function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function optionCountForGrade(grade){if(grade==='LGS')return 4;const n=Number(grade);if(Number.isFinite(n)){if(n<=4)return 3;if(n<=8)return 4}return 5}
function currentGrade(){const assessment=readJson('nesevren-assessment');const grade=typeof assessment?.grade==='string'?assessment.grade.trim():'';return grade||null}
function levelLabel(grade){return /^\d+$/.test(String(grade||''))?`${grade}. sınıf`:String(grade||'Standart seviye')}
function currentQuestion(){return document.querySelector('.modernQuestionBox textarea')?.value?.trim()||''}
function currentImage(){const src=document.querySelector('.photoPreview img')?.getAttribute('src')||'';return src.startsWith('data:image/')?src:''}
function currentSubject(){const selected=document.querySelector('#subject')?.value?.trim();return selected&&selected!=='Otomatik'?selected:'Otomatik'}
function resultAnchor(){return document.querySelector('.smartActions')}
function removeOld(){document.querySelector('.practiceFixSet')?.remove();document.querySelector('.practiceFixMessage')?.remove()}
function showMessage(text,kind='error'){removeOld();const anchor=resultAnchor();if(!anchor)return;const box=document.createElement('div');box.className=`practiceFixMessage ${kind}`;box.textContent=text;anchor.insertAdjacentElement('afterend',box)}

function extractCandidate(data){
  const candidates=[data?.finalAnswer?.answer,data?.answer?.answer,data?.answer,data?.finalAnswer,data?.questions,data];
  for(const value of candidates){
    if(Array.isArray(value))return value;
    if(value&&typeof value==='object'&&Array.isArray(value.questions))return value.questions;
    if(typeof value==='string'&&value.trim()){
      const text=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
      const start=text.indexOf('['),end=text.lastIndexOf(']');
      const json=start>=0&&end>start?text.slice(start,end+1):text;
      try{const parsed=JSON.parse(json);if(Array.isArray(parsed))return parsed;if(Array.isArray(parsed?.questions))return parsed.questions}catch{}
    }
  }
  return null;
}

function normalizeQuestions(raw,expectedOptions){
  if(!Array.isArray(raw))throw new Error('Sorular uygun biçimde hazırlanamadı.');
  const items=raw.slice(0,3).map((item,index)=>{
    const q=item&&typeof item==='object'?item:{};
    const question=String(q.question??q.soru??'').trim();
    const options=Array.isArray(q.options)?q.options:Array.isArray(q.choices)?q.choices:Array.isArray(q.siklar)?q.siklar:[];
    const cleanOptions=options.map(x=>String(x).trim()).filter(Boolean);
    let correctIndex=Number(q.correctIndex);
    if(!Number.isInteger(correctIndex)){
      const answer=String(q.correctAnswer??q.answer??'').trim().toUpperCase();
      if(/^[A-E]$/.test(answer))correctIndex=answer.charCodeAt(0)-65;
      else if(/^\d+$/.test(answer)){const n=Number(answer);correctIndex=n>=1?n-1:n}
    }
    const hint=String(q.hint??q.ipucu??'Bir kez daha işlem sırasını ve sorunun istediğini kontrol et.').trim();
    if(!question)throw new Error(`${index+1}. soru oluşturulamadı.`);
    if(cleanOptions.length!==expectedOptions)throw new Error(`${index+1}. soru ${expectedOptions} şıklı hazırlanmadı.`);
    if(!Number.isInteger(correctIndex)||correctIndex<0||correctIndex>=cleanOptions.length)throw new Error(`${index+1}. sorunun doğru cevabı belirlenemedi.`);
    return{question,options:cleanOptions,correctIndex,hint};
  });
  if(items.length!==3)throw new Error('Tam olarak 3 soru üretilemedi.');
  return items;
}

function renderQuestions(questions,grade,optionCount){
  removeOld();const anchor=resultAnchor();if(!anchor)return;
  const wrap=document.createElement('section');wrap.className='practiceFixSet';
  wrap.innerHTML=`<div class="practiceFixTitle"><div><strong>📝 3 Soruluk Mini Pratik</strong><span>${escapeHtml(levelLabel(grade))} · ${optionCount} şık</span></div><b id="practiceFixScore">0/3</b></div><div class="practiceFixCards"></div>`;
  const cards=wrap.querySelector('.practiceFixCards');let answered=0;
  questions.forEach((item,qIndex)=>{
    const card=document.createElement('article');card.className='practiceFixCard';
    card.innerHTML=`<div class="practiceFixNumber">${qIndex+1}</div><h3>${escapeHtml(item.question)}</h3><div class="practiceFixOptions"></div><div class="practiceFixFeedback" hidden></div>`;
    const options=card.querySelector('.practiceFixOptions');
    item.options.forEach((option,oIndex)=>{
      const btn=document.createElement('button');btn.type='button';btn.innerHTML=`<span>${String.fromCharCode(65+oIndex)}</span>${escapeHtml(option)}`;
      btn.addEventListener('click',()=>{
        if(card.dataset.answered==='1')return;card.dataset.answered='1';answered+=1;wrap.querySelector('#practiceFixScore').textContent=`${answered}/3`;
        [...options.querySelectorAll('button')].forEach((b,i)=>{b.disabled=true;if(i===item.correctIndex)b.classList.add('correct');else if(i===oIndex)b.classList.add('wrong');else b.classList.add('muted')});
        const feedback=card.querySelector('.practiceFixFeedback');feedback.hidden=false;
        if(oIndex===item.correctIndex){feedback.className='practiceFixFeedback success';feedback.innerHTML='<strong>🎉 Tebrikler, doğru cevap!</strong><span>Harika gidiyorsun.</span>'}
        else{feedback.className='practiceFixFeedback retry';feedback.innerHTML=`<strong>Bir daha düşünelim.</strong><span>💡 ${escapeHtml(item.hint)}</span>`}
      });
      options.appendChild(btn);
    });
    cards.appendChild(card);
  });
  anchor.insertAdjacentElement('afterend',wrap);wrap.scrollIntoView({behavior:'smooth',block:'start'});
}

async function generatePractice(button){
  const question=currentQuestion(),imageDataUrl=currentImage();
  if(!question&&!imageDataUrl){showMessage('Önce bir soru yaz veya fotoğraf ekle; sonra 3 Soru Hazırla’ya bas.');return}
  const grade=currentGrade();const optionCount=grade?optionCountForGrade(grade):4;const subject=currentSubject();
  const labels=Array.from({length:optionCount},(_,i)=>String.fromCharCode(65+i)).join(', ');
  const prompt=`${subject==='Otomatik'?'Dersi sorunun içeriğinden kendin belirle.':`Ders: ${subject}.`} Öğrencinin düzeyi: ${grade?levelLabel(grade):'seviye bilgisi yok; standart düzey kullan'}. Aşağıdaki orijinal soruyla AYNI beceriyi ölçen TAM OLARAK 3 yeni çoktan seçmeli soru üret. Her soruda TAM OLARAK ${optionCount} şık (${labels}) olsun. İlk soru benzer düzeyde, ikinci biraz farklılaştırılmış, üçüncü biraz daha zor olsun. Cevabı kullanıcıya önceden gösterme. Yanlış cevapta kullanılmak üzere kısa bir ipucu ver. Çıktın SADECE JSON dizi olsun ve başka hiçbir metin yazma: [{"question":"...","options":["..."],"correctIndex":0,"hint":"..."},{...},{...}]. Orijinal soru: ${question||'Eklenen fotoğraftaki soru'}`;
  const original=button.querySelector('strong')?.textContent||'3 Soru Hazırla';button.disabled=true;if(button.querySelector('strong'))button.querySelector('strong').textContent='Üretiliyor…';removeOld();
  try{
    const response=await fetch(`${API_URL}/api/v1/questions/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:prompt,inputType:imageDataUrl?'image':'text',intent:'generate_test',...(imageDataUrl?{imageDataUrl}:{})})});
    const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.error?.message||`Soru servisi ${response.status} hatası döndürdü.`);
    const parsed=extractCandidate(data);const questions=normalizeQuestions(parsed,optionCount);renderQuestions(questions,grade,optionCount);
  }catch(error){showMessage(error instanceof Error?error.message:'3 soru hazırlanamadı. Lütfen tekrar dene.')}
  finally{button.disabled=false;if(button.querySelector('strong'))button.querySelector('strong').textContent=original}
}

document.addEventListener('click',event=>{const target=event.target instanceof Element?event.target:null;const button=target?.closest('button.smartAction');if(!button)return;const text=(button.textContent||'').replace(/\s+/g,' ').trim();if(!text.includes('3 Soru Hazırla')&&!text.includes('Üretiliyor'))return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();generatePractice(button)},true);
