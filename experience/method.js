import { distillationSignal, pairwiseBonus } from '../method/math.js';

const root = document.querySelector('#method-lab');
const $ = s => root.querySelector(s);
const $$ = s => [...root.querySelectorAll(s)];
let language = document.documentElement.lang === 'zh-CN' ? 'zh' : 'en';
const words = {
  en: {
    kicker:'THE SCOPE LEARNING LOOP', intro:'Explore the three ideas that turn hindsight into better decisions.', tabAnalyzer:'Step-level skills',tabAnalyzerSub:'Find precisely what to correct',tabDistill:'Bounded signed OPSD',tabDistillSub:'Keep direction. Control strength.',tabReward:'Pairwise efficiency',tabRewardSub:'Prefer shorter successes',
    analyzerOverline:'SELF-BOOTSTRAPPED ERROR ANALYSIS',analyzerTitle:'A skill for the step that needs it.',analyzerBody:'The analyzer reads the trajectory, grounds each error in feedback, and writes a correction tied to its target steps.',play:'Play analysis',pause:'Pause analysis',replay:'Replay analysis',successCase:'Success with errors',failureCase:'Failed trajectory',cleanCase:'No supported error',trajectory:'ON-POLICY TRAJECTORY',task:'TASK',scanning:'Analyzing',selected:'Selected error',ordinaryRL:'Ordinary RL only',snapshot:'SAME POLICY SNAPSHOT',analyzerModel:'Analyzer · A<sub>θ̄</sub>',structured:'STRUCTURED STEP-LEVEL GUIDANCE',selectionMask:'Auxiliary selection mask mₜ',selectionNote:'Each skill conditions the teacher only at its assigned steps.',analysisProgress:'Analysis progress',
    distillOverline:'SELECTIVE · BOUNDED · SIGNED',distillTitle:'A strong correction. A controlled update.',distillBody:'Positive gaps reinforce a sampled token. Negative gaps suppress it. Tanh keeps both directions and smoothly bounds their strength.',animateGap:'Animate the gap',pauseGap:'Pause the gap',teacher:'TEACHER',student:'STUDENT',teacherContext:'Ordinary history + assigned skill',studentContext:'Ordinary history',sameToken:'Same sampled token<br>Δ = log π<sub>T</sub> − log π<sub>S</sub>',coefficient:'Distillation coefficient',gapAxis:'Teacher–student log-probability gap Δ',scaledGap:'Scaled gap αΔ',hardClip:'Hard clip',parameters:'Explore the parameters',paperDefaults:'Our defaults ↺',slope:'Slope near zero',default:'default',slopeNote:'Higher α strengthens sensitivity to small gaps.',bound:'Saturation magnitude',boundNote:'c sets the bound in both update directions.',gap:'Sampled-token gap Δ',suppression:'Suppress',reinforcement:'Reinforce',unbounded:'Scaled gap αΔ',applied:'Applied mₜ Â',gradientNote:'The coefficient is stop-gradient. The selected-token loss is −Â log πS, averaged only over selected tokens. The tanh derivative is not backpropagated through the gap.',
    rewardOverline:'SUCCESS-RELATIVE PAIRWISE EFFICIENCY',rewardTitle:'Shorter is better. Among successes.',rewardBody:'Compare interaction counts within the same task group. A smooth preference adapts to relative length, without choosing an absolute target.',resetExample:'Reset example ↺',preference:'Pairwise preference pᵢⱼ',ratioAxis:'Interaction length ratio Tᵢ / Tⱼ',activeTemperature:'Selected temperature',hardRanking:'Hard ranking',referenceCurves:'Reference temperatures: τ = 0.03 / 0.1 / 0.3',temperature:'Preference temperature τₗₑₙ',sharper:'Sharper',smoother:'Smoother',tauDefault:'Our default · 0.1',scaleExperiment:'TRY A COMMON LENGTH RESCALING',scaleTitle:'Same proportions. Same pairwise bonus.',scaleBody:'Multiply every trajectory length while keeping a fixed horizon H = 30 for the absolute comparison.',successfulRollout:'Rollout',pairwiseBonus:'Pairwise bᵢ',absoluteBonus:'Absolute bonus',invariant:'log(aTⱼ) − log(aTᵢ) = log Tⱼ − log Tᵢ. A common rescaling leaves pairwise scores unchanged.',absoluteDefinition:'Absolute bonus: max(0, 1 − T/H), with H = 30.',rewardRule:'Failures: no efficiency bonus. A lone success: b = ½. Mean b among successes: ½.',ablation:'OUR ABLATION · ALFWORLD · QWEN2.5-3B · STEP 180',noLength:'No length reward',absolute:'Absolute length',loopTitle:'One policy. A self-improving loop.',loopBody:'Supervised warm-up → on-policy rollouts → analysis & skills → GRPO + selective OPSD → updated actor and analyzer.',
  },
  zh: {
    kicker:'SCOPE 学习闭环',intro:'交互探索: 如何把后见经验转化为更好的决策.',tabAnalyzer:'步骤级技能',tabAnalyzerSub:'精确定位需要纠正的决策',tabDistill:'有界带符号 OPSD',tabDistillSub:'保留方向, 控制强度',tabReward:'成对效率奖励',tabRewardSub:'偏好更短的成功轨迹',analyzerOverline:'自主迭代的错误分析',analyzerTitle:'把对应技能, 交给真正需要的步骤.',analyzerBody:'Analyzer 读取轨迹, 根据环境反馈定位错误, 并为对应步骤生成纠错技能.',play:'播放分析',pause:'暂停分析',replay:'重新播放',successCase:'成功, 但包含错误',failureCase:'失败轨迹',cleanCase:'没有充分支持的错误',trajectory:'同策略交互轨迹',task:'任务',scanning:'正在分析',selected:'选中的错误步',ordinaryRL:'仅普通 RL',snapshot:'来自同一策略快照',analyzerModel:'Analyzer · A<sub>θ̄</sub>',structured:'结构化的步骤级指导',selectionMask:'辅助蒸馏掩码 mₜ',selectionNote:'每条 skill 仅在其对应步骤为教师提供条件.',analysisProgress:'分析进度',distillOverline:'选择性 · 有界 · 带符号',distillTitle:'纠正有方向, 更新有边界.',distillBody:'正差值增强采样 token, 负差值抑制采样 token. Tanh 同时保留两个方向, 平滑限制更新强度.',animateGap:'自动演示差值',pauseGap:'暂停差值演示',teacher:'教师',student:'学生',teacherContext:'普通历史 + 对应步骤的 skill',studentContext:'普通交互历史',sameToken:'对同一采样 token 评分<br>Δ = log π<sub>T</sub> − log π<sub>S</sub>',coefficient:'蒸馏系数',gapAxis:'教师与学生的对数概率差 Δ',scaledGap:'缩放差值 αΔ',hardClip:'硬截断',parameters:'探索参数的作用',paperDefaults:'恢复默认参数 ↺',slope:'零点附近的斜率',default:'默认',slopeNote:'α 越大, 对较小差值的响应越强.',bound:'饱和值的大小',boundNote:'c 同时约束增强与抑制两个方向.',gap:'采样 token 的差值 Δ',suppression:'抑制',reinforcement:'增强',unbounded:'缩放差值 αΔ',applied:'实际系数 mₜ Â',gradientNote:'系数使用 stop-gradient. 选中 token 的损失为 −Â log πS, 仅对选中的 token 取均值; 不通过差值反传 tanh 的导数.',rewardOverline:'成功轨迹之间的成对效率比较',rewardTitle:'先成功, 再比较谁更高效.',rewardBody:'在同一任务组内比较交互次数. 平滑偏好随相对长度调整, 无需预设绝对目标长度.',resetExample:'重置示例 ↺',preference:'成对偏好 pᵢⱼ',ratioAxis:'交互长度之比 Tᵢ / Tⱼ',activeTemperature:'当前温度',hardRanking:'硬排序',referenceCurves:'参考温度: τ = 0.03 / 0.1 / 0.3',temperature:'偏好温度 τₗₑₙ',sharper:'更陡峭',smoother:'更平滑',tauDefault:'默认温度 · 0.1',scaleExperiment:'试试整体放大交互长度',scaleTitle:'比例不变, 成对奖励不变.',scaleBody:'将所有轨迹长度乘以相同倍数; 绝对奖励仍使用固定预算 H = 30.',successfulRollout:'轨迹',pairwiseBonus:'成对奖励 bᵢ',absoluteBonus:'绝对奖励',invariant:'log(aTⱼ) − log(aTᵢ) = log Tⱼ − log Tᵢ. 共同放大长度, 成对得分不变.',absoluteDefinition:'绝对奖励: max(0, 1 − T/H), 其中 H = 30.',rewardRule:'失败: 无效率奖励. 唯一成功: b = ½. 所有成功轨迹的平均 b = ½.',ablation:'我们的消融实验 · ALFWORLD · QWEN2.5-3B · 第 180 步',noLength:'无长度奖励',absolute:'绝对长度奖励',loopTitle:'一个策略, 持续自我改进.',loopBody:'监督初始化 → 同策略交互 → 分析与技能 → GRPO + 选择性 OPSD → 更新 Actor 与 Analyzer.',
  }
};
const t = k => words[language][k] ?? words.en[k] ?? k;
const local = (en,zh) => language === 'zh' ? zh : en;
let mechanism = 'analyzer';
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let effects = !motion.matches;

// A shared visibility-aware clock: no hidden-panel animation and no timer buildup.
function player(panel, duration, render, button, labels) {
  let position = 0, playing = false, visible = false, previous = 0, frame = 0, autoStarted = false;
  function updateButton() {
    panel.dataset.playing=String(playing);
    button.setAttribute('aria-pressed',String(playing));
    button.querySelector('.play-symbol').textContent = playing ? 'Ⅱ' : position >= 1 ? '↻' : '▶';
    button.querySelector('[data-lab]').textContent = t(playing ? labels[1] : position >= 1 ? labels[2] : labels[0]);
  }
  function stopFrame() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  function tick(now) {
    frame = 0;
    if (!playing || !visible || document.hidden || panel.hidden) {previous=0; return;}
    if (previous) position += Math.min(now-previous,80)/duration;
    previous=now;
    if (position >= 1) {position=1; playing=false; previous=0; updateButton();}
    render(position);
    if (playing) frame=requestAnimationFrame(tick);
  }
  function run() {if (playing && visible && !panel.hidden && !document.hidden && !frame) frame=requestAnimationFrame(tick);}
  function pause() {playing=false;stopFrame();updateButton();}
  function play() {if (position>=1)position=0;playing=true;updateButton();run();}
  button.addEventListener('click',()=>playing?pause():play());
  new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting;
    if (!visible) stopFrame();
    else if (!autoStarted && effects && !panel.hidden) {autoStarted=true;play();}
    else run();
  },{threshold:.15}).observe(panel);
  document.addEventListener('visibilitychange',()=>document.hidden?stopFrame():run());
  window.addEventListener('pagehide',stopFrame);
  return {pause,play,refresh:updateButton,render:()=>render(position),seek(value) {pause();position=Math.max(0,Math.min(1,value));render(position);updateButton();},activate(){run();},get position(){return position;}};
}

// Educational trajectories. These are intentionally distinct from recorded replay data.
const scenarios = {
 success:{goal:['Put a clean mug on the dining table.','把清洗后的杯子放到餐桌上.'],outcome:true,actions:['go to cabinet 1','take mug 1 from table 1','take mug 1 from cabinet 1','clean mug 1 with cabinet 1','go to sinkbasin 1','clean mug 1 with sinkbasin 1','go to diningtable 1','put mug 1 in/on diningtable 1'],feedback:[['A mug is inside the cabinet.','柜子中有一个杯子.'],['Nothing happens. The mug is not on the table.','无效动作: 杯子不在桌上.'],['You pick up the mug.','拿起了杯子.'],['Nothing happens. This is not a cleaning fixture.','无效动作: 柜子不是清洗设施.'],['You arrive at the sink.','来到水槽.'],['The mug is now clean.','杯子已清洗.'],['You arrive at the dining table.','来到餐桌.'],['Clean mug placed. Task complete.','清洗后的杯子已放置, 任务完成.']],skills:[{steps:[2],reason:['The source conflicts with the observed mug location.','拿取来源与观测到的杯子位置不符.'],skill:['Ground the pickup source in the latest observation: take the mug from cabinet 1.','根据最近的观测选择拿取来源: 从 cabinet 1 拿取杯子.']},{steps:[4],reason:['Cleaning was attempted with a cabinet, not a sink.','尝试用柜子清洗杯子, 但柜子不是水槽.'],skill:['Carry the mug to a sinkbasin before issuing the clean action.','先将杯子带到 sinkbasin, 再执行 clean 动作.']}]},
 failure:{goal:['Put a clean mug on the dining table.','把清洗后的杯子放到餐桌上.'],outcome:false,actions:['go to cabinet 1','take mug 1 from cabinet 1','go to diningtable 1','put mug 1 in/on diningtable 1','look','go to sinkbasin 1','look','finish'],feedback:[['A mug is inside the cabinet.','柜子中有一个杯子.'],['You pick up the mug.','拿起了杯子.'],['You arrive at the table.','来到餐桌.'],['Mug placed; it is still dirty.','杯子已放置, 但仍未清洗.'],['The dirty mug is on the table.','桌上是一个未清洗的杯子.'],['You reach the sink empty-handed.','空手来到水槽.'],['No mug is being carried.','当前未持有杯子.'],['Goal unmet: the mug is not clean.','任务未完成: 杯子未清洗.']],skills:[{steps:[4,8],reason:['The agent places a dirty mug and terminates before satisfying the clean condition.','智能体放置了未清洗的杯子, 并在满足清洗条件前结束.'],skill:['Verify all goal predicates before placing the mug and finishing: carry it to the sink, clean it, then place it.','放置杯子和结束任务前检查全部目标条件: 将杯子带到水槽, 清洗, 再放到餐桌.']}]},
 clean:{goal:['Put the mug on the dining table.','把杯子放到餐桌上.'],outcome:true,actions:['go to cabinet 1','take mug 1 from cabinet 1','go to diningtable 1','put mug 1 in/on diningtable 1'],feedback:[['A mug is inside the cabinet.','柜子中有一个杯子.'],['You pick up the mug.','拿起了杯子.'],['You arrive at the table.','来到餐桌.'],['Mug placed. Task complete.','杯子已放置, 任务完成.']],skills:[]}
};
let scenario='success', selectedStep=0, generatedKey='', analyzerPosition=0, lastBridgeBucket=-1;
const getScenario=()=>scenarios[scenario];
function buildTrajectory() {
  const data=getScenario(); generatedKey=''; selectedStep=0;
  $('.analyzer-goal').textContent=data.goal[language==='zh'?1:0];
  $('.trajectory-outcome').textContent=data.outcome?local('SUCCESS ✓','成功 ✓'):local('FAILURE ×','失败 ×');
  $('.trajectory-outcome').dataset.success=String(data.outcome);
  $('.reference-copy').textContent=data.outcome?local('Success: inspect its own observations and action feedback.','成功轨迹: 检查自身观测和动作反馈.'):local('Failure: also consult successful action sequences from the same task group.','失败轨迹: 额外参考同任务组内的成功动作序列.');
  $('.trajectory-list').replaceChildren();$('.mask-cells').replaceChildren();
  data.actions.forEach((action,i)=>{
    const button=document.createElement('button');button.type='button';button.className='trajectory-step';button.dataset.step=i+1;
    const num=document.createElement('span');num.className='trajectory-number';num.textContent=String(i+1).padStart(2,'0');
    const main=document.createElement('span');main.className='trajectory-step-body';const code=document.createElement('code');code.textContent=action;
    const feedback=document.createElement('span');feedback.textContent=data.feedback[i][language==='zh'?1:0];main.append(code,feedback);
    const status=document.createElement('span');status.className='trajectory-step-status';status.setAttribute('aria-hidden','true');
    button.append(num,main,status);button.addEventListener('click',()=>{analyzerPlayer.pause();selectedStep=i+1;inspectStep();});
    $('.trajectory-list').append(button);
    const cell=document.createElement('span');cell.title=`t = ${i+1}`;cell.dataset.step=i+1;cell.innerHTML=`<small>${i+1}</small><b>0</b>`;$('.mask-cells').append(cell);
  });
  $$('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario)));
}
function inspectStep() {
  const data=getScenario(), lang=language==='zh'?1:0;
  if (!selectedStep) {$('.inspector-copy').textContent=local('Watch the scan, or select a step to inspect its corrective signal.','观看分析动画, 或点击某一步查看对应纠错信号.');return;}
  const skill=data.skills.find(s=>s.steps.includes(selectedStep));
  $('.inspector-copy').textContent=skill?local(`Step ${selectedStep} · selected for correction. `,`步骤 ${selectedStep} · 选中并纠正. `)+skill.skill[lang]:local(`Step ${selectedStep} · mₜ = 0. Ordinary RL still applies; no auxiliary distillation is assigned.`,`步骤 ${selectedStep} · mₜ = 0. 仍参与普通 RL, 不分配辅助蒸馏.`);
  $$('.trajectory-step').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===selectedStep)));
  $$('.generated-skill').forEach(card=>card.classList.toggle('is-focused',skill && card.dataset.targets===skill.steps.join(',')));
}
function renderAnalyzer(position) {
  analyzerPosition=position;
  const data=getScenario(), n=data.actions.length, scanned=Math.min(n,Math.floor(position/.53*n)), progress=Math.max(0,(position-.55)/.43);
  const revealed=data.skills.filter((s,i)=>progress>=(i+.05)/Math.max(1,data.skills.length));
  const allSelected=data.skills.flatMap(s=>s.steps), done=position>=.99;
  $$('.trajectory-step').forEach((b,i)=>{const scannedStep=i<scanned;b.classList.toggle('is-scanning',!done&&i===scanned);b.classList.toggle('is-scanned',scannedStep);b.classList.toggle('is-error',scannedStep&&allSelected.includes(i+1));b.querySelector('.trajectory-step-status').textContent=scannedStep?(allSelected.includes(i+1)?'!':'✓'):'';});
  $('.analyzer-status').textContent=done?local('COMPLETE','已完成'):position<.53?local('SCANNING','读取轨迹'):local('WRITING SKILLS','生成技能');
  $('.analysis-progress-label').textContent=`${String(scanned).padStart(2,'0')} / ${String(n).padStart(2,'0')}`;
  $('#analysis-position').value=String(position);
  const lang=language==='zh'?1:0;
  const key=[scenario,language,progress<=0?'scan'+scanned:revealed.length].join('|');
  if (key!==generatedKey) {
    generatedKey=key;
    const container=$('.skill-content');container.replaceChildren();
    if (progress<=0) {const pending=document.createElement('div');pending.className='skill-pending';pending.innerHTML='<span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>';const p=document.createElement('p');p.textContent=position<.01?local('Ready to inspect experience.','准备分析交互经验.'):local(`Reading observations and feedback · ${scanned}/${n}`,`读取观测和反馈 · ${scanned}/${n}`);pending.append(p);container.append(pending);}
    else if (!data.skills.length) {const empty=document.createElement('div');empty.className='empty-skills';empty.innerHTML='<span aria-hidden="true">✓</span>';const h=document.createElement('strong');h.textContent=local('No supported error.','没有充分支持的错误.');const p=document.createElement('p');p.textContent=local('skills = [] → all mₜ = 0. Keep ordinary RL; add no corrective loss.','skills = [] → 全部 mₜ = 0. 保留普通 RL, 不添加纠错损失.');empty.append(h,p);container.append(empty);}
    else revealed.forEach((s,i)=>{
      const card=document.createElement('article');card.className='generated-skill';card.dataset.targets=s.steps.join(',');
      const top=document.createElement('div');top.className='generated-skill-top';top.innerHTML=`<span>skill_${i+1}</span><strong>target_steps: [${s.steps.join(', ')}]</strong>`;
      const evidence=document.createElement('p');evidence.className='skill-evidence';evidence.textContent=s.reason[lang];
      const text=document.createElement('p');text.className='skill-text';
      const pct=Math.min(1,Math.max(0,(progress*data.skills.length-i)*1.25));text.textContent=s.skill[lang].slice(0,Math.floor(pct*s.skill[lang].length));if(pct<1)text.classList.add('is-typing');
      card.append(top,evidence,text);container.append(card);
    });
    if (selectedStep)inspectStep();
  }
  $$('.generated-skill').forEach((card,i)=>{
    const skill=revealed[i];
    if (!skill) return;
    const pct=Math.min(1,Math.max(0,(progress*data.skills.length-i)*1.25));
    const text=card.querySelector('.skill-text');
    const content=skill.skill[lang].slice(0,Math.floor(pct*skill.skill[lang].length));
    if(text.textContent!==content)text.textContent=content;
    text.classList.toggle('is-typing',pct<1);
  });
  const bridgeBucket=Math.floor(position*40);
  if(bridgeBucket!==lastBridgeBucket || position>=.99){lastBridgeBucket=bridgeBucket;updateAnalyzerLinks(revealed);}
  $('.skill-count').textContent=local(`${revealed.length} skill${revealed.length===1?'':'s'}`,`${revealed.length} 条 skill`);
  $$('.mask-cells>span').forEach(cell=>{const active=revealed.some(s=>s.steps.includes(Number(cell.dataset.step)));cell.classList.toggle('mask-selected',active);cell.querySelector('b').textContent=active?'1':'0';});
}
let bridgeFrame=0;
function updateAnalyzerLinks(skills) {
  if (bridgeFrame) return;
  bridgeFrame=requestAnimationFrame(()=>{
    bridgeFrame=0;
    let svg=$('.analyzer-bridge');
    if(!svg){svg=svgElement('svg',{class:'analyzer-bridge','aria-hidden':'true'});$('.analyzer-grid').append(svg);}
    svg.replaceChildren();
    if(matchMedia('(max-width: 820px)').matches)return;
    const area=$('.analyzer-grid').getBoundingClientRect();
    svg.setAttribute('viewBox',`0 0 ${area.width} ${area.height}`);
    const cards=$$('.generated-skill');
    skills.forEach((skill,i)=>{
      if(!cards[i])return;
      const end=cards[i].getBoundingClientRect();
      skill.steps.forEach(step=>{
        const start=$(`.trajectory-step[data-step="${step}"]`).getBoundingClientRect();
        const x1=start.right-area.left+3,y1=start.top+start.height/2-area.top,x2=end.left-area.left-5,y2=end.top+26-area.top;
        const d=`M${x1} ${y1}C${x1+38} ${y1},${x2-38} ${y2},${x2} ${y2}`;
        svg.append(svgElement('path',{d,class:'bridge-base'}),svgElement('path',{d,class:'bridge-packet',pathLength:100}),svgElement('circle',{cx:x1,cy:y1,r:3}),svgElement('circle',{cx:x2,cy:y2,r:3}));
      });
    });
  });
}
window.addEventListener('resize',()=>updateAnalyzerLinks(getScenario().skills),{passive:true});
const analyzerPlayer=player($('#panel-analyzer'),16000,renderAnalyzer,$('.analyzer-play'),['play','pause','replay']);
$$('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{scenario=b.dataset.scenario;analyzerPlayer.pause();buildTrajectory();analyzerPlayer.seek(0);inspectStep();if(effects)analyzerPlayer.play();else analyzerPlayer.seek(1);}));
$('#analysis-position').addEventListener('input',e=>analyzerPlayer.seek(Number(e.target.value)));
$('.analysis-restart').addEventListener('click',()=>{selectedStep=0;analyzerPlayer.seek(0);inspectStep();analyzerPlayer.play();});

// Exact analytical coefficient; the UI reports the coefficient, not tanh's derivative.
let alpha=2.5,bound=1,gap=.6,selected=true,coefficientGraphKey='';
const signed=n=>`${n>0?'+':''}${n.toFixed(3)}`;
const svgNS='http://www.w3.org/2000/svg';
function svgElement(name,attrs,text) {const el=document.createElementNS(svgNS,name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;return el;}
function graphGrid(container,labels,xTicks,yTicks,xMap,yMap) {
  container.replaceChildren();labels.replaceChildren();
  yTicks.forEach(v=>{container.append(svgElement('path',{d:`M58 ${yMap(v)}H608`}));labels.append(svgElement('text',{x:46,y:yMap(v)+5,'text-anchor':'end'},Number(v.toFixed(2)).toString()));});
  xTicks.forEach(v=>{container.append(svgElement('path',{d:`M${xMap(v)} 25V275`}));labels.append(svgElement('text',{x:xMap(v),y:300,'text-anchor':'middle'},String(v)));});
}
function pathFor(fn,min,max,xMap,yMap,count=240){return Array.from({length:count+1},(_,i)=>{const x=min+(max-min)*i/count;return `${i?'L':'M'}${xMap(x).toFixed(2)},${yMap(fn(x)).toFixed(2)}`;}).join(' ');}
function updateDistill() {
  const maxY=bound*1.45,x=x=>58+(x+4)/8*550,y=v=>150-v/maxY*125;
  const graphKey=`${alpha}:${bound}:${language}`;
  if(graphKey!==coefficientGraphKey){
    coefficientGraphKey=graphKey;
    graphGrid($('.distill-grid-lines'),$('.distill-labels'),[-4,-2,0,2,4],[-bound,0,bound],x,y);
  const curve=v=>distillationSignal(v,true,alpha,bound);
  $('.tanh-curve').setAttribute('d',pathFor(curve,-4,4,x,y));
  $('.tanh-area').setAttribute('d',pathFor(curve,-4,4,x,y)+`L608 150H58Z`);
  $('.linear-curve').setAttribute('d',pathFor(v=>alpha*v,-4,4,x,y));
  $('.clip-curve').setAttribute('d',pathFor(v=>Math.max(-bound,Math.min(bound,alpha*v)),-4,4,x,y));
  $('.distill-bounds').setAttribute('d',`M58 ${y(bound)}H608M58 ${y(-bound)}H608`);
  }
  const effective=distillationSignal(gap,selected,alpha,bound);
  $('.distill-guide').setAttribute('d',`M${x(gap)} 150V${y(effective)}H333`);
  ['.distill-point','.distill-point-halo'].forEach(s=>{$(s).setAttribute('cx',x(gap));$(s).setAttribute('cy',y(effective));});
  $('#panel-distill').dataset.direction=!selected?'masked':gap>0?'positive':gap<0?'negative':'zero';
  $('.gap-readout').textContent=`${gap>0?'+':''}${gap.toFixed(2)}`;$('#distill-gap').value=gap;
  $('.raw-readout').textContent=signed(alpha*gap);$('.bounded-readout').textContent=signed(effective);
  $('.selection-toggle').setAttribute('aria-pressed',String(selected));$('.selection-toggle-copy').textContent=selected?local('Selected step · mₜ = 1','选中步骤 · mₜ = 1'):local('Unselected step · mₜ = 0','未选步骤 · mₜ = 0');
  $('.signal-direction').textContent=!selected?local('MASKED OUT','辅助信号为零'):gap>0?local('↑ REINFORCE','↑ 增强'):gap<0?local('↓ SUPPRESS','↓ 抑制'):local('AGREEMENT','一致');
  $('.signal-explanation').textContent=!selected?local('The curve still exists, but this step contributes zero auxiliary distillation.','系数曲线仍然存在, 但该步骤的辅助蒸馏贡献为零.'):gap>0?local('The skill-conditioned teacher supports this token more strongly. Increase its probability.','携带 skill 的教师更支持这个 token, 增加其概率.'):gap<0?local('The skill-conditioned teacher rejects this token. Reduce its probability.','携带 skill 的教师不支持这个 token, 降低其概率.'):local('Teacher and student agree. No distillation signal is needed.','教师与学生一致, 蒸馏信号为零.');
  $$('[data-alpha]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.alpha)===alpha)));
  $$('[data-bound]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.bound)===bound)));
  $('#distill-gap').setAttribute('aria-valuetext',`${gap.toFixed(2)}; coefficient ${effective.toFixed(3)}`);
}
const distillPlayer=player($('#panel-distill'),18000,p=>{gap=4*Math.sin(p*Math.PI*2);updateDistill();},$('.distill-play'),['animateGap','pauseGap','animateGap']);
$$('[data-alpha]').forEach(b=>b.addEventListener('click',()=>{distillPlayer.pause();alpha=Number(b.dataset.alpha);updateDistill();}));
$$('[data-bound]').forEach(b=>b.addEventListener('click',()=>{distillPlayer.pause();bound=Number(b.dataset.bound);updateDistill();}));
$('#distill-gap').addEventListener('input',e=>{distillPlayer.pause();gap=Number(e.target.value);updateDistill();});
$('.selection-toggle').addEventListener('click',()=>{distillPlayer.pause();selected=!selected;updateDistill();});
$('.distill-reset').addEventListener('click',()=>{distillPlayer.pause();alpha=2.5;bound=1;gap=.6;selected=true;updateDistill();});

let temperature=.1,lengthA=8,lengthB=12,scale=1;
function updateReward() {
  const x=v=>58+(v-.4)/1.4*550,y=v=>275-v*250;
  graphGrid($('.reward-grid-lines'),$('.reward-labels'),[.4,.6,.8,1,1.2,1.4,1.6,1.8],[0,.25,.5,.75,1],x,y);
  $('.ranking-curve').setAttribute('d',`M58 25H${x(1)}V275H608`);
  const curves=$('.temperature-curves');curves.replaceChildren();
  [...new Set([.03,.1,.3,temperature])].sort((a,b)=>Number(a===temperature)-Number(b===temperature)).forEach(tau=>{
    const active=Math.abs(tau-temperature)<1e-8;
    curves.append(svgElement('path',{d:pathFor(r=>1/(1+r**(1/tau)),.4,1.8,x,y),class:active?'temperature-active':'temperature-ghost','data-tau':tau}));
  });
  const ratio=lengthA/lengthB,p=pairwiseBonus(lengthA,[lengthB],true,temperature),clamped=Math.max(.4,Math.min(1.8,ratio));
  $('.reward-guide').setAttribute('d',`M${x(clamped)} 275V${y(p)}H58`);
  ['.reward-point','.reward-point-halo'].forEach(s=>{$(s).setAttribute('cx',x(clamped));$(s).setAttribute('cy',y(p));$(s).setAttribute('visibility',ratio>=.4&&ratio<=1.8?'visible':'hidden');});
  $('#reward-temperature').value=temperature;$('.temperature-readout').textContent=temperature.toFixed(2);
  $('#length-a').value=lengthA;$('#length-b').value=lengthB;document.querySelector('output[for="length-a"]').textContent=lengthA;document.querySelector('output[for="length-b"]').textContent=lengthB;
  $('.pair-readout').textContent=local(`Tᵢ/Tⱼ = ${ratio.toFixed(2)} → pᵢⱼ = ${p.toFixed(3)}. `,`Tᵢ/Tⱼ = ${ratio.toFixed(2)} → pᵢⱼ = ${p.toFixed(3)}. `)+(ratio<1?local('The shorter success is preferred.','较短的成功轨迹获得偏好.'):ratio>1?local('The longer success receives less preference.','较长的成功轨迹获得较低偏好.'):local('Equal lengths share preference equally.','等长轨迹的偏好相同.'))+(ratio<.4||ratio>1.8?local(' Ratio lies outside the displayed x-axis.',' 当前比值超出图中横轴范围.'): '');
  const lengths=[lengthA,lengthB,16], entries=lengths.map((v,i)=>({length:v*scale,success:true,index:i}));entries.push({length:5*scale,success:false,index:3});
  const container=$('.reward-trajectories');container.replaceChildren();
  entries.forEach(({length,success,index})=>{
    const others=entries.filter(e=>e.success&&e.index!==index).map(e=>e.length),score=pairwiseBonus(length,others,success,temperature),absolute=success?Math.max(0,1-length/30):0;
    const row=document.createElement('div');row.className='reward-comparison-row';row.dataset.success=String(success);
    const label=document.createElement('span');label.innerHTML=`<strong>${success?'✓':'×'} τ${['ᵢ','ⱼ','ₖ','f'][index]}</strong><small>${length} ${local('steps','次交互')}</small>`;
    const makeScore=(v,cls)=>{const cell=document.createElement('span');cell.className=cls;const num=document.createElement('b');num.textContent=v.toFixed(3);const track=document.createElement('i');const fill=document.createElement('i');fill.style.width=`${v*100}%`;track.append(fill);cell.append(num,track);return cell;};
    row.append(label,makeScore(score,'relative-score'),makeScore(absolute,'absolute-score'));container.append(row);
  });
  $$('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.scale)===scale)));
}
$('#reward-temperature').addEventListener('input',e=>{temperature=Number(e.target.value);updateReward();});
$('.temperature-default').addEventListener('click',()=>{temperature=.1;updateReward();});
['a','b'].forEach(id=>$(`#length-${id}`).addEventListener('input',e=>{if(id==='a')lengthA=Number(e.target.value);else lengthB=Number(e.target.value);updateReward();}));
$$('[data-scale]').forEach(b=>b.addEventListener('click',()=>{scale=Number(b.dataset.scale);updateReward();}));
$('.reward-reset').addEventListener('click',()=>{temperature=.1;lengthA=8;lengthB=12;scale=1;updateReward();});

function setMechanism(next, focus=false) {
  mechanism=next;analyzerPlayer.pause();distillPlayer.pause();
  $$('[data-mechanism]').forEach(b=>{const active=b.dataset.mechanism===next;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});
  $$('.lab-panel').forEach(panel=>{panel.hidden=panel.id!==`panel-${next}`;});
}
$$('[data-mechanism]').forEach((b,i)=>{
 b.addEventListener('click',()=>setMechanism(b.dataset.mechanism));
 b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;setMechanism($$('[data-mechanism]')[next].dataset.mechanism,true);});
});
function applyLanguage() {
  $$('[data-lab]').forEach(el=>{el.innerHTML=t(el.dataset.lab);});
  buildTrajectory();renderAnalyzer(analyzerPosition);inspectStep();updateDistill();updateReward();analyzerPlayer.refresh();distillPlayer.refresh();
}
document.addEventListener('scope:languagechange',e=>{language=e.detail.language;applyLanguage();});
document.addEventListener('scope:effectschange',e=>{effects=e.detail.enabled;if(!effects){analyzerPlayer.pause();distillPlayer.pause();}});
motion.addEventListener('change',e=>{if(e.matches){effects=false;analyzerPlayer.pause();distillPlayer.pause();}});
applyLanguage();
