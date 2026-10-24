const root=document.querySelector('#motivation-demos');
const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)];
let language=document.documentElement.lang==='zh-CN'?'zh':'en';
const copy={en:{outcomeTag:'OUTCOME ≠ STEP QUALITY',outcomeIntro:'An agent can recover from mistakes and succeed. A failed trajectory can still contain good decisions.',trajectoryA:'Trajectory A',trajectoryB:'Trajectory B',success:'Success',failure:'Failure',correct:'Correct step',error:'Error step',successErrors:'of steps in successes are errors',failureCorrect:'of steps in failures are correct',coverageTag:'TRAJECTORY-LEVEL SKILL, OFF-TARGET SIGNAL',coverageIntro:'One hindsight skill conditions the teacher for an entire trajectory, including decisions unrelated to that skill.',teacher:'SKILL-CONDITIONED TEACHER',skill:'“Check the product constraints.”',allSteps:'One trajectory-level skill → every step',related:'Skill-related',unrelated:'Skill-unrelated',relatedShort:'related',unrelatedShort:'other',offtargetMetric:'of nonzero sampled-token gaps occur at skill-unrelated steps',observe:'Follow the agent’s decisions, one step at a time.',mixed:'Both trajectories contain correct decisions and errors.',skillPhase:'A trajectory-level skill is added to the teacher’s context.',sendPhase:'The same teacher context produces supervision at every step.',offtargetPhase:'Even unrelated steps can receive a shifted teacher preference.',signal:'Signal',step:'Step'},zh:{outcomeTag:'轨迹结果 ≠ 步骤质量',outcomeIntro:'智能体可以犯错后纠正并成功, 失败轨迹中也可能包含正确决策.',trajectoryA:'轨迹 A',trajectoryB:'轨迹 B',success:'成功',failure:'失败',correct:'正确步骤',error:'错误步骤',successErrors:'成功轨迹中的步骤是错误的',failureCorrect:'失败轨迹中的步骤是正确的',coverageTag:'轨迹级技能, 非目标步骤的信号',coverageIntro:'同一条后见 skill 为整条轨迹的教师提供条件, 连与该 skill 无关的决策也会接受监督.',teacher:'携带 SKILL 的教师',skill:'「检查商品是否满足需求.」',allSteps:'一条轨迹级 skill → 每个步骤',related:'与 skill 相关',unrelated:'与 skill 无关',relatedShort:'相关',unrelatedShort:'无关',offtargetMetric:'非零采样 token 差值出现在与 skill 无关的步骤',observe:'逐步观察智能体的决策过程.',mixed:'两条轨迹中, 都同时存在正确决策与错误.',skillPhase:'将一条轨迹级 skill 加入教师上下文.',sendPhase:'同一教师上下文向每个步骤传递监督信号.',offtargetPhase:'与 skill 无关的步骤, 也可能出现教师偏好偏移.',signal:'监督',step:'步骤'}};
const t=k=>copy[language][k];
const robot=`<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 5v5M15 5h6M8 15H5v10h3M28 15h3v10h-3"/><rect x="8" y="10" width="20" height="19" rx="7"/><circle cx="14" cy="19" r="1.6"/><circle cx="22" cy="19" r="1.6"/><path d="M14 24h8"/></svg>`;
$$('.motivation-agent,.teacher-agent').forEach(e=>{e.innerHTML=robot;});
const quality={success:[true,false,true,true,false,true],failure:[true,true,false,true,true,false]};
const paths=new Map();
for(const [name,values] of Object.entries(quality)){
 const target=$(`[data-track="${name}"] .motivation-steps`);
 values.forEach((good,i)=>{const el=document.createElement('div');el.className=`motivation-step ${good?'step-correct':'step-error'}`;el.innerHTML=`<span>a<sub>${i+1}</sub></span><b>${good?'✓':'×'}</b>`;target.append(el);});
}
const related=[false,true,false,false,true,false];
related.forEach((isRelated,i)=>{
 const el=document.createElement('div');el.className=`coverage-step ${isRelated?'is-related':'is-unrelated'}`;el.innerHTML=`<span class="coverage-signal">±Δ</span><span class="coverage-action">a<sub>${i+1}</sub></span><span class="coverage-step-label"></span>`;$('.coverage-steps').append(el);
 const ns='http://www.w3.org/2000/svg',x=50+i*100,d=`M300 0 C300 42 ${x} 55 ${x} 115`;
 for(const type of ['coverage-link','coverage-packet']){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class',`${type} ${isRelated?'link-related':'link-unrelated'}`);path.setAttribute('pathLength','100');path.style.setProperty('--packet-delay',`${i*.12}s`);$('.coverage-links').append(path);}
});
let visible=false,enabled=!matchMedia('(prefers-reduced-motion: reduce)').matches,frame=0,last=0,elapsed=0;
try{if(localStorage.getItem('scope-effects')==='off')enabled=false;}catch{}
let lastScanned=-1,lastPhase=-1;
function measure(){for(const name of Object.keys(quality)){const track=$(`[data-track="${name}"] .motivation-path`),nodes=[...track.querySelectorAll('.motivation-step')];paths.set(name,nodes.map(node=>node.offsetLeft+node.offsetWidth/2-15));}}
function render(position){
 const scan=Math.min(1,position/.63),scanned=Math.min(6,Math.floor(scan*6)),phase=position<.25?0:position<.66?1:2;
 for(const name of Object.keys(quality)){
  const row=$(`[data-track="${name}"]`),positions=paths.get(name)||[],steps=[...row.querySelectorAll('.motivation-step')];
  const current=Math.min(5,scan*5),a=Math.floor(current),b=Math.min(5,a+1),x=(positions[a]||0)*(1-(current-a))+(positions[b]||0)*(current-a);
  row.querySelector('.motivation-agent').style.transform=`translateX(${x.toFixed(2)}px)`;
  if(scanned!==lastScanned)steps.forEach((step,i)=>{step.classList.toggle('is-revealed',i<scanned);step.classList.toggle('is-current',i===scanned);});
  row.classList.toggle('is-finished',position>.68);
 }
 if(scanned!==lastScanned){lastScanned=scanned;$('.outcome-live').textContent=t(scanned>=6?'mixed':'observe');}
 if(phase!==lastPhase){lastPhase=phase;root.dataset.signalPhase=String(phase);$('.coverage-live').textContent=t(['skillPhase','sendPhase','offtargetPhase'][phase]);}
 root.style.setProperty('--motivation-progress',String(position));
}
function stop(){cancelAnimationFrame(frame);frame=0;last=0;root.dataset.playing='false';}
function tick(now){frame=0;if(!visible||!enabled||document.hidden){last=0;return;}if(last)elapsed+=Math.min(80,now-last);last=now;render((elapsed%14000)/14000);root.dataset.playing='true';frame=requestAnimationFrame(tick);}
function start(){if(visible&&enabled&&!document.hidden&&!frame)frame=requestAnimationFrame(tick);}
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){measure();start();}else stop();},{threshold:0}).observe(root);
new ResizeObserver(()=>{measure();render((elapsed%14000)/14000);}).observe(root);
document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
document.addEventListener('scope:effectschange',e=>{enabled=e.detail.enabled;if(enabled)start();else{stop();render(.95);}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{enabled=!e.matches;if(!enabled){stop();render(.95);}else start();});
window.addEventListener('pagehide',stop);
function translate(){
 document.querySelectorAll('[data-mot]').forEach(e=>{e.textContent=t(e.dataset.mot);});
 $$('.coverage-step').forEach((e,i)=>{e.querySelector('.coverage-step-label').textContent=t(related[i]?'relatedShort':'unrelatedShort');e.setAttribute('aria-label',`${t('step')} ${i+1}: ${t(related[i]?'related':'unrelated')}`);});
 for(const name of Object.keys(quality))$(`[data-track="${name}"]`).querySelectorAll('.motivation-step').forEach((e,i)=>e.setAttribute('aria-label',`${t('step')} ${i+1}: ${t(quality[name][i]?'correct':'error')}`));
 lastScanned=-1;lastPhase=-1;render(enabled?(elapsed%14000)/14000:.95);
}
document.addEventListener('scope:languagechange',e=>{language=e.detail.language;translate();});
measure();translate();start();
