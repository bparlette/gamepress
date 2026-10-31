// Anatomy check for the fighter skeleton: node test37-anatomy.cjs (needs out/g37.html). Verifies knee/elbow flexion direction, bone lengths, feet above ground, spine intact over every pose x env x phase.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch(),pg=await b.newPage();await pg.goto('file://'+__dirname+'/out/g37.html');await pg.waitForTimeout(300);
const r=await pg.evaluate(()=>{const P=['idle','walk','crouch','jab','cross','hpunch','closeh','lkick','mkick','hkick','cjab','cupper','clkick','cmkick','sweep','jump','jpunch','jlkick','jhkick','grab','throw','hado','dp','tatsu','tatsu2','sonic','flash','hit','hitc','block','blockc','knock','ko','getup'];const bad=[];const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
for(const p of P)for(const e of[0,.5,1])for(const ph of[0,1.6,3.2,4.8]){const J=__skelG(p,e,ph,0);const tag=p+'@'+e+'/'+ph.toFixed(1);
 for(const q of['A','B']){const h=J['hip'+q],k=J['knee'+q],f=J['foot'+q];const cr=(f[0]-h[0])*(k[1]-h[1])-(f[1]-h[1])*(k[0]-h[0]);const L=d(f,h);
  const tt=[k[0]-h[0],k[1]-h[1]],ss=[f[0]-k[0],f[1]-k[1]],kc=tt[0]*ss[1]-tt[1]*ss[0];if(L<64&&kc>0.5)bad.push(tag+" knee"+q+" bent backwards "+cr.toFixed(1)); // y-up: forward knee gives cr<=0
  const t1=d(h,k),t2=d(k,f);if(Math.abs(t1-33)>.1||(L<65&&Math.abs(t2-33)>.1))bad.push(tag+' leg length '+q+' '+t1.toFixed(1)+'/'+t2.toFixed(1));
  const s=J['sh'+q],el=J['elb'+q],hd=J['hand'+q];const ca=(hd[0]-s[0])*(el[1]-s[1])-(hd[1]-s[1])*(el[0]-s[0]);const La=d(hd,s);
  {const tt=[el[0]-s[0],el[1]-s[1]],ss=[hd[0]-el[0],hd[1]-el[1]],ec=tt[0]*ss[1]-tt[1]*ss[0];if(La<51&&ec<-0.5)bad.push(tag+' elbow'+q+' hyperextended '+ec.toFixed(1));}
  if(Math.abs(d(s,el)-27)>.1)bad.push(tag+' upper arm '+q+' '+d(s,el).toFixed(1));
  if(La<52&&Math.abs(d(el,hd)-26)>.1)bad.push(tag+' forearm '+q+' '+d(el,hd).toFixed(1));}
 if(!J.lying&&!J.free){const lo=Math.min(J.footA[1],J.footB[1],J.toeA[1],J.toeB[1],J.heelA[1],J.heelB[1]);if(lo<-0.6)bad.push(tag+' foot below ground '+lo.toFixed(1));}
 if(d(J.head,J.sh)<10||d(J.sh,J.hip)<30)bad.push(tag+' spine collapsed');}
return {n:P.length*12,bad:bad.slice(0,25),total:bad.length};});console.log(JSON.stringify(r,null,1));await b.close();})();
