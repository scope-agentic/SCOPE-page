const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');
const ambient = document.querySelector('#ambient-particles');
const trail = document.querySelector('#cursor-trail');
const a = ambient.getContext('2d'), c = trail.getContext('2d');
const toggle = document.querySelector('.effects-toggle');
let language = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
let enabled = !reduced.matches, frame = 0, last = 0, width = 0, height = 0, particles = [], traces = [], pointer = {x:-1000,y:-1000};
let heroVisible = true;
try {if(localStorage.getItem('scope-effects')==='off')enabled=false;}catch{}
const colors = ['105,119,215','163,118,192','86,168,151','222,151,136'];
function resize() {
  width=innerWidth;height=innerHeight;
  const dpr=Math.min(devicePixelRatio||1,2);
  for(const canvas of [ambient,trail]) {canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;canvas.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
  particles=Array.from({length:Math.min(65,Math.max(24,Math.floor(width/22)))},(_,i)=>({x:Math.random()*width,y:Math.random()*height,r:1.1+Math.random()*1.7,vx:(Math.random()-.5)*.13,vy:-.07-Math.random()*.12,color:colors[i%colors.length],phase:Math.random()*Math.PI*2,cross:i%8===0}));
  traces=[];last=0;
}
function render(now) {
  frame=0;if(!enabled||document.hidden)return;
  const dt=last?Math.min(40,now-last)/16.67:1;last=now;
  a.clearRect(0,0,width,height);c.clearRect(0,0,width,height);
  if(heroVisible) {
    for(const p of particles) {
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.y< -10)p.y=height+10;if(p.x< -10)p.x=width+10;if(p.x>width+10)p.x=-10;
      const x=p.x+Math.sin(now*.00025+p.phase)*12;
      a.fillStyle=`rgba(${p.color},${.25+.16*Math.sin(now*.0005+p.phase)})`;
      if(p.cross){a.save();a.translate(x,p.y);a.rotate(now*.00006+p.phase);a.fillRect(-3.5,-.6,7,1.2);a.fillRect(-.6,-3.5,1.2,7);a.restore();}
      else {a.beginPath();a.arc(x,p.y,p.r,0,Math.PI*2);a.fill();}
    }
    for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){
      const p=particles[i],q=particles[j],dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy;
      if(d<10500){a.strokeStyle=`rgba(127,123,192,${.065*(1-d/10500)})`;a.lineWidth=.65;a.beginPath();a.moveTo(p.x,p.y);a.lineTo(q.x,q.y);a.stroke();}
    }
  }
  traces=traces.filter(p=>now-p.born<650);
  if(finePointer.matches&&traces.length>1){
    for(let i=1;i<traces.length;i++){
      const p=traces[i],q=traces[i-1],life=Math.max(0,1-(now-p.born)/650);
      c.strokeStyle=`rgba(${colors[p.color]},${life*.42})`;c.lineWidth=life*2.3;c.lineCap='round';c.beginPath();c.moveTo(q.x,q.y);c.lineTo(p.x,p.y);c.stroke();
      if(i%3===0){c.fillStyle=`rgba(${colors[p.color]},${life*.5})`;c.beginPath();c.arc(p.x+Math.sin(p.born)*5,p.y+Math.cos(p.born)*5,life*1.8,0,Math.PI*2);c.fill();}
    }
  }
  if(heroVisible||traces.length)frame=requestAnimationFrame(render);else last=0;
}
function schedule(){if(enabled&&!document.hidden&&!frame)frame=requestAnimationFrame(render);}
function label() {
  toggle.setAttribute('aria-pressed',String(enabled));
  toggle.querySelector('.effects-label').textContent=language==='zh'?(enabled?'动效已开':'动效已关'):(enabled?'Effects on':'Effects off');
  toggle.setAttribute('aria-label',language==='zh'?'切换装饰动效':'Toggle decorative motion');
}
function applyEffects() {
  document.body.classList.toggle('effects-off',!enabled);label();
  document.dispatchEvent(new CustomEvent('scope:effectschange',{detail:{enabled}}));
  cancelAnimationFrame(frame);frame=0;last=0;
  if(enabled)schedule();else {a.clearRect(0,0,width,height);c.clearRect(0,0,width,height);traces=[];clearBursts();}
}
toggle.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('scope-effects',enabled?'on':'off');}catch{}applyEffects();});
const wordmark=document.querySelector('.scope-wordmark');
function clearBursts(){document.querySelectorAll('.wordmark-particles').forEach(layer=>layer.remove());wordmark.dataset.bursting='false';}
wordmark.addEventListener('click',event=>{
  if(!enabled)return;
  const rect=wordmark.getBoundingClientRect();
  const x=event.detail>0?event.clientX:rect.left+rect.width/2;
  const y=event.detail>0?event.clientY:rect.top+rect.height/2;
  const layer=document.createElement('div');layer.className='wordmark-particles';layer.setAttribute('aria-hidden','true');layer.style.left=`${x}px`;layer.style.top=`${y}px`;
  const ring=document.createElement('span');ring.className='wordmark-particle-ring';layer.append(ring);
  for(let i=0;i<72;i++){
    const particle=document.createElement('i'),angle=i/72*Math.PI*2+(Math.random()-.5)*.18,distance=70+Math.random()*180;
    particle.className=i%7===0?'burst-star':i%3===0?'burst-petal':'burst-dot';
    particle.style.setProperty('--dx',`${Math.cos(angle)*distance}px`);
    particle.style.setProperty('--dy',`${Math.sin(angle)*distance+35}px`);
    particle.style.setProperty('--rotation',`${Math.random()*300}deg`);
    particle.style.setProperty('--particle-color',`rgb(${colors[i%colors.length]})`);
    particle.style.setProperty('--particle-size',`${3+Math.random()*5}px`);
    particle.style.setProperty('--particle-duration',`${800+Math.random()*550}ms`);
    layer.append(particle);
  }
  document.body.append(layer);wordmark.dataset.bursting='true';
  const layers=[...document.querySelectorAll('.wordmark-particles')];while(layers.length>3)layers.shift().remove();
  setTimeout(()=>{layer.remove();wordmark.dataset.bursting=String(Boolean(document.querySelector('.wordmark-particles')));},1450);
});
window.addEventListener('pagehide',clearBursts);
window.addEventListener('pointermove',e=>{
  if(!enabled||!finePointer.matches||e.pointerType==='touch')return;
  if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>2){pointer={x:e.clientX,y:e.clientY};traces.push({...pointer,born:performance.now(),color:Math.floor(performance.now()/200)%colors.length});if(traces.length>65)traces.shift();schedule();}
},{passive:true});
window.addEventListener('resize',()=>{resize();schedule();},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else schedule();});
reduced.addEventListener('change',e=>{enabled=!e.matches;applyEffects();});
new IntersectionObserver(([entry])=>{heroVisible=entry.isIntersecting;schedule();}).observe(document.querySelector('.hero'));
const expWords={heroScroll:['See how SCOPE learns','看看 SCOPE 如何学习'],chipFind:['Find the error','定位关键错误'],chipFindSub:['STEP-SPECIFIC SKILLS','步骤级技能'],chipBound:['Bound the signal','约束纠正强度'],chipBoundSub:['SIGNED · SELECTIVE','带符号 · 选择性'],chipReward:['Learn efficiently','更高效地学习'],chipRewardSub:['SUCCESS-RELATIVE','成功轨迹之间的比较']};
function translate(){document.querySelectorAll('[data-exp]').forEach(e=>{const text=expWords[e.dataset.exp];if(text)e.textContent=text[language==='zh'?1:0];});wordmark.setAttribute('aria-label',language==='zh'?'SCOPE, 点击绽放粒子':'SCOPE, activate a particle burst');label();}
document.addEventListener('scope:languagechange',e=>{language=e.detail.language;translate();});
// Section reveals never affect keyboard focus, browser find, or anchor destinations.
const reveal = new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');reveal.unobserve(e.target);}}),{threshold:.06});
document.querySelectorAll('.section-heading,.insight-pair article,.paper-figure,.method-lab,.benchmark-chart,.generalization,.analysis-pair>article').forEach(el=>{el.classList.add('experience-reveal');if(el.getBoundingClientRect().top<innerHeight||reduced.matches)el.classList.add('is-visible');else reveal.observe(el);});
document.addEventListener('focusin',e=>e.target.closest('.experience-reveal')?.classList.add('is-visible'));
let progressPending=false;
function progress(){const max=document.documentElement.scrollHeight-innerHeight;document.querySelector('.reading-progress>span').style.transform=`scaleX(${max>0?scrollY/max:0})`;progressPending=false;}
window.addEventListener('scroll',()=>{if(!progressPending){progressPending=true;requestAnimationFrame(progress);}},{passive:true});
resize();applyEffects();translate();progress();
