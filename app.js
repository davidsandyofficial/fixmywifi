'use strict';
if(window.top!==window.self){document.documentElement.style.display='none';try{window.top.location=window.self.location}catch(e){}}
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get:(k,d)=>{try{const v=JSON.parse(localStorage.getItem('fmw_'+k));return v==null?d:clean(k,v,d)}catch{return d}},set:(k,v)=>localStorage.setItem('fmw_'+k,JSON.stringify(v))};
const num=(v,max=1e5)=>{v=+v;return Number.isFinite(v)&&v>=0?Math.min(v,max):0},str=(v,n=24)=>String(v??'').slice(0,n),ID=/^r\d{1,16}$/;
const cleanR=r=>r&&typeof r==='object'?{t:num(r.t,9e15),down:num(r.down),up:num(r.up),ping:num(r.ping),jitter:num(r.jitter),room:ID.test(r.room)?r.room:''}:null;
function clean(k,v,d){try{if(k==='hist')return Array.isArray(v)?v.map(cleanR).filter(Boolean).slice(-200):d;
 if(k==='rooms')return Array.isArray(v)?v.filter(r=>r&&ID.test(r.id)).slice(0,30).map(r=>{const o={id:r.id,name:str(r.name)};if(r.last)o.last=cleanR(r.last);return o}):d;
 if(k==='done'){const o={};if(v&&typeof v==='object')for(const x in v)if(/^[a-z]{2,10}$/.test(x))o[x]=!!v[x];return o}
 if(k==='quiz'){if(!v||typeof v!=='object')return d;const o={};for(const[q,,opts,m]of Q){const x=v[q];o[q]=m?(Array.isArray(x)?x.filter(i=>Number.isInteger(i)&&i>=0&&i<opts.length):[]):(Number.isInteger(x)&&x>=0&&x<opts.length?x:undefined)}return o}}catch{}return d}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2600)}
function amz(q){const u=new URL('https://www.amazon.com/s');u.searchParams.set('k',q);if(AMAZON_TAG)u.searchParams.set('tag',AMAZON_TAG);return u.href}
// ---------- navigation
function go(v){$$('.view').forEach(e=>e.classList.toggle('on',e.id==='v-'+v));$$('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));if(v==='hist')drawHist();if(v==='plan')renderPlan();history.replaceState(null,'','#'+v);window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-v]').forEach(b=>b.onclick=()=>go(b.dataset.v));
document.addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});
const applyW=root=>root.querySelectorAll('[data-w]').forEach(e=>{e.style.width=e.dataset.w+'%';if(e.dataset.c)e.style.background=e.dataset.c});
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;const i='12345'.indexOf(e.key);if(i>=0)go(['test','rooms','diag','plan','hist'][i])});
// ---------- speed test (Cloudflare public endpoints, CORS-enabled)
const CF='https://speed.cloudflare.com';
function setGauge(v,max,unit,phase){const p=Math.min(1,Math.log10(1+v)/Math.log10(1+max));$('#garc').style.strokeDashoffset=252*(1-p);$('#gval').textContent=v>=100?Math.round(v):v.toFixed(1);$('#gunit').textContent=unit;if(phase)$('#gphase').textContent=phase}
async function ping(n=12){const t=[];for(let i=0;i<n;i++){const s=performance.now();await fetch(CF+'/__down?bytes=0&r='+Math.random(),{cache:'no-store'});t.push(performance.now()-s);setGauge(t[t.length-1],300,'ms','Measuring ping…')}t.sort((a,b)=>a-b);const k=t.slice(0,Math.ceil(n*.7)),med=t[Math.floor(n/2)];let j=0;for(let i=1;i<k.length;i++)j+=Math.abs(k[i]-k[i-1]);return{ping:med,jitter:j/Math.max(1,k.length-1)}}
async function down(ms=7000){const st=performance.now();let bytes=0,size=1e6;const tick=()=>{const s=(performance.now()-st)/1000;setGauge(bytes*8/s/1e6,1000,'Mbps','Downloading…')};
 const worker=async()=>{while(performance.now()-st<ms){const r=await fetch(CF+'/__down?bytes='+size+'&r='+Math.random(),{cache:'no-store'});const rd=r.body.getReader();for(;;){const{done,value}=await rd.read();if(done)break;bytes+=value.length;tick();if(performance.now()-st>ms+1500){rd.cancel();break}}if(size<25e6)size*=2}};
 await Promise.all([worker(),worker(),worker()]);return bytes*8/((performance.now()-st)/1000)/1e6}
async function up(ms=6000){const st=performance.now();let bytes=0;const blob=new Uint8Array(2e6);
 const worker=async()=>{while(performance.now()-st<ms){await fetch(CF+'/__up?r='+Math.random(),{method:'POST',body:blob,cache:'no-store'});bytes+=blob.length;setGauge(bytes*8/((performance.now()-st)/1000)/1e6,1000,'Mbps','Uploading…')}};
 await Promise.all([worker(),worker()]);return bytes*8/((performance.now()-st)/1000)/1e6}
let running=false;
async function runTest(roomId){if(running)return;running=true;const b=$('#runBtn');b.disabled=true;b.textContent='Testing…';['#sDown','#sUp','#sPing','#sJit'].forEach(s=>$(s).textContent='…');
 try{if(!navigator.onLine)throw new Error('offline');const p=await ping();$('#sPing').textContent=Math.round(p.ping)+' ms';$('#sJit').textContent=Math.round(p.jitter)+' ms';
  const d=await down();$('#sDown').textContent=d.toFixed(1);const u=await up();$('#sUp').textContent=u.toFixed(1);setGauge(d,1000,'Mbps','Done ✓');
  const room=roomId||$('#roomSel').value;const r={t:Date.now(),down:+d.toFixed(1),up:+u.toFixed(1),ping:Math.round(p.ping),jitter:Math.round(p.jitter),room};
  const h=LS.get('hist',[]);h.push(r);LS.set('hist',h.slice(-200));const rooms=LS.get('rooms',defRooms());const rm=rooms.find(x=>x.id===room);if(rm){rm.last=r;LS.set('rooms',rooms)}
  showVerdict(r);renderRooms();renderSummary();toast('Saved to your history');
 }catch(e){$('#gphase').textContent=e.message==='offline'?'You look offline. Reconnect and try again.':'Test server unreachable. Try again in a moment.';['#sDown','#sUp','#sPing','#sJit'].forEach(s=>$(s).textContent='–')}
 b.disabled=false;b.textContent='Test again';running=false}
$('#runBtn').onclick=()=>runTest();
const USES=[['📺','4K streaming',r=>r.down>=25],['🎮','Online gaming',r=>r.ping<=50&&r.jitter<=15],['💼','Video calls',r=>r.down>=5&&r.up>=3&&r.jitter<=30],['📤','Posting videos',r=>r.up>=10],['👨‍👩‍👧','4+ people at once',r=>r.down>=100]];
function grade(r){let s=0;s+=Math.min(40,r.down/250*40);s+=Math.min(20,r.up/50*20);s+=Math.max(0,25-Math.max(0,r.ping-15)/4);s+=Math.max(0,15-r.jitter/2);s=Math.round(s);return{s,g:s>=85?'A':s>=70?'B':s>=55?'C':s>=40?'D':'F'}}
function showVerdict(r){const g=grade(r);const v=$('#verdict');v.hidden=false;
 v.innerHTML=`<h2>Grade ${g.g} <span class="muted small">(${g.s}/100)</span></h2><div class="uses">${USES.map(([i,n,f])=>`<div class="use"><b>${i} ${n}</b><span class="${f(r)?'ok':'bad'}">${f(r)?'Good to go':'Struggles'}</span></div>`).join('')}</div>
 <p class="muted small">${r.ping>80?'High ping usually means a busy or far WiFi link. Test next to the router to compare.':r.down<25?'Low download. Check it next to the router: if it is much faster there, it is a WiFi coverage problem, not your plan.':'Solid. Now test the rooms where it feels slow.'}</p>
 <div class="row wrap"><button class="btn" data-go="rooms">Map my rooms →</button><button class="btn ghost" data-go="diag">Get my fix plan</button></div>`}
// ---------- rooms
function defRooms(){return[{id:'r1',name:'Next to router'},{id:'r2',name:'Bedroom'},{id:'r3',name:'Living room'}]}
function lvl(d){return d>=100?['ok','#34d399','Strong']:d>=25?['meh','#fbbf24','OK']:['bad','#f87171','Dead zone']}
function renderRooms(){const rooms=LS.get('rooms',defRooms());const sel=$('#roomSel');const cur=sel.value;sel.innerHTML=rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');if(cur)sel.value=cur;
 $('#roomList').innerHTML=rooms.map(r=>{const l=r.last?lvl(r.last.down):null;return`<div class="room"><button class="x" aria-label="Remove ${esc(r.name)}" data-del="${r.id}">×</button><b>${esc(r.name)}</b>
 ${l?`<div class="lvl"><i data-w="${Math.min(100,Math.log10(1+r.last.down)/3*100)}" data-c="${l[1]}"></i></div><span class="${l[0]}">${l[2]}</span> · ${r.last.down} Mbps · ${r.last.ping} ms`:'<p class="muted small">Not tested yet</p>'}
 <div><button class="btn small mt8" data-test="${r.id}">${r.last?'Retest':'Test here'}</button></div></div>`}).join('');applyW($('#roomList'));
 $$('[data-del]').forEach(b=>b.onclick=()=>{LS.set('rooms',LS.get('rooms',defRooms()).filter(x=>x.id!==b.dataset.del));renderRooms()});
 $$('[data-test]').forEach(b=>b.onclick=()=>{$('#roomSel').value=b.dataset.test;go('test');runTest(b.dataset.test)})}
$('#roomForm').onsubmit=e=>{e.preventDefault();const n=$('#roomName').value.trim();if(!n)return;const r=LS.get('rooms',defRooms());r.push({id:'r'+Date.now(),name:n});LS.set('rooms',r);$('#roomName').value='';renderRooms();toast('Room added. Go there and tap Test here.')};
// ---------- quiz
const Q=[['size','How big is your home?',['Apartment / small','Medium house','Large / 3+ floors']],['where','Where is your router?',['Central & up high','In a corner / closet','On the floor / behind TV','No idea']],
 ['age','How old is your router?',['Under 3 years','3–6 years','6+ years / from my ISP','Not sure']],['sym','What bugs you most? (pick any)',['Slow in certain rooms','Drops out randomly','Slow in the evening','Laggy gaming','Video calls freeze','Slow on everything'],1],
 ['dev','Devices on your WiFi?',['Under 10','10–25','25+ (smart home)']],['wired','Any device that never moves (TV, console, desk PC)?',['Yes','No']],['mesh','Already have extenders or mesh?',['No','Extender','Mesh system']]];
function renderQuiz(){const a=LS.get('quiz',{});$('#quiz').innerHTML=Q.map(([k,t,o,m])=>`<div class="q"><p>${t}</p><div class="chips">${o.map((x,i)=>`<label><input type="${m?'checkbox':'radio'}" name="${k}" value="${i}" ${(m?(a[k]||[]).includes(i):a[k]===i)?'checked':''}><span>${x}</span></label>`).join('')}</div></div>`).join('')+'<button class="btn big">Build my fix plan →</button>'}
$('#quiz').onsubmit=e=>{e.preventDefault();const a={};Q.forEach(([k,,,m])=>{const v=$$(`#quiz [name=${k}]:checked`).map(x=>+x.value);a[k]=m?v:v[0]});LS.set('quiz',a);LS.set('done',{});go('plan');toast('Your plan is ready')};
// ---------- plan engine
const GEAR={mesh:['Mesh WiFi system','wifi 6 mesh system','Covers big or multi-floor homes with one network. Best fix for multiple dead zones.'],
 router:['WiFi 6 / 6E router','wifi 6 router','Old or ISP-rental routers struggle with many devices. A modern router handles 25+ at once.'],
 cable:['Cat 6 Ethernet cable','cat 6 ethernet cable flat','Wire anything that never moves. Wired = full speed and zero lag.'],
 moca:['MoCA 2.5 adapters','moca 2.5 adapter','Turns your coax TV jacks into wired internet in other rooms, no new wires.'],
 powerline:['Powerline adapter kit','powerline ethernet adapter','Sends internet over your power outlets to a far room.'],
 usb:['WiFi 6 USB adapter','wifi 6 usb adapter','Gives an older laptop or desktop a modern, faster WiFi radio.'],
 mount:['Router wall mount / shelf','router wall mount','Get the router off the floor and out in the open: free-ish fix, real gain.'],
 plug:['Smart plug','smart plug','Schedule a 4 a.m. router reboot so random drop-outs fade away.'],
 switch:['Gigabit Ethernet switch','gigabit ethernet switch 5 port','Wire the TV, console and streaming box behind the TV together.']};
function buildPlan(){const a=LS.get('quiz',null);const rooms=LS.get('rooms',defRooms());const h=LS.get('hist',[]);const dead=rooms.filter(r=>r.last&&r.last.down<25);const S=[];const sym=a?a.sym||[]:[];
 const add=(id,t,how,gear)=>S.push({id,t,how,gear:gear||[],free:!gear});
 if(!h.length)add('base','Run a baseline test next to the router','Shows whether the problem is your plan (slow even here) or your WiFi (fast here, slow elsewhere).');
 if(!a){add('quiz','Take the 60-second checkup','Your plan gets personalized after it.');return S}
 add('reboot','Restart modem + router the right way','Unplug both for 30 seconds, plug in the modem first, wait 2 minutes, then the router.');
 if(a.where!==0)add('move','Move the router central, up high, in the open','Walls, floors, fish tanks and TVs block WiFi. Even 2 metres higher and out of a cabinet helps a lot.',a.where===2?['mount']:null);
 add('band','Use 5 GHz (or 6 GHz) where you can','Near the router, join the 5 GHz network. 2.4 GHz reaches further but is much slower and crowded.');
 if(sym.includes(2))add('evening','Test at 8 p.m. vs 8 a.m.','If only evenings are slow next to the router, it is ISP congestion. Save both results in History and show your ISP.');
 if(sym.includes(1))add('drops','Stop random drop-outs','Update router firmware, set a nightly reboot, and move it away from microwaves and baby monitors.',['plug']);
 if(a.wired===0)add('wire','Plug in the stuff that never moves','TV, console and desk PC on a cable free WiFi airtime for phones and laptops.',['cable','switch']);
 if(sym.includes(3)||sym.includes(4))add('qos','Turn on QoS / gaming or call priority','Most router apps have it. Then wire the console or work PC for the lowest lag.',['cable']);
 if(a.age===2||a.dev===2||(a.age===1&&a.dev>=1))add('upgrade','Upgrade the router','An old or ISP-rental router is the bottleneck with lots of devices.',['router']);
 if(dead.length||a.size===2||sym.includes(0))add('coverage',dead.length?`Fix the dead zone${dead.length>1?'s':''}: ${dead.map(r=>r.name).join(', ')}`:'Fix far-room coverage',a.mesh===1?'Extenders halve speed. Swap for mesh, ideally wired between nodes.':'Place mesh nodes halfway between the router and the weak room (not inside it). Wire them if you can.',a.size===0?['mesh','powerline']:['mesh','moca','powerline']);
 if(sym.includes(5))add('old','Check the device, not just the WiFi','If one old laptop is slow everywhere, its WiFi card is the problem.',['usb']);
 add('retest','Retest every room after each fix','Watch your before → after in History.');return S}
function renderPlan(){const S=buildPlan(),d=LS.get('done',{});const n=S.filter(s=>d[s.id]).length,p=S.length?Math.round(n/S.length*100):0;
 $('#planPct').textContent=p+'%';$('#planBar').style.width=p+'%';
 $('#planList').innerHTML=S.map((s,i)=>`<label class="step ${d[s.id]?'done':''}"><input type="checkbox" data-s="${s.id}" ${d[s.id]?'checked':''}><div><b>${i+1}. ${esc(s.t)}</b><span class="tag ${s.free?'':'buy'}">${s.free?'Free':'Gear helps'}</span><div class="small muted">${esc(s.how)}</div></div></label>`).join('');
 $$('[data-s]').forEach(c=>c.onchange=()=>{const d=LS.get('done',{});d[c.dataset.s]=c.checked;LS.set('done',d);renderPlan();renderSummary();if(c.checked)toast('Nice. Retest to see the difference.')});
 const keys=[...new Set(S.flatMap(s=>s.gear))];$('#gearCard').hidden=!keys.length;
 $('#gear').innerHTML=keys.map(k=>{const[g,q,w]=GEAR[k];const step=S.find(s=>s.gear.includes(k));return`<div class="prod"><b>${g}</b><div class="small">For: ${esc(step.t)}</div><div class="why">${w}</div><a class="btn ghost" href="${amz(q)}" target="_blank" rel="sponsored nofollow noopener">Compare on Amazon ↗</a></div>`}).join('')}
$('#resetPlan').onclick=()=>{LS.set('done',{});LS.set('quiz',null);renderQuiz();go('diag')};
$('#icsBtn').onclick=()=>{const t=new Date(Date.now()+7*864e5);t.setHours(19,0,0,0);const f=x=>x.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';const e=new Date(t.getTime()+9e5);
 const ics=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FixMyWiFi//EN\r\nBEGIN:VEVENT\r\nUID:${Date.now()}@fixmywifi\r\nDTSTAMP:${f(new Date())}\r\nDTSTART:${f(t)}\r\nDTEND:${f(e)}\r\nSUMMARY:Retest my WiFi (FixMyWiFi)\r\nDESCRIPTION:${SITE_URL}#test\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.download='retest-wifi.ics';a.click();toast('Calendar reminder downloaded')};
// ---------- history
function drawHist(){const h=LS.get('hist',[]),c=$('#chart'),x=c.getContext('2d'),W=c.width=c.clientWidth*devicePixelRatio,H=c.height=180*devicePixelRatio;x.clearRect(0,0,W,H);
 if(h.length<1){x.fillStyle='#94a0c8';x.font=`${14*devicePixelRatio}px system-ui`;x.fillText('Run a test to start your history',20*devicePixelRatio,H/2)}else{const m=Math.max(...h.map(r=>r.down))*1.15||1,pad=14*devicePixelRatio;
 x.strokeStyle='#22d3ee';x.lineWidth=3*devicePixelRatio;x.beginPath();h.forEach((r,i)=>{const X=pad+(W-2*pad)*(h.length>1?i/(h.length-1):.5),Y=H-pad-(H-2*pad)*r.down/m;i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();
 h.forEach((r,i)=>{const X=pad+(W-2*pad)*(h.length>1?i/(h.length-1):.5),Y=H-pad-(H-2*pad)*r.down/m;x.fillStyle='#a78bfa';x.beginPath();x.arc(X,Y,4*devicePixelRatio,0,7);x.fill()})}
 const rn=id=>(LS.get('rooms',defRooms()).find(r=>r.id===id)||{}).name||'';
 if(h.length){const f=h[0],l=h[h.length-1];$('#beforeAfter').innerHTML=`<div><small class="muted">First test</small><b>${f.down}</b><small>Mbps · ${f.ping} ms</small></div><div><small class="muted">Latest</small><b class="${l.down>=f.down?'ok':'bad'}">${l.down}</b><small>Mbps · ${l.ping} ms</small></div>`}else $('#beforeAfter').innerHTML='';
 $('#histList').innerHTML=h.slice().reverse().slice(0,30).map(r=>`<div><span>${new Date(r.t).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span><span class="muted">${esc(rn(r.room))}</span><b>${r.down}↓ ${r.up}↑ ${r.ping}ms</b></div>`).join('')}
$('#clearHist').onclick=()=>{if(confirm('Delete all saved tests on this device?')){LS.set('hist',[]);const r=LS.get('rooms',defRooms());r.forEach(x=>delete x.last);LS.set('rooms',r);drawHist();renderRooms();renderSummary()}};
function shareText(){const h=LS.get('hist',[]);if(!h.length)return'Finally figured out why my WiFi is slow 👀 Free, private WiFi doctor:';const f=h[0],l=h[h.length-1],g=grade(l).g;
 return h.length>1&&l.down>f.down*1.2?`My WiFi went from ${f.down} → ${l.down} Mbps 🚀 (grade ${g}). Found my dead zones + fixed them with a free checkup:`:`My WiFi got a ${g} 😬 (${l.down} Mbps, ${l.ping} ms ping). Finding my dead zones with this free tool:`}
$('#shareX').onclick=()=>window.open('https://x.com/intent/post?text='+encodeURIComponent(shareText()+' '+SITE_URL+' via @'+X_HANDLE),'_blank','noopener');
$('#shareImg').onclick=async()=>{const h=LS.get('hist',[]);if(!h.length)return toast('Run a test first');const l=h[h.length-1],f=h[0],g=grade(l);const c=document.createElement('canvas');c.width=1200;c.height=675;const x=c.getContext('2d');
 const gr=x.createLinearGradient(0,0,1200,675);gr.addColorStop(0,'#0b1020');gr.addColorStop(1,'#1d2a5a');x.fillStyle=gr;x.fillRect(0,0,1200,675);
 x.fillStyle='#22d3ee';x.font='bold 44px system-ui';x.fillText('FixMyWiFi',60,90);x.fillStyle='#fff';x.font='900 220px system-ui';x.fillText(g.g,60,330);
 x.font='bold 64px system-ui';x.fillText(`${l.down} Mbps ↓`,360,210);x.fillStyle='#94a0c8';x.font='40px system-ui';x.fillText(`${l.up} Mbps ↑ · ${l.ping} ms ping · ${l.jitter} ms jitter`,360,280);
 if(h.length>1){x.fillStyle='#34d399';x.font='bold 48px system-ui';x.fillText(`Before ${f.down} → now ${l.down} Mbps`,60,450)}
 const rooms=LS.get('rooms',defRooms()).filter(r=>r.last);x.font='30px system-ui';rooms.slice(0,4).forEach((r,i)=>{const L=lvl(r.last.down);x.fillStyle=L[1];x.fillRect(60+i*275,500,250,8);x.fillStyle='#e8ecff';x.fillText(r.name.slice(0,14),60+i*275,550)});
 x.fillStyle='#94a0c8';x.font='28px system-ui';x.fillText('Free WiFi checkup · davidsandyofficial.github.io/fixmywifi · by @DavidSandy',60,630);
 const blob=await new Promise(r=>c.toBlob(r,'image/png'));const file=new File([blob],'my-wifi.png',{type:'image/png'});
 if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],text:shareText()+' '+SITE_URL})}catch{}}else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='my-wifi.png';a.click();toast('Image saved. Attach it to your post!')}};
function renderSummary(){const h=LS.get('hist',[]);if(h.length){const g=grade(h[h.length-1]);$('#score').textContent=g.g;$('#scoreTxt').textContent=`${g.s}/100 · ${h.length} test${h.length>1?'s':''} saved on this device`}
 const S=buildPlan(),d=LS.get('done',{});$('#sumPlan').innerHTML=`<div class="bar"><i data-w="${S.length?S.filter(s=>d[s.id]).length/S.length*100:0}"></i></div>${S.filter(s=>!d[s.id]).slice(0,3).map(s=>'→ '+esc(s.t)).join('<br>')}`;applyW($('#sumPlan'))}
// ---------- install
let dp;addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(dp){dp.prompt();await dp.userChoice;dp=null;$('#installBtn').hidden=true}};
if(/iphone|ipad/i.test(navigator.userAgent)&&!navigator.standalone){$('#installBtn').hidden=false;$('#installBtn').onclick=()=>toast('Tap Share, then “Add to Home Screen”')}
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
renderRooms();renderQuiz();renderSummary();const h0=LS.get('hist',[]);if(h0.length){const l=h0[h0.length-1];showVerdict(l);$('#sDown').textContent=l.down;$('#sUp').textContent=l.up;$('#sPing').textContent=l.ping+' ms';$('#sJit').textContent=l.jitter+' ms';setGauge(l.down,1000,'Mbps','Last test')}
const hv=location.hash.slice(1,10);if(['rooms','diag','plan','hist'].includes(hv))go(hv);
