const root=document.querySelector('#benchmark-chart');
const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
let language=document.documentElement.lang==='zh-CN'?'zh':'en',metric='avg',modelId='qwen25-3b',visible=false;
const methods=['GRPO','SDAR','GRSD','SEED','SCOPE'];
const disabled=new Set();
const colors=['#a8adb9','#8ab5b2','#8ca9d5','#c2a0cc','#8661b6'];
const copy={en:{overline:'THE RESULTS, AT A GLANCE',title:'Better completion. Across backbones.',body:"Explore our main results. Select a benchmark and toggle methods to compare.",unit:'Task success (%) ↑',note:'Table 1 · Our main results, matching the full comparison below. SCOPE uses training step 150. The y-axis begins at zero; bar values are percentages.'},zh:{overline:'一眼看懂主结果',title:'跨模型, 更强的任务完成能力.',body:'探索我们的主结果. 切换数据集, 点击图例比较不同方法.',unit:'任务成功率 (%) ↑',note:'表 1 · 我们的主结果, 与下方完整表格的数据一致. SCOPE 使用训练第 150 步的结果. 纵轴从零开始, 柱上数值单位为百分比.'}};
const t=k=>copy[language][k];
let animationFrame=0;
function resetBars() {
  cancelAnimationFrame(animationFrame);
  root.classList.add('bars-reset');
  root.classList.remove('bars-risen');
}
function animate() {
  resetBars();
  if (!visible) return;
  animationFrame=requestAnimationFrame(()=>{
    animationFrame=requestAnimationFrame(()=>{
      if (!visible) return;
      root.classList.remove('bars-reset');
      root.classList.add('bars-risen');
    });
  });
}
function render() {
  const model=window.SCOPE_RESULTS.find(m=>m.id===modelId),container=$('.benchmark-bars');container.replaceChildren();
  const selectedMethods=methods.filter(m=>!disabled.has(m));
  container.style.setProperty('--bar-count',selectedMethods.length);
  selectedMethods.forEach((name,i)=>{
    const index=methods.indexOf(name),score=model.rows.find(r=>r.method===name).metrics[metric];
    const group=document.createElement('div');group.className='benchmark-bar-group';if(name==='SCOPE')group.classList.add('bar-ours');
    const bar=document.createElement('button');bar.type='button';bar.className='benchmark-bar';bar.style.setProperty('--score',score);bar.style.setProperty('--bar-color',colors[index]);bar.style.setProperty('--bar-delay',`${i*65}ms`);bar.setAttribute('aria-label',`${name}, ${model.label}, ${metric==='avg'?'ALFWorld':'WebShop'}: ${score.toFixed(1)}%`);
    const fill=document.createElement('span');fill.className='benchmark-bar-fill';const value=document.createElement('span');value.className='benchmark-bar-value';value.textContent=score.toFixed(1);bar.append(fill,value);
    const label=document.createElement('span');label.className='benchmark-bar-label';label.textContent=name;
    const inspect=()=>{$('.bars-readout').textContent=`${name} · ${model.fullName} · ${metric==='avg'?'ALFWorld':'WebShop'}: ${score.toFixed(1)}%`;};
    bar.addEventListener('pointerenter',inspect);bar.addEventListener('focus',inspect);bar.addEventListener('click',inspect);group.append(bar,label);container.append(group);
  });
  $('.bar-model-label').textContent=model.fullName;
  $$('[data-bar-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.barModel===modelId)));
  $$('[data-chart-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chartMetric===metric)));
  const ours=model.rows.find(r=>r.method==='SCOPE').metrics[metric];
  $('.bars-readout').textContent=language==='zh'?`${model.label} · SCOPE: ${ours.toFixed(1)}%. 点击柱子查看各方法结果.`:`${model.label} · SCOPE: ${ours.toFixed(1)}%. Select a bar to inspect a method.`;
  animate();
}
function legend(){const container=$('.chart-legend');container.replaceChildren();methods.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(!disabled.has(name)));const dot=document.createElement('i');dot.style.background=colors[i];b.append(dot,name);b.addEventListener('click',()=>{if(disabled.has(name))disabled.delete(name);else if(disabled.size<methods.length-1)disabled.add(name);legend();render();});container.append(b);});}
$$('[data-chart-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.chartMetric;render();}));
document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>{modelId=b.dataset.model;render();}));
$$('[data-bar-model]').forEach(b=>b.addEventListener('click',()=>document.querySelector(`[data-model="${b.dataset.barModel}"]`).click()));

new IntersectionObserver(([entry])=>{
  const next=entry.isIntersecting && entry.intersectionRatio>=.18;
  if(next===visible)return;
  visible=next;
  if(visible)animate();else resetBars();
},{threshold:[0,.18]}).observe($('.benchmark-plot'));
function translate(){root.querySelectorAll('[data-bars]').forEach(e=>{e.textContent=t(e.dataset.bars);});legend();render();}
document.addEventListener('scope:languagechange',e=>{language=e.detail.language;translate();});
translate();
