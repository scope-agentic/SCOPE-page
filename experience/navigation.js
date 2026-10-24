const root=document.querySelector('.page-toc');
const nav=root.querySelector('nav'),toggle=root.querySelector('.toc-toggle');
const links=[...nav.querySelectorAll('a[href^="#"]')];
const sections=links.map(a=>document.querySelector(a.hash));
let language=document.documentElement.lang==='zh-CN'?'zh':'en',pending=false;
const wide=matchMedia('(min-width:1280px)');
function close(returnFocus=false){root.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');if(returnFocus)toggle.focus();}
function update(){
 pending=false;
 const point=Math.min(180,innerHeight*.23);
 let current=-1;
 sections.forEach((section,i)=>{if(section.getBoundingClientRect().top<=point)current=i;});
 const max=document.documentElement.scrollHeight-innerHeight;
 if(max>0 && scrollY>=max-5)current=sections.length-1;
 links.forEach((a,i)=>{if(i===current)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
 root.querySelector('.toc-reading').textContent=`${Math.round(Math.max(0,Math.min(1,max>0?scrollY/max:0))*100)}%`;
 root.querySelector('.toc-toggle-current').textContent=current>=0?links[current].querySelector('[data-i18n]').textContent:'';
 root.dataset.section=current>=0?sections[current].id:'top';
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
toggle.addEventListener('click',()=>{const open=root.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));});
links.forEach(a=>a.addEventListener('click',()=>close()));
document.addEventListener('click',e=>{if(!root.contains(e.target))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('is-open'))close(true);});
wide.addEventListener('change',()=>{close();update();});
window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
new ResizeObserver(schedule).observe(document.querySelector('main'));
function translate(){
 const zh=language==='zh';
 root.setAttribute('aria-label',zh?'本页目录':'On this page');nav.setAttribute('aria-label',zh?'章节目录':'Page contents');
 root.querySelector('[data-toc="toggle"]').textContent=zh?'目录':'Contents';
 root.querySelector('[data-toc="title"]').textContent=zh?'本页目录':'On this page';
 update();
}
document.addEventListener('scope:languagechange',e=>{language=e.detail.language;translate();});
translate();
