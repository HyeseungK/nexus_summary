/* ===== ask the author ===== */
/*RETR*/
(function(){
 var fab=$('askfab'),qa=$('qa'),log=$('qlog'),form=$('qform'),inp=$('qin'),send=$('qsend'),note=$('qa-note');
 var gear=$('qgear'),setBox=$('qset'),keyIn=$('qkey'),srcNote=$('qsrc'),fileIn=$('qfile');
 var PLAN_MODEL='claude-haiku-5-5',ANS_MODEL='claude-sonnet-5-5';
 var rt=null,KEY='',BOOK=null,IX=null,turns=[],busy=false,ctl=null,greeted=false;
 function store(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){}}
 function load(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
 function cname(c){return c==='prologue'?'Prologue':c==='epilogue'?'Epilogue':'Chapter '+c.slice(2)}
 var MAP=C.map(function(c){return cname(c.id)+' · '+c.title_en+' — '+c.thesis}).join('\n');

 /* ---------- backends: claude.ai runtime if present, otherwise the viewer's own API key ---------- */
 var sp=(window.claude&&claude.use)?claude.use('sample').catch(function(){return null}):Promise.resolve(null);
 function apiHeaders(){return{'content-type':'application/json','x-api-key':KEY,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'}}
 async function apiCall(model,messages,o){
  o=o||{};var acc='',r;
  try{r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:o.signal,headers:apiHeaders(),body:JSON.stringify({model:model,max_tokens:o.max||1500,stream:!!o.onText,messages:messages})})}
  catch(e){if(e&&e.name==='AbortError')throw{code:'cancelled',text:''};throw{code:'network'}}
  if(!r.ok){var j=null;try{j=await r.json()}catch(e){}var em=(j&&j.error&&j.error.message)||r.statusText||'';
   throw{code:r.status===401||r.status===403?'bad_key':r.status===429?'rate_limited':(r.status===400&&/credit|balance/i.test(em))?'no_credit':r.status===404?'model':'upstream_error',message:em}}
  if(!o.onText){var d=await r.json();return(d.content||[]).map(function(x){return x.text||''}).join('')}
  var rd=r.body.getReader(),dec=new TextDecoder(),buf='';
  try{while(true){var s=await rd.read();if(s.done)break;buf+=dec.decode(s.value,{stream:true});var parts=buf.split('\n\n');buf=parts.pop();
   parts.forEach(function(p){var m=/^data: (.*)$/m.exec(p);if(!m)return;var ev;try{ev=JSON.parse(m[1])}catch(e){return}
    if(ev.type==='content_block_delta'&&ev.delta&&ev.delta.text){acc+=ev.delta.text;o.onText({text:acc,delta:ev.delta.text})}
    else if(ev.type==='error'){throw{code:'upstream_error',text:acc}}})}}
  catch(e){if(e&&e.name==='AbortError')throw{code:'cancelled',text:acc};if(e&&e.code){e.text=acc;throw e}throw{code:'network',text:acc}}
  if(!acc.trim())throw{code:'empty_completion'};return acc}
 function parseJSON(t){var m=/\{[\s\S]*\}/.exec(t||'');if(!m)return null;try{return JSON.parse(m[0])}catch(e){return null}}
 async function planCall(prompt,sig){
  if(rt)return rt.json(prompt,{modelTier:'quick',signal:sig});
  return parseJSON(await apiCall(PLAN_MODEL,[{role:'user',content:prompt}],{signal:sig,max:300}))}
 async function answerCall(messages,sig,onText){
  if(rt){var res=await rt(messages,{modelTier:'default',cache:false,signal:sig,onText:onText});return res.text}
  return apiCall(ANS_MODEL,messages,{signal:sig,onText:onText,max:1500})}

 /* ---------- knowledge: the reader's own txt if loaded, otherwise the chapter summaries ---------- */
 function setBook(chunks){BOOK=chunks;IX=buildIndex(chunks)}
 function parseBook(txt){
  var L=txt.split('\n').map(function(l){return l.replace(/\f/g,'').trim()}),marks=[],seen={};
  L.forEach(function(l,i){var m=/^CHAPTER (\d+)$/.exec(l),id=null;
   if(m)id='ch'+m[1];else if(l==='Prologue')id='prologue';else if(l==='Epilogue')id='epilogue';
   if(id&&!seen[id]){seen[id]=1;marks.push([id,i])}
   else if(/^acknowledgments$/i.test(l)&&i>L.length*.5)marks.push(['end',i])});
  marks.sort(function(a,b){return a[1]-b[1]});
  var out=[];
  for(var k=0;k<marks.length;k++){var id=marks[k][0];if(id==='end')continue;var nxt=marks[k+1];if(!nxt)continue;
   var seg=L.slice(marks[k][1]+1,nxt[1]),paras=[],cur=[];
   seg.forEach(function(l){if(!l||l==='OceanofPDF.com'||/^\d{1,4}$/.test(l)){if(!l&&cur.length){paras.push(cur.join(' '));cur=[]}return}cur.push(l)});
   if(cur.length)paras.push(cur.join(' '));
   var sents=[];paras.forEach(function(p){p=p.replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim();if(p)sents=sents.concat(p.split(/(?<=[.!?”"])\s+(?=[A-Z“"‘'])/))});
   var c='';sents.forEach(function(s){if(c.length+s.length>1300&&c.length>500){out.push({c:id,t:c.trim()});c=''}c+=s+' '});if(c.trim())out.push({c:id,t:c.trim()})}
  var ids={};out.forEach(function(x){ids[x.c]=1});
  if(out.length<300||Object.keys(ids).length<12)return null;
  return out}
 function steps(){$('st1').classList.toggle('done',!!(KEY||rt));$('st2').classList.toggle('done',!!BOOK)}
 function showSrc(msg,cls){srcNote.textContent=msg;srcNote.className=cls||'';steps()}
 function refreshSrc(){
  if(BOOK){showSrc('현재 근거: 내 책 파일 (원문 '+BOOK.length+'구절)','ok')}
  else showSrc('현재 근거: 챕터 요약 자료 (책 파일을 불러오면 원문 근거로 바뀝니다)','')}
 function loadFile(f){
  if(!f)return;toggleSet(true);showSrc('파일을 읽는 중…','');
  var fr=new FileReader();fr.onload=function(){var ch=null;try{ch=parseBook(String(fr.result))}catch(e){}
   if(!ch){showSrc('이 파일에서 『Nexus』 영문 본문을 찾지 못했습니다. 책 전체가 들어 있는 txt인지 확인해 주세요.','bad');fileIn.value='';return}
   setBook(ch);try{store('nexus_book_v1',JSON.stringify(ch))}catch(e){}refreshSrc();
   addNote('원문 '+ch.length+'구절을 불러왔습니다.'+((KEY||rt)?' 이제 질문해 보세요.':' 이어서 위에 API 키를 저장해 주세요.'));if(KEY||rt)toggleSet(false)};
  fr.onerror=function(){showSrc('파일을 읽지 못했습니다.','bad')};fr.readAsText(f)}
 fileIn.addEventListener('change',function(){loadFile(fileIn.files&&fileIn.files[0])});
 var dragN=0,dm=$('qdragmsg');
 function hasFile(e){return e.dataTransfer&&[].slice.call(e.dataTransfer.types||[]).indexOf('Files')>=0}
 qa.addEventListener('dragenter',function(e){if(!hasFile(e))return;e.preventDefault();dragN++;qa.classList.add('dragging');dm.hidden=false});
 qa.addEventListener('dragover',function(e){if(hasFile(e))e.preventDefault()});
 qa.addEventListener('dragleave',function(e){if(!hasFile(e))return;dragN=Math.max(0,dragN-1);if(!dragN){qa.classList.remove('dragging');dm.hidden=true}});
 qa.addEventListener('drop',function(e){if(!hasFile(e))return;e.preventDefault();dragN=0;qa.classList.remove('dragging');dm.hidden=true;loadFile(e.dataTransfer.files[0])});
 window.addEventListener('dragover',function(e){if(hasFile(e))e.preventDefault()});window.addEventListener('drop',function(e){if(hasFile(e)&&!qa.contains(e.target))e.preventDefault()});
 $('qfiledel').onclick=function(){BOOK=null;IX=null;store('nexus_book_v1',null);fileIn.value='';refreshSrc()};
 /* local convenience: a book.txt next to index.html is picked up automatically (never served from the public Pages site, and git-ignored) */
 function autoBook(){
  if(BOOK||/github\.io$/.test(location.hostname)||location.protocol==='file:')return;
  fetch('book.txt',{cache:'no-store'}).then(function(r){return r.ok?r.text():null}).then(function(txt){
   if(!txt||BOOK)return;var ch=null;try{ch=parseBook(txt)}catch(e){}
   if(ch){setBook(ch);refreshSrc()}}).catch(function(){})}
 (function(){var s=load('nexus_book_v1');if(s){try{var ch=JSON.parse(s);if(ch&&ch.length>300)setBook(ch)}catch(e){}}refreshSrc();autoBook()})();

 function chapterCtx(id){var c=byId(id);if(!c)return'';
  return['['+cname(id)+': '+c.title_en+']','핵심 주장: '+c.thesis,'논증 흐름:\n'+c.flow.map(function(x,i){return(i+1)+') '+x}).join('\n'),
   '개념: '+c.key_concepts.map(function(k){return k.term+' = '+k.def}).join(' / '),'사례: '+c.cases.join(' / '),
   '대표 인용:\n'+c.quotes.map(function(q){return'"'+q.en+'" ('+q.ko+')'}).join('\n'),'요점: '+c.so_what].join('\n')}

 /* ---------- prompts ---------- */
 var RULES_BASE=[
  '당신은 Yuval Noah Harari의 책 『Nexus』를 바탕으로 독자의 질문에 답합니다. 저자가 독자와 마주 앉아 설명하듯 1인칭("나는", "이 책에서 나는")으로, 차분하고 구체적인 역사 사례와 비유를 들어 말하는 문체를 쓰되 아래 원칙을 지키세요.',
  '1. 근거: 책의 주장, 사례, 숫자, 인용은 __SRC__에 있는 내용만 사용합니다. 거기에 없는 사례나 수치, 인용을 지어내지 마세요.',
  '2. 책이 직접 다루지 않은 질문이면 먼저 "이 책에서 직접 다루지는 않았다"고 밝히고, 책의 논리를 연장한 생각은 "책의 논리를 연장하면"처럼 표시해 구분하세요. 책이 나온 2024년 이후의 사건은 아는 척하지 마세요.',
  '3. 인용: 핵심 문장 한두 개는 영어 원문 그대로(__QSRC__에서 복사) 인용하고, 답변 언어가 영어가 아니면 그 언어의 번역을 덧붙입니다. 형식은 줄 시작을 "> "로 하여 첫 줄에 영어 원문, 둘째 줄에 번역(답변이 영어면 생략), 마지막 줄에 "— Chapter 5" 또는 "— Prologue"처럼 출처를 씁니다.',
  '4. 언어: 항상 독자가 방금 질문한 언어로 답하세요. 한국어 질문이면 한국어, 영어 질문이면 영어, 일본어 질문이면 일본어처럼 질문의 언어를 그대로 따릅니다. 후속 질문(FOLLOWUP)도 같은 언어로 씁니다. 책 구조 요약이 한국어여도 답변 언어는 질문의 언어입니다.\n  분량과 형식: 4~8문장(질문이 단순하면 더 짧게). 마크다운은 **굵게**, 짧은 목록, 인용만 쓰고 제목(#)은 쓰지 마세요.',
  '5. 마지막 줄에 독자가 이어서 물을 만한, 책에서 답할 수 있는 후속 질문 두 개를 "FOLLOWUP: 질문1 | 질문2" 형식으로 쓰세요.',
  '이 답변이 책 내용에 기반한 AI의 답이며 저자 본인의 발언이 아니라는 점은 화면에 따로 표시되니 답변 안에서 반복하지 마세요.'].join('\n');
 function rules(){return BOOK?RULES_BASE.replace('__SRC__','[검색된 원문 구절]과 [책 구조 요약]').replace('__QSRC__','검색된 구절'):RULES_BASE.replace('__SRC__','[챕터 요약 자료]와 [책 구조 요약]').replace('__QSRC__','각 챕터의 "대표 인용"')}
 function lastCtx(){var lu=turns.length>=2?turns[turns.length-2].content:'',la=turns.length>=2?turns[turns.length-1].content.slice(0,300):'';return lu?'Previous question: '+lu+'\nPrevious answer (start): '+la:''}
 function planPromptBook(q){return['You turn a reader\'s question about Yuval Noah Harari\'s book "Nexus" into search queries for a full-text index of the book\'s English text.',
  'Reply with only JSON: {"queries":["...","...","..."]}',
  'Give 3 queries of 2-6 English words each, using vocabulary the book itself would use (for example "self-correcting mechanisms", "social credit system", "alignment problem", "intersubjective reality", "bureaucracy", "silicon curtain", "printing press", "algorithm engagement"). Make them different angles on the question. Resolve pronouns from the previous turn. Keep proper names in English.',
  lastCtx(),'Reader\'s question: '+q].filter(Boolean).join('\n\n')}
 function planPromptSum(q){return['Pick the chapters of Yuval Noah Harari\'s book "Nexus" that best answer the reader\'s question.',
  'Reply with only JSON: {"chapters":["ch5","ch9"]}  (1 to 3 ids from the list; use "prologue" or "epilogue" where they fit.)',
  'Chapters:\n'+C.map(function(c){return c.id+': '+c.title_en+' — '+c.thesis.slice(0,110)}).join('\n'),
  lastCtx(),'Reader\'s question: '+q].filter(Boolean).join('\n\n')}
 function buildInput(q,ctx){
  var m=[{role:'user',content:rules()+'\n\n[책 구조 요약]\n'+MAP}];
  turns.slice(-6).forEach(function(t){m.push(t)});
  m.push({role:'user',content:ctx.head+'\n'+(ctx.body||ctx.empty)+'\n\n[독자의 질문]\n'+q+'\n\n(Answer in the same language as the reader\'s question above. 위 질문과 같은 언어로 답하세요.)'});
  return m}
 var FATAL={not_granted:'Claude 사용이 허용되지 않아 답할 수 없습니다.',sampling_disabled:'이 계정에서는 Claude를 사용할 수 없습니다.',not_declared:'이 페이지에서는 Q&A를 사용할 수 없습니다.',capability_disabled:'이 보기에서는 Q&A를 사용할 수 없습니다.',capability_removed:'이 보기에서는 Q&A를 사용할 수 없습니다.',session_expired:'다시 로그인한 뒤 시도해 주세요.',rate_limited:'요청이 많거나 사용량 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요.',
  bad_key:'API 키가 올바르지 않거나 권한이 없습니다. 설정에서 키를 다시 확인해 주세요.',no_credit:'API 크레딧이 부족합니다. console.anthropic.com에서 확인해 주세요.',network:'네트워크 오류이거나 브라우저가 요청을 막았습니다. 연결을 확인하고 다시 시도해 주세요.',model:'모델을 사용할 수 없습니다. 계정에서 해당 모델 접근 권한을 확인해 주세요.'};
 var SUGG=['이 책의 핵심 주장을 한마디로 하면 무엇인가요?','정보가 늘어나면 왜 진실에 가까워지지 않나요?','민주주의와 독재는 정보 관점에서 어떻게 다른가요?','AI는 지금까지의 기술과 무엇이 다른가요?','실리콘 장막이란 무엇인가요?','AI 시대에 우리가 할 수 있는 일은 무엇인가요?'];

 /* ---------- panel ---------- */
 sp.then(function(s){rt=s;steps();if(s){$('qs-key').hidden=true;note.textContent='책 내용을 근거로 하라리의 말투로 답하는 AI입니다. 저자 본인의 발언이 아니며, 질문마다 내 Claude 사용량이 쓰입니다.'}
  else note.textContent='책 내용을 근거로 하라리의 말투로 답하는 AI입니다. 저자 본인의 발언이 아니며, 내 API 키로 호출되어 질문마다 사용 요금이 발생합니다.'});
 KEY=load('nexus_api_key');keyIn.value=KEY?'••••••••••••••••':'';steps();
 $('qkeysave').onclick=function(){var v=keyIn.value.trim();if(!v||/^•+$/.test(v))return;if(!/^sk-ant-/.test(v)){addNote('API 키 형식이 올바르지 않습니다. sk-ant- 로 시작해야 합니다.');return}
  KEY=v;store('nexus_api_key',v);keyIn.value='••••••••••••••••';steps();if(BOOK){toggleSet(false);addNote('API 키를 저장했습니다. 이제 질문해 보세요.')}else addNote('API 키를 저장했습니다. 이어서 책 txt를 넣거나, 건너뛰고 바로 질문해도 됩니다.')};
 $('qkeydel').onclick=function(){KEY='';store('nexus_api_key',null);keyIn.value='';steps();addNote('API 키를 삭제했습니다.')};
 keyIn.addEventListener('focus',function(){if(/^•+$/.test(keyIn.value))keyIn.value=''});
 function toggleSet(on){var o=on===undefined?setBox.hidden:on;setBox.hidden=!o;gear.setAttribute('aria-expanded',o)}
 gear.onclick=function(){toggleSet()};

 function openQA(){qa.classList.add('open');qa.setAttribute('aria-hidden','false');fab.hidden=true;
  if(matchMedia('(max-width:700px)').matches)document.documentElement.style.overflow='hidden';
  if(!greeted)greet();setTimeout(function(){if(!inp.disabled)inp.focus({preventScroll:true})},300)}
 function closeQA(){qa.classList.remove('open');qa.setAttribute('aria-hidden','true');fab.hidden=false;if(sheet.hidden)document.documentElement.style.overflow='';fab.focus({preventScroll:true})}
 fab.onclick=openQA;$('qx').onclick=closeQA;
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&qa.classList.contains('open')&&sheet.hidden)closeQA()});
 function greet(){greeted=true;
  log.appendChild(h('p',{class:'qhi'},[h('b',{text:'『Nexus』에 대해 무엇이든 물어보세요. '}),'책에서 근거를 찾아 답하고, 책이 다루지 않은 질문은 그렇다고 밝힙니다.']));
  var s=h('div',{class:'sugg',id:'sugg'});SUGG.forEach(function(q){var b=h('button',{type:'button',text:q});b.onclick=function(){ask(q)};s.appendChild(b)});log.appendChild(s);
  sp.then(function(x){var seen=load('nexus_setup_seen');store('nexus_setup_seen','1');
   if(!x&&!KEY){toggleSet(true);addNote('시작하려면 위 1단계에서 Anthropic API 키를 저장하고, 2단계에서 가지고 있는 책 txt를 끌어다 놓으세요.')}
   else if(!x&&!BOOK&&!seen){toggleSet(true);addNote('가지고 있는 책 txt를 위 상자에 끌어다 놓으면 원문을 근거로 답합니다. 건너뛰어도 됩니다.')}})}
 function addNote(t){var p=h('p',{class:'qhi',text:t});log.appendChild(p);toBottom()}
 function clearSugg(){var s=$('sugg');if(s)s.remove()}
 function nearBottom(){return log.scrollHeight-log.scrollTop-log.clientHeight<140}
 function toBottom(){log.scrollTop=log.scrollHeight}
 function setBusy(b){busy=b;send.textContent=b?'중지':'보내기';send.classList.toggle('stop',b);send.type=b?'button':'submit';inp.disabled=b}
 send.addEventListener('click',function(){if(busy&&ctl)ctl.abort()});

 function inline(el,s){s=s.replace(/^#+\s*/,'');s.split(/(\*\*[^*]+\*\*)/).forEach(function(x){if(/^\*\*[^*]+\*\*$/.test(x))el.appendChild(h('strong',{text:x.slice(2,-2)}));else if(x)el.appendChild(document.createTextNode(x))});return el}
 function quote(q){var bq=h('blockquote'),src=null,body=[];
  q.forEach(function(x){if(/^[—–-]\s*(Chapter|Prologue|Epilogue)/i.test(x))src=x;else if(x.trim())body.push(x)});
  body.forEach(function(x,i){var en=/[A-Za-z]/.test(x)&&!/[가-힣]/.test(x),sp_=h('span',en?{class:'en'}:{});sp_.textContent=x;bq.appendChild(sp_);if(!en&&i<body.length-1)bq.appendChild(document.createElement('br'))});
  if(src)bq.appendChild(h('span',{class:'src',text:src.replace(/^[—–-]\s*/,'')}));return bq}
 function md(text){var f=document.createDocumentFragment(),L=text.split('\n'),i=0;
  while(i<L.length){var l=L[i];
   if(/^>\s?/.test(l)){var q=[];while(i<L.length&&/^>\s?/.test(L[i])){q.push(L[i].replace(/^>\s?/,''));i++}f.appendChild(quote(q));continue}
   if(/^\s*[-*]\s+/.test(l)){var ul=h('ul');while(i<L.length&&/^\s*[-*]\s+/.test(L[i])){ul.appendChild(inline(h('li'),L[i].replace(/^\s*[-*]\s+/,'')));i++}f.appendChild(ul);continue}
   if(!l.trim()){i++;continue}
   var p=[];while(i<L.length&&L[i].trim()&&!/^>\s?/.test(L[i])&&!/^\s*[-*]\s+/.test(L[i])){p.push(L[i]);i++}
   f.appendChild(inline(h('p'),p.join(' ')))}
  return f}
 function body(t){return t.replace(/\n?\s*FOLLOWUP:[\s\S]*$/,'').trim()}
 function addUser(q){log.appendChild(h('div',{class:'msg u'},[h('div',{class:'bub',text:q})]));toBottom()}

 async function ask(q){
  q=(q||'').trim();if(!q||busy)return;
  var s=await sp;rt=s;
  if(!rt&&!KEY){toggleSet(true);addNote('질문하려면 먼저 Anthropic API 키를 저장해 주세요.');return}
  clearSugg();[].slice.call(log.querySelectorAll('.fu')).forEach(function(x){x.remove()});addUser(q);inp.value='';inp.style.height='';
  var bub=h('div',{class:'bub'}),stat=h('div',{class:'stat',text:'생각하는 중'}),m=h('div',{class:'msg a'},[stat,bub]);log.appendChild(m);toBottom();
  ctl=new AbortController();var sig=ctl.signal;setBusy(true);
  var t0=Date.now(),phase=BOOK?'질문을 검색어로 바꾸는 중':'관련 챕터를 고르는 중',tm=setInterval(function(){if(stat.isConnected)stat.textContent=phase+' · '+Math.round((Date.now()-t0)/1000)+'초'},1000);
  stat.textContent=phase;var got='',src={kind:'none',ids:[]};
  try{
   var ctx;
   if(BOOK){
    var queries=[];try{var plan=await planCall(planPromptBook(q),sig);queries=((plan&&plan.queries)||[]).filter(function(x){return typeof x==='string'&&x.trim()}).slice(0,4)}catch(e){if(e&&(e.code==='cancelled'||FATAL[e.code]))throw e}
    var ids=queries.length?search(IX,BOOK,queries,8):[];src={kind:'book',ids:ids};
    ctx={head:'[검색된 원문 구절]',empty:'(검색 결과 없음: 책 구조 요약만으로 답하고, 근거가 부족하면 그렇다고 밝히세요)',body:ids.map(function(i,n){return'['+(n+1)+'] '+cname(BOOK[i].c)+'\n'+BOOK[i].t}).join('\n\n')};
    phase=ids.length?'원문 '+ids.length+'구절을 읽고 답을 쓰는 중':'답을 쓰는 중'}
   else{
    var chs=[];try{var pl=await planCall(planPromptSum(q),sig);chs=((pl&&pl.chapters)||[]).filter(function(x){return typeof x==='string'&&byId(x)}).slice(0,3)}catch(e){if(e&&(e.code==='cancelled'||FATAL[e.code]))throw e}
    src={kind:'sum',ids:chs};
    ctx={head:'[챕터 요약 자료]',empty:'(선택된 챕터 없음: 책 구조 요약만으로 답하고, 근거가 부족하면 그렇다고 밝히세요)',body:chs.map(chapterCtx).join('\n\n')};
    phase=chs.length?chs.map(cname).join(', ')+' 자료를 읽고 답을 쓰는 중':'답을 쓰는 중'}
   stat.textContent=phase;
   var text=await answerCall(buildInput(q,ctx),sig,function(u){got=u.text;if(stat.isConnected)stat.remove();var nb=nearBottom();bub.replaceChildren(md(body(got)));if(nb)toBottom()});
   got=text;finish(m,bub,stat,got,src,q)
  }catch(e){
   if(e&&e.text)got=e.text;
   if(stat.isConnected)stat.remove();
   if(got.trim())bub.replaceChildren(md(body(got)));
   var code=e&&e.code,msg_=code==='cancelled'?'답변을 중지했습니다.':(FATAL[code]||'답변을 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
   if(e&&e.message&&(code==='upstream_error'||code==='model'))msg_+=' ('+String(e.message).slice(0,120)+')';
   m.appendChild(h('p',{class:'err',text:msg_}));
   if(code==='bad_key')toggleSet(true);
   if(code==='cancelled'&&got.trim())addSources(m,src);
  }finally{clearInterval(tm);setBusy(false);ctl=null;if(!inp.disabled&&qa.classList.contains('open'))inp.focus({preventScroll:true});toBottom()}}
 function finish(m,bub,stat,text,src,q){
  if(stat.isConnected)stat.remove();bub.replaceChildren(md(body(text)));
  turns.push({role:'user',content:q});turns.push({role:'assistant',content:body(text)});if(turns.length>8)turns=turns.slice(-8);
  addSources(m,src);
  var fm=/FOLLOWUP:\s*([^\n]+)/.exec(text);
  if(fm){var fu=h('div',{class:'fu'});fm[1].split('|').map(function(x){return x.trim()}).filter(Boolean).slice(0,2).forEach(function(x){var b=h('button',{type:'button',text:x});b.onclick=function(){ask(x)};fu.appendChild(b)});if(fu.children.length)m.appendChild(fu)}}
 function addSources(m,src){
  if(!src||!src.ids.length)return;
  var ol=h('ol');
  if(src.kind==='book')src.ids.forEach(function(i){var c=BOOK[i],id=c.c,b=h('button',{type:'button',text:'챕터 카드 열기'});b.onclick=function(){openSheet(id,b)};
   ol.appendChild(h('li',null,[h('b',{text:cname(id)}),b,h('br'),(c.t.length>230?c.t.slice(0,230)+'…':c.t)]))});
  else src.ids.forEach(function(id){var c=byId(id),b=h('button',{type:'button',text:'챕터 카드 열기'});b.onclick=function(){openSheet(id,b)};
   ol.appendChild(h('li',null,[h('b',{text:cname(id)}),b,h('br'),ko(c)+': '+c.so_what]))});
  m.appendChild(h('details',{class:'srcs'},[h('summary',{text:src.kind==='book'?'검색된 원문 '+src.ids.length+'구절':'참고한 챕터 요약 '+src.ids.length+'개'}),ol]))}

 form.addEventListener('submit',function(e){e.preventDefault();if(!busy)ask(inp.value)});
 inp.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();if(!busy)ask(inp.value)}});
 inp.addEventListener('input',function(){inp.style.height='auto';inp.style.height=Math.min(140,inp.scrollHeight)+'px'});
})();
