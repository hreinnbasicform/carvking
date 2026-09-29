(function(){
'use strict';
// ---------- Scroll parser (dependency-free) ----------
// Plain-text, line-based. See /v/scroll/README.md
function parseTime(s){
 s=String(s).trim();if(s==='')return NaN;var neg=false;if(s[0]==='+'){s=s.slice(1)}
 var p=s.split(':'),v=0;for(var i=0;i<p.length;i++){v=v*60+parseFloat(p[i])}return neg?-v:v}
function parseDb(s){var m=/^(-?[\d.]+)\s*db$/i.exec(String(s).trim());return m?Math.pow(10,parseFloat(m[1])/20):parseFloat(s)}
function tokens(str){ // key:value | key:"quoted" | bare | "quoted bare"
 var out=[],re=/([A-Za-z][\w-]*):"((?:[^"\\]|\\.)*)"|([A-Za-z][\w-]*):(\S+)|"((?:[^"\\]|\\.)*)"|(\S+)/g,m;
 while((m=re.exec(str))){
  if(m[1])out.push({k:m[1].toLowerCase(),v:m[2].replace(/\\"/g,'"')});
  else if(m[3])out.push({k:m[3].toLowerCase(),v:m[4]});
  else if(m[5]!==undefined)out.push({k:'',v:m[5].replace(/\\"/g,'"')});
  else out.push({k:'',v:m[6]});}
 return out}
function parseAudioSpec(rest,rel){ // "file.mp3 at 0:00 gain -6db loop fade 2 until 1:00 duck as bed"
 var w=rest.trim().split(/\s+/),a={src:w[0],at:0,gain:1,loop:false,fade:0,until:0,duck:false,role:'bed',rel:rel};
 for(var i=1;i<w.length;i++){var x=w[i].toLowerCase();
  if(x==='at')a.at=parseTime(w[++i]);else if(x==='gain')a.gain=parseDb(w[++i]);else if(x==='loop')a.loop=true;
  else if(x==='fade')a.fade=parseFloat(w[++i]);else if(x==='until')a.until=parseTime(w[++i]);else if(x==='duck')a.duck=true;
  else if(x==='as')a.role=w[++i].toLowerCase();else if(x==='offset')a.offset=parseTime(w[++i]);}
 return a}
function parseScroll(src){
 var meta={title:'',subtitle:'',tempo:96,key:'D minor',music:'epic',intensity:.9,grade:'warm',seed:1,images:'{}',videos:'{}',snap:.5,generative:true,endnote:'',endref:''},
  audio=[],scenes=[],cur=null,last=null,errs=[];
 var lines=src.replace(/\r/g,'').split('\n');
 lines.forEach(function(raw,ln){
  var line=raw.replace(/^\s+/,'');if(!line||line[0]==='#'||line.slice(0,2)==='//')return;
  if(line[0]==='@'){ // scene line
   var m=/^@\s*([\d:.]+)\s*(?:-\s*([\d:.]+))?\s*(.*)$/.exec(line);if(!m){errs.push('line '+(ln+1)+': bad scene time');return}
   cur={a:parseTime(m[1]),b:m[2]?parseTime(m[2]):NaN,items:[],sfx:[],audio:[],ln:ln+1};
   tokens(m[3]).forEach(function(t){applyTok(cur,t.k,t.v)});scenes.push(cur);last=null;return}
  var off=NaN,mm=/^\+([\d:.]+)\s+(.*)$/.exec(line);if(mm){off=parseTime(mm[1]);line=mm[2]}
  var km=/^([A-Za-z][\w-]*)\s*:\s?(.*)$/.exec(line);if(!km){errs.push('line '+(ln+1)+': expected key: value');return}
  var k=km[1].toLowerCase(),v=km[2].trim();
  if(!cur){ // header
   if(k==='audio'){audio.push(parseAudioSpec(v,false));return}
   if(k==='tempo'||k==='bpm')meta.tempo=parseFloat(v);else if(k==='intensity')meta.intensity=parseFloat(v);
   else if(k==='seed')meta.seed=parseInt(v,10)||1;else if(k==='end'||k==='length')meta.end=parseTime(v);
   else if(k==='snap')meta.snap=(v==='off'||v==='0')?0:(v.indexOf('/')>0?parseFloat(v.split('/')[0])/parseFloat(v.split('/')[1]):parseFloat(v));
   else if(k==='generative')meta.generative=!/^(off|no|false|0)$/i.test(v);
   else meta[k]=v;return}
  // scene sub-lines
  if(k==='text'||k==='title'||k==='vo'||k==='chapter'||k==='drop'){
   var txt=v,ref='',qm=/^"([^"]*)"\s*(?:ref:\s*"?([^"]*)"?)?$/.exec(v);if(qm&&(k==='drop'||qm[2]!==undefined)){txt=qm[1];ref=qm[2]||''}
   last={kind:k,text:txt,ref:ref,off:off};cur.items.push(last);if(k==='drop')cur.drop=true;return}
  if(k==='ref'){if(last)last.ref=v;else errs.push('line '+(ln+1)+': ref without text');return}
  if(k==='sfx'){var w=v.split(/\s+/),s={name:w[0],off:isNaN(off)?0:off,gain:1};for(var i=1;i<w.length;i++){if(w[i]==='gain')s.gain=parseDb(w[++i])}cur.sfx.push(s);return}
  if(k==='audio'){var a=parseAudioSpec(v,true);if(!isNaN(off))a.at=off;cur.audio.push(a);return}
  applyTok(cur,k,v);
 });
 function applyTok(sc,k,v){
  if(!k){var b=v.toLowerCase();if(b==='black'||b==='white'||b==='shake'||b==='fade'||b==='flip')sc[b]=true;else errs.push('scene @'+sc.ln+': unknown word '+v);return}
  if(k==='img'||k==='video'||k==='ken'||k==='fx'||k==='cue'||k==='grade'||k==='hold')sc[k]=v;
  else if(k==='hit')sc.hit=parseInt(v,10)||1;
  else if(k==='cuts')sc.cuts=v.split(',');
  else if(k==='drop'||k==='text'||k==='title'||k==='chapter'||k==='vo'){sc.items.push({kind:k,text:v,ref:'',off:NaN});if(k==='drop')sc.drop=true}
  else if(k==='ref'){if(sc.items.length)sc.items[sc.items.length-1].ref=v}
  else if(k==='sfx')sc.sfx.push({name:v,off:0,gain:1});
  else sc[k]=v;
 }
 // fill scene ends
 for(var i=0;i<scenes.length;i++){var s=scenes[i];if(isNaN(s.b))s.b=i+1<scenes.length?scenes[i+1].a:(meta.end||s.a+3)}
 if(!meta.end)meta.end=scenes.length?scenes[scenes.length-1].b:10;
 return {meta:meta,audio:audio,scenes:scenes,errors:errs};
}

// ---------- generative score ----------
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var MODES={minor:[0,2,3,5,7,8,10],aeolian:[0,2,3,5,7,8,10],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],harmonic:[0,2,3,5,7,8,11],major:[0,2,4,5,7,9,11],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10]};
var PCS={c:0,'c#':1,db:1,d:2,'d#':3,eb:3,e:4,f:5,'f#':6,gb:6,g:7,'g#':8,ab:8,a:9,'a#':10,bb:10,b:11};
// preset flags: how much of each layer; tempo/key come from the scroll header
var PRESETS={
 epic:      {ost:1,drums:1,choir:1,brass:1,braam:1,bells:.6,o808:0,dark:0},
 relentless:{ost:1,drums:1.1,choir:.7,brass:1,braam:1,bells:.3,o808:1,dark:.2},
 minimal:   {ost:.35,drums:.5,choir:.8,brass:.6,braam:.8,bells:.4,o808:0,dark:.3},
 solemn:    {ost:.6,drums:.8,choir:1.2,brass:.8,braam:.7,bells:.5,o808:0,dark:.4},
 child:     {ost:.8,drums:.8,choir:.9,brass:.7,braam:.6,bells:1.3,o808:0,dark:0},
 noir:      {ost:1,drums:1,choir:.8,brass:1,braam:1.3,bells:.3,o808:0,dark:.6},
 chapters:  {ost:.9,drums:1,choir:1,brass:1.1,braam:1,bells:.7,o808:0,dark:.1}
};
function makeParams(meta,seed){
 var r=rng(seed*9973+17+meta.tempo*3),km=/^([a-g][#b]?)\s*(\w*)/i.exec(meta.key||'d minor')||['','d','minor'];
 var pc=PCS[km[1].toLowerCase()]||0,mode=MODES[(km[2]||'minor').toLowerCase()]||MODES.minor;
 var rootMidi=36+pc;if(rootMidi>43)rootMidi-=12;
 var P={bpm:meta.tempo,beat:60/meta.tempo,root:440*Math.pow(2,(rootMidi-69)/12),scale:mode,r:r,seed:seed,
  pre:PRESETS[meta.music]||PRESETS.epic,I:Math.max(.2,Math.min(1.2,meta.intensity||.9))};
 var progs=[[0,5,2,6],[0,5,3,4],[0,3,5,6],[0,6,5,4],[0,5,6,4],[0,2,5,6],[0,3,6,5]];
 P.prog=seed===1?progs[0]:progs[Math.floor(r()*progs.length)];
 var base=[0,0,2,0, 1,0,2,0, 0,0,2,0, 1,2,3,2];
 P.ost=base.map(function(x,i){return seed===1||r()>.3?x:Math.floor(r()*4)});
 P.acc=[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0];
 var tp=[[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],[1,0,0,.5,1,0,0,0,1,0,0,.5,1,0,.5,0],[1,0,.5,0,1,0,0,.5,1,0,.5,0,1,.5,1,.5],[1,0,0,.5,0,0,1,0,1,0,.5,0,1,0,0,.5]];
 P.taiko=tp[seed===1?1:Math.floor(r()*tp.length)];P.taikoWar=tp[seed===1?2:2+Math.floor(r()*2)];
 // weeping melody (degrees, beats)
 var mel=[],d=4;for(var i=0;i<24;i++){var step=[-1,-1,1,-2,1,0,2,-1][Math.floor(r()*8)];d=Math.max(-1,Math.min(7,d+step));mel.push({d:d,l:[1,1,2,2,1.5,3][Math.floor(r()*6)]})}
 P.mel=mel;
 // 808 (relentless flavour)
 var bassP=[1,0,0,.35,0,0,.55,0,.2,0,.6,0,.1,.45,0,.2];P.b8=[];for(i=0;i<16;i++)P.b8.push(i===0||r()<bassP[i]);
 return P}
function Score(ctx,P,noiseBuf){
 var S={},beat=P.beat;
 function nf(deg,oct){var sc=P.scale,n=sc.length,o=Math.floor(deg/n),i=((deg%n)+n)%n;return P.root*Math.pow(2,(sc[i]+12*(o+(oct||0)))/12)}
 S.nf=nf;
 function osc(type,f,t,dur){var o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t+dur+.1);return o}
 function noise(t,dur){var s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.start(t,Math.random()*1.5);s.stop(t+dur+.05);return s}
 function G(v){var g=ctx.createGain();g.gain.value=v==null?1:v;return g}
 function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dec)}
 function sus(g,t,a,v,dur,rel){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+a);g.gain.setValueAtTime(Math.max(.0002,v),t+Math.max(a,dur));g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(a,dur)+rel)}
 function filt(type,f,q){var b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(q!=null)b.Q.value=q;return b}
 function pan(x){if(ctx.createStereoPanner){var p=ctx.createStereoPanner();p.pan.value=x;return p}return G(1)}
 function send(R,node,amt){var g=G(amt);node.connect(g);g.connect(R.revIn)}
 function duck(R,t,depth,rel){var g=R.duck.gain;g.setValueAtTime(1-depth,t);g.setTargetAtTime(1,t+.02,rel||.12)}
 // --- instruments ---
 S.taiko=function(R,t,v,f,ens){f=f||62;var n=ens?3:1;for(var k=0;k<n;k++){(function(k){var tt=t+(k?(.006+k*.007)*(Math.random()+.5):0),ff=f*(k===0?1:k===1?.93:1.12),vv=v*(k?.55:1);
   var o=osc('sine',ff*1.7,tt,1),g=G();o.frequency.exponentialRampToValueAtTime(ff,tt+.07);env(g,tt,.003,vv,.9);o.connect(g);g.connect(R.dr);
   var o2=osc('triangle',ff*2.9,tt,.3),g2=G();o2.frequency.exponentialRampToValueAtTime(ff*1.6,tt+.05);env(g2,tt,.002,vv*.35,.22);o2.connect(g2);g2.connect(R.dr);
   var ns=noise(tt,.35),bp=filt('bandpass',k?380:260,.9),ng=G();env(ng,tt,.002,vv*.6,.28);ns.connect(bp);bp.connect(ng);ng.connect(R.dr);send(R,ng,.55);send(R,g2,.3);
   var cl=noise(tt,.02),hp=filt('highpass',2500),cg=G();env(cg,tt,.001,vv*.25,.02);cl.connect(hp);hp.connect(cg);cg.connect(R.dr)})(k)}
  duck(R,t,Math.min(.6,.5*v),.14)};
 S.shime=function(R,t,v){var o=osc('triangle',420,t,.1),g=G();o.frequency.exponentialRampToValueAtTime(300,t+.05);env(g,t,.001,v*.5,.08);o.connect(g);g.connect(R.dr);
  var ns=noise(t,.08),bp=filt('bandpass',2200,1.2),ng=G();env(ng,t,.001,v,.07);ns.connect(bp);bp.connect(ng);ng.connect(R.dr);send(R,ng,.2)};
 S.impact=function(R,t,v,big){var o=osc('sine',120,t,2),g=G();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(big?30:40,t+.4);env(g,t,.002,v,big?1.9:1.1);o.connect(g);g.connect(R.sat);
  var ns=noise(t,.6),bp=filt('bandpass',5000,1.1),ng=G();bp.frequency.exponentialRampToValueAtTime(700,t+.25);env(ng,t,.0015,v*.7,.45);ns.connect(bp);bp.connect(ng);ng.connect(R.dr);send(R,ng,big?.9:.5);
  S.taiko(R,t,v*.8,52,true);duck(R,t,.7,.3)};
 S.subdrop=function(R,t,v,dur){dur=dur||2.2;v*=.7;var o=osc('sine',75,t,dur),g=G();o.frequency.exponentialRampToValueAtTime(27,t+dur*.8);sus(g,t,.01,v,dur*.3,dur*.7);o.connect(g);g.connect(R.sat);
  var o2=osc('triangle',150,t,dur*.5),g2=G();o2.frequency.exponentialRampToValueAtTime(54,t+dur*.4);env(g2,t,.005,v*.3,dur*.5);o2.connect(g2);g2.connect(R.dr)};
 S.braam=function(R,t,dur,v,deg){var d=deg||0,fs=[nf(d,-1),nf(d,0),nf(d+4,0),nf(d,1)],sh=ctx.createWaveShaper(),c=new Float32Array(512);for(var i=0;i<512;i++){var x=i/255.5-1;c[i]=Math.tanh(x*3)}sh.curve=c;
  var lp=filt('lowpass',140,7),g=G();lp.frequency.setValueAtTime(140,t);lp.frequency.exponentialRampToValueAtTime(2600*(1-P.pre.dark*.4),t+.35);lp.frequency.exponentialRampToValueAtTime(380,t+dur);
  sus(g,t,.04,v,dur*.55,dur*.45);sh.connect(lp);lp.connect(g);g.connect(R.mus);send(R,g,.45);
  var pre=G(.09);pre.connect(sh);fs.forEach(function(f){[-16,-5,6,17].forEach(function(dt){var o=osc('sawtooth',f,t,dur+.2);o.detune.value=dt;o.connect(pre)})});
  S.subdrop(R,t,v*.5,dur*.8)};
 S.ost=function(R,t,f,dur,v,px){var lp=filt('lowpass',2000+1400*P.I,.8),g=G(),p=pan(px);env(g,t,.004,v,dur);lp.connect(g);g.connect(p);p.connect(R.mus);send(R,g,.22);
  [-8,8].forEach(function(dt){var o=osc('sawtooth',f,t,dur);o.detune.value=dt;o.connect(lp)})};
 S.strings=function(R,t,dur,fs,v,cut){v=v/Math.sqrt(fs.length*4)*1.2;var lp=filt('lowpass',cut||1600,.5),g=G();sus(g,t,Math.min(.9,dur*.35),v,dur,Math.max(.5,dur*.25));lp.connect(g);g.connect(R.mus);send(R,g,.6);
  var lfo=osc('sine',5.1,t,dur+1),lg=G(6);lfo.connect(lg);
  fs.forEach(function(f,i){[-11,-3,4,12].forEach(function(dt){var o=osc('sawtooth',f,t,dur+1);o.detune.value=dt;lg.connect(o.detune);var pp=pan((i%2?.35:-.35)*(dt>0?1:-1));o.connect(pp);pp.connect(lp)})})};
 var VOW={ah:[[800,1],[1150,.5],[2900,.22]],oh:[[450,1],[800,.4],[2830,.12]],oo:[[325,1],[700,.25],[2530,.08]]};
 S.choir=function(R,t,dur,fs,v,vw){var F=VOW[vw||'ah'],sum=G(.2),g=G();sus(g,t,Math.min(1.4,dur*.4),v,dur,Math.max(.8,dur*.25));
  F.forEach(function(ff){var b=filt('bandpass',ff[0],9),bg=G(ff[1]*3);sum.connect(b);b.connect(bg);bg.connect(g)});var lp=filt('lowpass',3500);g.connect(lp);lp.connect(R.mus);send(R,lp,.95);
  var lfo=osc('sine',4.8,t,dur+1.5),lg=G(7);lfo.connect(lg);
  fs.forEach(function(f){[-14,-4,5,15].forEach(function(dt,j){var o=osc(j%2?'sawtooth':'square',f*(1+(Math.random()-.5)*.003),t,dur+1.5);o.detune.value=dt;lg.connect(o.detune);o.connect(sum)})})};
 S.brass=function(R,t,fs,v,len){len=len||.55;var lp=filt('lowpass',300,2),g=G(),sh=ctx.createWaveShaper(),c=new Float32Array(256);for(var i=0;i<256;i++){var x=i/127.5-1;c[i]=Math.tanh(x*2)}sh.curve=c;
  lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(3800,t+.04);lp.frequency.exponentialRampToValueAtTime(900,t+len);env(g,t,.012,v*2.5,len+.2);
  var pre=G(.25);pre.connect(sh);sh.connect(lp);lp.connect(g);g.connect(R.mus);send(R,g,.4);
  fs.forEach(function(f){[-7,7].forEach(function(dt){var o=osc('sawtooth',f,t,len+.3);o.detune.value=dt;o.connect(pre)})})};
 S.horn=function(R,t,dur,fs,v){var lp=filt('lowpass',500,1.5),g=G();lp.frequency.setValueAtTime(400,t);lp.frequency.linearRampToValueAtTime(1800,t+dur*.6);sus(g,t,dur*.4,v,dur*.7,.8);lp.connect(g);g.connect(R.mus);send(R,g,.55);
  fs.forEach(function(f){[-6,6].forEach(function(dt){var o=osc('sawtooth',f,t,dur+1);o.detune.value=dt;o.connect(lp)})})};
 S.riser=function(R,t,dur,v){var ns=noise(t,dur),bp=filt('bandpass',300,2.5),g=G();bp.frequency.exponentialRampToValueAtTime(7000,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*2,t+dur*.97);g.gain.linearRampToValueAtTime(0,t+dur);ns.connect(bp);bp.connect(g);g.connect(R.mus);send(R,g,.3);
  var o=osc('sawtooth',nf(0,1),t,dur),lp=filt('lowpass',300),og=G();o.frequency.exponentialRampToValueAtTime(nf(0,3),t+dur);lp.frequency.exponentialRampToValueAtTime(5000,t+dur);og.gain.setValueAtTime(.0001,t);og.gain.exponentialRampToValueAtTime(v*.7,t+dur*.97);og.gain.linearRampToValueAtTime(0,t+dur);o.connect(lp);lp.connect(og);og.connect(R.mus)};
 S.swish=function(R,t,dur,v){var ns=noise(t,dur),bp=filt('bandpass',400,3),g=G();bp.frequency.exponentialRampToValueAtTime(6000,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+dur*.95);g.gain.linearRampToValueAtTime(0,t+dur);ns.connect(bp);bp.connect(g);g.connect(R.mus)};
 S.crash=function(R,t,v){var ns=noise(t,2.6),hp=filt('highpass',3800),g=G();env(g,t,.002,v,2.5);ns.connect(hp);hp.connect(g);g.connect(R.dr);send(R,g,.5)};
 S.heart=function(R,t,v){[[0,1],[.26,.7]].forEach(function(x){var tt=t+x[0],o=osc('sine',62,tt,.3),g=G();o.frequency.exponentialRampToValueAtTime(38,tt+.12);env(g,tt,.004,v*x[1],.24);o.connect(g);g.connect(R.sat);
   var ns=noise(tt,.06),lp=filt('lowpass',220),ng=G();env(ng,tt,.002,v*x[1]*.5,.06);ns.connect(lp);lp.connect(ng);ng.connect(R.dr)});duck(R,t,.35,.2)};
 S.bell=function(R,t,f,v){[[1,1,3],[2.76,.3,1.2],[5.4,.12,.6],[.5,.2,2]].forEach(function(p){var o=osc('sine',f*p[0],t,p[2]+.2),g=G();env(g,t,.003,v*p[1],p[2]);o.connect(g);g.connect(R.mus);send(R,g,.8)})};
 S.celesta=function(R,t,f,v){var o=osc('sine',f,t,1.4),o2=osc('triangle',f*2,t,.5),g=G(),g2=G();env(g,t,.002,v,1.3);env(g2,t,.002,v*.25,.4);o.connect(g);o2.connect(g2);g2.connect(g);g.connect(R.mus);send(R,g,.7)};
 S.solo=function(R,t,f,dur,v){var lp=filt('lowpass',1500,.9),g=G(),o=osc('sawtooth',f,t,dur+.6),o2=osc('triangle',f,t,dur+.6),vib=osc('sine',5.4,t,dur+.6),vg=G(0);
  vg.gain.setValueAtTime(0,t);vg.gain.linearRampToValueAtTime(9,t+Math.min(.6,dur*.6));vib.connect(vg);vg.connect(o.detune);vg.connect(o2.detune);
  var m2=G(.6);o2.connect(m2);m2.connect(lp);o.connect(lp);sus(g,t,Math.min(.25,dur*.3),v,dur*.85,.5);lp.connect(g);g.connect(R.mus);send(R,g,.7)};
 S.drone=function(R,t,dur,f,v){var o=osc('sine',f,t,dur+.5),o2=osc('triangle',f*2,t,dur+.5),g=G(),g2=G(.2);o2.connect(g2);g2.connect(g);o.connect(g);sus(g,t,Math.min(1.5,dur*.4),v*.5,dur,Math.max(.5,dur*.2));g.connect(R.mus)};
 S.spark=function(R,t,v){for(var i=0;i<5;i++)S.celesta(R,t+i*.045,nf(i*2,4),v*(1-i*.12));S.swish(R,t-.5,.5,v*.6)};
 // old 808 kit (relentless flavour)
 S.kick=function(R,t,v){var o=osc('sine',160,t,.5),g=G();o.frequency.exponentialRampToValueAtTime(46,t+.12);env(g,t,.002,v,.45);o.connect(g);g.connect(R.sat);duck(R,t,.4,.12)};
 S.b808=function(R,t,f,dur,v){var o=osc('sine',f*2.2,t,dur+.2),g=G();o.frequency.exponentialRampToValueAtTime(f,t+.06);sus(g,t,.004,v,dur*.6,.3);o.connect(g);g.connect(R.sat)};
 S.hat=function(R,t,v){var ns=noise(t,.06),hp=filt('highpass',7200),g=G();env(g,t,.001,v,.045);ns.connect(hp);hp.connect(g);g.connect(R.dr)};
 S.snare=function(R,t,v){var ns=noise(t,.25),bp=filt('bandpass',1900,.6),g=G();env(g,t,.001,v,.22);ns.connect(bp);bp.connect(g);g.connect(R.dr);send(R,g,.35);
  var o=osc('triangle',210,t,.1),og=G();o.frequency.exponentialRampToValueAtTime(150,t+.08);env(og,t,.001,v*.6,.09);o.connect(og);og.connect(R.dr)};
 return S}
// build the whole event list from the parsed timeline
function buildScore(TL,P,S){
 var ev=[],beat=P.beat,st=beat/4,I=P.I,pre=P.pre,r=rng(P.seed*31+7),END=TL.end,nf=S.nf;
 function add(t,f){if(t<0)t=0;if(!TL.silentAt(t))ev.push({t:t,f:f})}
 function chord(bar,oct,span){var dg=P.prog[Math.floor(bar/(span||1))%P.prog.length];return {d:dg,f:[nf(dg,oct),nf(dg+2,oct),nf(dg+4,oct)]}}
 var segs=TL.cues; // [{a,b,name,int}]
 segs.forEach(function(sg){
  var a=sg.a,b=sg.b,nm=sg.name,k=(sg.int||1)*I;if(b-a<.05)return;
  var bar=4*beat,b0=Math.floor(a/bar),b1=Math.ceil(b/bar);
  function span(bi,len){len=len||1;var s=Math.max(a,bi*bar),e=Math.min(b,(bi+len)*bar);return e-s>.05?[s,e]:null}
  // harmony per bar
  for(var bi=b0;bi<b1;bi++){(function(bi){var sp=span(bi);if(!sp)return;var s=sp[0],e=sp[1],d=e-s;
    if(nm==='wonder'){var c=chord(bi,1,2);if(bi%2===0||s===a){var sp2=span(bi,2);add(s,function(R,t){S.strings(R,t,sp2[1]-s-.05,c.f.concat([nf(c.d,2)]),.05*k,900+600*k);S.drone(R,t,sp2[1]-s,P.root/2,.28*k)})}
     if(k>.7&&bi%2===1)add(s,function(R,t){S.choir(R,t,d,[nf(c.d+4,2),nf(c.d+2,2)],.05*k*pre.choir,'oo')});
     if(bi%2===0)add(s,function(R,t){S.bell(R,t,nf(c.d+4,3),.07*pre.bells)})}
    if(nm==='tense'||nm==='build'){var c=chord(bi,1);add(s,function(R,t){S.strings(R,t,d-.03,[nf(c.d,0),nf(c.d,1),nf(c.d+2,1)],.05*k,700);S.drone(R,t,d,P.root/2,.3*k)});
     if(pre.braam&&bi%4===0&&k>.5&&nm==='tense')add(s,function(R,t){S.braam(R,t,Math.min(d*1.6,3),.22*k*pre.braam,c.d)})}
    if(nm==='war'){var c=chord(bi,1);add(s,function(R,t){S.strings(R,t,d-.03,[nf(c.d,0),nf(c.d,1),nf(c.d+4,1)],.06*k,1400);S.drone(R,t,d,P.root/2,.35)});
     if(bi%2===0)add(s,function(R,t){S.braam(R,t,Math.min(2.6,d*1.2),.26*pre.braam,c.d)});
     if(pre.choir>.6&&k>.8)add(s,function(R,t){S.choir(R,t,d,[nf(c.d,2),nf(c.d+2,2),nf(c.d+4,2)],.07*pre.choir,'ah')});
     add(s,function(R,t){S.brass(R,t,[nf(c.d,1),nf(c.d+2,1),nf(c.d+4,1)],.15*pre.brass)});add(s+beat*1.5,function(R,t){S.brass(R,t,[nf(c.d,1),nf(c.d+2,1),nf(c.d+4,1)],.11*pre.brass,.3)})}
    if(nm==='choir'||nm==='tutti'){var c=chord(bi,1);add(s,function(R,t){S.choir(R,t,d,[nf(c.d,2),nf(c.d+2,2),nf(c.d+4,2),nf(c.d,3)],.09*pre.choir*k,'ah');S.strings(R,t,d-.03,[nf(c.d,1),nf(c.d+4,1),nf(c.d+2,2),nf(c.d,3)],.055*k,2600);S.drone(R,t,d,P.root/2,.35)});
     add(s,function(R,t){S.horn(R,t,d,[nf(c.d,0),nf(c.d+4,0),nf(c.d,1)],.08*pre.brass*k)});
     if(nm==='tutti'||bi%2===0)add(s,function(R,t){S.bell(R,t,nf(c.d,4),.06*pre.bells)})}
    if(nm==='weep'){var c=chord(bi,1,2);if(bi%2===0||s===a){var sp2=span(bi,2);add(s,function(R,t){S.strings(R,t,sp2[1]-s-.05,[nf(c.d,0),nf(c.d+2,1),nf(c.d+4,1)],.045*k,800);S.drone(R,t,sp2[1]-s,P.root/2,.25)})}}
    if(nm==='heart'){var c=chord(bi,1,2),prog=(s-a)/(b-a);add(s,function(R,t){S.strings(R,t,d-.03,[nf(0,0),nf(4,0),nf(c.d+2,1)],(.03+.05*prog)*k,500+2200*prog);S.drone(R,t,d,P.root/2,.3)});
     if(prog>.4)add(s,function(R,t){S.choir(R,t,d,[nf(4,2),nf(2,2)],.04*(prog+.3)*pre.choir,'oo')})}
    if(nm==='drone'){add(s,function(R,t){S.drone(R,t,d,P.root/2,.3*k);S.strings(R,t,d,[nf(0,0),nf(4,0)],.025*k,500)})}
    if(nm==='outro'&&s===a){add(s,function(R,t){S.choir(R,t,b-a-.5,[nf(0,2),nf(2,2),nf(4,2)],.07*pre.choir,'oh');S.strings(R,t,b-a-.3,[nf(0,1),nf(4,1),nf(2,2)],.05,1200);S.drone(R,t,b-a,P.root/2,.35);S.bell(R,t,nf(0,3),.08)})}
  })(bi)}
  // step layers
  var i0=Math.ceil(a/st-1e-6),i1=Math.floor(b/st-1e-6);
  for(var i=i0;i<=i1;i++){(function(i){var t=i*st;if(t>=b-.01)return;var s16=i%16,bi=Math.floor(i/16),pos=(t-a)/(b-a);
   // ostinato
   if((nm==='tense'||nm==='build'||nm==='war'||(nm==='choir'&&s16%2===0)||nm==='tutti')&&pre.ost>0&&(pre.ost>=.9||i%Math.round(1/pre.ost)===0)){
    var c=chord(bi,1),x=P.ost[s16],f=x===3?nf(c.d,2):nf(c.d+[0,4,2][x],1),acc=P.acc[s16];
    var v=(nm==='tense'?.05+.04*pos:nm==='build'?.06+.07*pos:.1)*(acc?1.35:.85)*k;add(t,function(R,tt){S.ost(R,tt,f,st*1.6,v,(s16%2?.3:-.3))})}
   // taiko
   if(pre.drums>0){
    if(nm==='tense'&&(s16===0||s16===10))add(t,function(R,tt){S.taiko(R,tt,.35*k*pre.drums,56,false)});
    if(nm==='war'){var tv=P.taikoWar[s16];if(tv)add(t,function(R,tt){S.taiko(R,tt,(tv>=1?.8:.45)*pre.drums,tv>=1?58:74,true)});if(s16%2===0)add(t,function(R,tt){S.shime(R,tt,s16%4===0?.2:.12)})}
    if((nm==='choir'||nm==='tutti')&&(s16===0||s16===8||(nm==='tutti'&&P.taiko[s16])))add(t,function(R,tt){S.taiko(R,tt,(s16===0?.85:.6)*pre.drums,56,true)});
    if(nm==='tutti'&&s16%2===0)add(t,function(R,tt){S.shime(R,tt,.12)});
   }
   // build: accelerating roll
   if(nm==='build'){var div=pos<.34?4:pos<.67?2:1;if(i%div===0)add(t,function(R,tt){S.taiko(R,tt,(.18+.5*pos)*pre.drums,70,false);S.snare(R,tt,.05+.2*pos)})}
   // wonder celesta arpeggio
   if(nm==='wonder'&&s16%2===0&&r()<.55*pre.bells+.1){var c=chord(bi,1,2),f=nf(c.d+[0,2,4,7,4,2][Math.floor(r()*6)],3);add(t,function(R,tt){S.celesta(R,tt,f,.045*pre.bells*k)})}
   // heartbeat on every 2 beats (a slow pulse)
   if(nm==='heart'&&s16%8===0)add(t,function(R,tt){S.heart(R,tt,.75)});
   // 808 relentless flavour
   if(pre.o808&&(nm==='tense'||nm==='war'||nm==='choir'||nm==='tutti'||nm==='pulse'||nm==='build')){
    if(s16%2===0||nm!=='tense')add(t,function(R,tt){S.hat(R,tt,s16%4===0?.1:.06)});
    if(P.b8[s16]&&nm!=='build'){var c=chord(bi,1);var bf=nf(c.d,0);add(t,function(R,tt){S.b808(R,tt,bf,st*2.5,.45)})}
    if((s16===0||s16===10)&&nm!=='build')add(t,function(R,tt){S.kick(R,tt,.7)});
    if(s16===8&&nm!=='build')add(t,function(R,tt){S.snare(R,tt,.3)})}
   if(nm==='pulse'){if(s16%4===0)add(t,function(R,tt){S.kick(R,tt,.6);S.b808(R,tt,P.root,beat*.7,.3)})}
  })(i)}
  // weeping melody
  if(nm==='weep'){var tt=a+beat,mi=0;while(tt<b-beat){var m=P.mel[mi%P.mel.length],l=m.l*beat;if(tt+l>b)l=b-tt-.1;(function(t,f,l){add(t,function(R,x){S.solo(R,x,f,l*.95,.09*k)})})(tt,nf(m.d,2),l);tt+=l;mi++;if(mi%6===5)tt+=beat}}
  // section entries
  if(nm==='build')add(a,function(R,t){S.riser(R,t,b-a,.2*k)});
  if(nm==='war')add(a,function(R,t){S.impact(R,t,.8,true);S.crash(R,t,.2)});
  if(nm==='choir')add(a,function(R,t){S.crash(R,t,.25);S.subdrop(R,t,.55);S.bell(R,t,nf(0,4),.08)});
  if(nm==='tutti')add(a,function(R,t){S.impact(R,t,1,true);S.crash(R,t,.3);S.braam(R,t,3,.3,0);S.brass(R,t,[nf(0,1),nf(2,1),nf(4,1),nf(0,2)],.2,1.2)});
 });
 // cuts, hits, drops, sfx
 TL.hits.forEach(function(h){add(h.t,function(R,t){
  if(h.kind==='cut'){S.taiko(R,t,.95*Math.max(.6,pre.drums),54,true);S.impact(R,t,.35,false);if(h.last){S.braam(R,t,2.2,.28,0);S.crash(R,t,.22)}}
  else if(h.kind==='drop'){S.impact(R,t,1.05,true);S.subdrop(R,t,.95,2.6);S.braam(R,t,2.4,.3,0)}
  else if(h.lvl===1){S.impact(R,t,.7,false)}else if(h.lvl===2){S.impact(R,t,1,true);S.crash(R,t,.25)}else{S.crash(R,t,.2);S.taiko(R,t,.6,60,true)}})});
 TL.sfx.forEach(function(x){if(x.file)return;var n=x.name,g=x.gain;add(x.t,function(R,t){
  if(n==='spark')S.spark(R,t,.1*g);else if(n==='impact')S.impact(R,t,.9*g,true);else if(n==='braam')S.braam(R,t,2.5,.3*g,0);
  else if(n==='riser')S.riser(R,t,x.dur||2,.2*g);else if(n==='heartbeat')S.heart(R,t,.8*g);else if(n==='bell')S.bell(R,t,nf(0,3),.1*g);
  else if(n==='taiko')S.taiko(R,t,.9*g,56,true);else if(n==='subdrop')S.subdrop(R,t,.9*g);else if(n==='crash')S.crash(R,t,.25*g);
  else if(n==='whoosh')S.swish(R,t,.8,.15*g);else if(n==='stab')S.brass(R,t,[nf(0,1),nf(2,1),nf(4,1)],.2*g);
  else if(n==='choir')S.choir(R,t,4,[nf(0,2),nf(2,2),nf(4,2)],.09*g,'ah')})});
 ev.sort(function(a,b){return a.t-b.t});return ev}

// ---------- runtime ----------
var VOL=.9,$=function(id){return document.getElementById(id)},root=document.body,SRC=root.getAttribute('data-scroll')||'power.scroll';
var qs=new URLSearchParams(location.search),seed=parseInt(qs.get('seed'),10),startAt=parseTime(qs.get('at')||'0')||0;
var DOC=null,TL=null,P=null,ctx=null,noiseBuf=null,run=null,muted=false,playing=false,t0=0,evs=[],ei=0,timer=null,buffers={};
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function fmt(s){return esc(s).replace(/(^|[\s(\u2014])"/g,'$1&ldquo;').replace(/"/g,'&rdquo;').replace(/(^|[\s(])'/g,'$1&lsquo;').replace(/'/g,'&rsquo;').replace(/\s+\/\s+/g,'<br>').replace(/\.\.\./g,'&hellip;')}
function resolve(tpl,name){if(/[\/.]/.test(name))return name;return tpl.indexOf('{}')>=0?tpl.replace('{}',name):tpl+name}
var KEN={in:{k:[1.03,1.17]},out:{k:[1.19,1.04]},push:{k:[1.0,1.32]},left:{k:[1.13,1.13],x:[3,-3]},right:{k:[1.13,1.13],x:[-3,3]},up:{k:[1.12,1.14],y:[3,-3]},down:{k:[1.12,1.14],y:[-3,3]},drift:{k:[1.06,1.12],x:[-1.5,1.5]},still:{k:[1.04,1.04]},slow:{k:[1.04,1.1]}};
function ken(spec){var o={k:[1.05,1.14],x:[0,0],y:[0,0]};(spec||'slow').split(/[,+]/).forEach(function(n){var p=KEN[n];if(!p)return;for(var q in p)o[q]=p[q]});return o}
// ---------- compile the parsed scroll into a timeline on the beat grid ----------
function compile(doc,beat){
 var m=doc.meta,g=m.snap?beat*m.snap:0,sn=function(x){return g?Math.round(x/g)*g:x},st=beat/4;
 var T={end:sn(m.end),shots:[],cues:[],silent:[],hits:[],sfx:[],items:[],files:[],grades:[]};
 var prevCue='drone',prevInt=1,eff=[];
 doc.scenes.forEach(function(sc,idx){
  var a=sn(sc.a),b=sn(sc.b);if(b<=a)b=a+g||a+.5;
  var silent=/silent/.test(sc.hold||'');if(silent)T.silent.push([a,b]);
  // effective music cue
  var cue,ci=1;if(sc.cue){var cc=sc.cue.split(/[\s,]+/);cue=cc[0];ci=parseFloat(cc[1])||1;prevCue=cue;prevInt=ci}else{cue=prevCue;ci=prevInt}
  if(silent||(sc.drop&&!sc.cue))cue='none';
  eff.push({a:a,b:b,name:cue,int:ci});
  // visuals
  var base={ken:ken(sc.ken),fx:sc.fx,fade:sc.fade,flip:sc.flip,grade:sc.grade,shake:sc.shake||sc.hit===2,hit:sc.hit||0};
  if(sc.cuts){var n=sc.cuts.length,cg=(b-a)/n>=beat*.9?beat:st;for(var i=0;i<n;i++){var ca=i?Math.round((a+i*(b-a)/n)/cg)*cg:a,cb=i<n-1?Math.round((a+(i+1)*(b-a)/n)/cg)*cg:b,nm=sc.cuts[i].trim(),fl=/!$/.test(nm);nm=nm.replace(/!$/,'');
   T.shots.push({a:ca,b:cb,img:nm==='black'?null:nm,ken:ken(i%2?'push':'in'),hit:1,flip:fl,shake:i===n-1,grade:sc.grade});T.hits.push({t:ca,kind:'cut',last:i===n-1})}}
  else T.shots.push(Object.assign({a:a,b:b,img:sc.black||sc.white?null:sc.img,video:sc.video,white:sc.white,drop:sc.drop},base));
  if(sc.hit&&!sc.cuts)T.hits.push({t:a,kind:'hit',lvl:sc.hit});
  if(sc.drop)T.hits.push({t:a,kind:'drop'});
  sc.sfx.forEach(function(x){var t=a+(x.off||0),file=/\.(mp3|wav|ogg|m4a|flac)$/i.test(x.name);T.sfx.push({t:t,name:x.name,gain:x.gain,file:file,dur:b-t});if(file)T.files.push({src:x.name,at:t,gain:x.gain,role:'sfx'})});
  sc.audio.forEach(function(x){var f=Object.assign({},x);f.at=a+(x.at||0);T.files.push(f)});
  // text items: explicit +offsets anchor, the rest share the gaps evenly (per layer)
  var layers={card:[],vo:[],drop:[]};sc.items.forEach(function(it){layers[it.kind==='vo'?'vo':it.kind==='drop'?'drop':'card'].push(it)});
  Object.keys(layers).forEach(function(L){var arr=layers[L],d=b-a,i=0;
   while(i<arr.length){var s=isNaN(arr[i].off)?(i?null:0):arr[i].off;var j=i+1;while(j<arr.length&&isNaN(arr[j].off))j++;
    var endT=j<arr.length?arr[j].off:d;if(s===null)s=0;var cnt=j-i,sl=(endT-s)/cnt;
    for(var k=i;k<j;k++){var ia=a+s+sl*(k-i),ib=a+s+sl*(k-i+1);T.items.push({layer:L,kind:arr[k].kind,a:Math.round(ia/st)*st,b:Math.min(b,Math.round(ib/st)*st),text:arr[k].text,ref:arr[k].ref})}
    i=j}});
 });
 // merge cues
 eff.forEach(function(e){var l=T.cues[T.cues.length-1];if(l&&l.name===e.name&&l.int===e.int&&Math.abs(l.b-e.a)<.01)l.b=e.b;else T.cues.push({a:e.a,b:e.b,name:e.name,int:e.int})});
 // pre-drop gap: half a beat of nothing before a drop (hard cut)
 T.hits.forEach(function(h){if(h.kind==='drop'&&h.t>beat)T.silent.push([h.t-beat*.5,h.t,1])});
 doc.audio.forEach(function(x){T.files.push(Object.assign({},x))});
 T.silentAt=function(t){for(var i=0;i<T.silent.length;i++){var w=T.silent[i];if(t>=w[0]-.005&&t<w[1]-.005)return true}return false};
 return T}
// ---------- audio graph ----------
function initAudio(){if(ctx)return;var AC=window.AudioContext||window.webkitAudioContext;ctx=new AC({latencyHint:'playback'});noiseBuf=mkNoise(ctx)}
function mkNoise(c){var b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b}
function makeIR(c,sec){var L=Math.floor(c.sampleRate*sec),ir=c.createBuffer(2,L,c.sampleRate);
 for(var ch=0;ch<2;ch++){var d=ir.getChannelData(ch),lp=0;
  for(var i=0;i<L;i++){var p=i/L,n=Math.random()*2-1,a=.35+.6*p;lp=lp+(n-lp)*(1-a*.9);d[i]=lp*Math.pow(1-p,2.6)*(i<c.sampleRate*.012?0:1)}
  [.013,.021,.034,.047,.061,.078].forEach(function(e,k){var j=Math.floor(e*c.sampleRate*(ch?1.07:1));if(j<L)d[j]+=(k%2?-.5:.6)*(1-k*.12)})}
 return ir}
function makeRun(c,dest,raw){var R={},G=function(v){var g=c.createGain();g.gain.value=v;return g};
 R.master=G(muted?0:VOL);R.master.connect(dest);
 var clip=c.createWaveShaper(),cv=new Float32Array(2048);for(var i=0;i<2048;i++){var x=i/1023.5-1,ax=Math.abs(x);cv[i]=ax<.85?x:Math.sign(x)*(.85+.13*Math.tanh((ax-.85)/.13))}clip.curve=cv;
 var lim=c.createDynamicsCompressor();lim.threshold.value=-2;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.09;
 var comp=c.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=10;comp.ratio.value=2.4;comp.attack.value=.012;comp.release.value=.22;
 R.gate=G(1);R.makeup=G(1.25);if(raw)R.gate.connect(R.master);else R.gate.connect(comp);comp.connect(R.makeup);R.makeup.connect(lim);lim.connect(clip);clip.connect(R.master);
 R.sum=G(1);R.sum.connect(R.gate);R.duck=G(1);R.duck.connect(R.sum);R.sec=G(1);R.sec.connect(R.duck);R.mus=G(1);R.mus.connect(R.sec);R.dr=G(.9);R.dr.connect(R.sum);R.vo=G(1);R.vo.connect(R.sum);R.bed=G(1);R.bed.connect(R.sum);
 R.sat=c.createWaveShaper();var sc=new Float32Array(1024);for(i=0;i<1024;i++){var y=i/511.5-1;sc[i]=Math.tanh(y*2.4)}R.sat.curve=sc;var sg=G(.55);R.sat.connect(sg);sg.connect(R.dr);
 R.revIn=G(1);var cv2=c.createConvolver();cv2.buffer=makeIR(c,3.6);var rh=c.createBiquadFilter();rh.type='highpass';rh.frequency.value=180;R.revIn.connect(rh);rh.connect(cv2);var ro=G(.42);cv2.connect(ro);ro.connect(R.duck);
 R.parts=[R.master,comp,lim];return R}
function scheduleGate(R,c,off,base){var g=R.gate.gain;g.setValueAtTime(1,base);TL.silent.forEach(function(w){var a=base+w[0]-off,b=base+w[1]-off;if(w[1]<=off)return;
 if(a>base)g.setTargetAtTime(0,a,.004);else g.setValueAtTime(0,base);g.setTargetAtTime(1,b,.003)})}
var ARC={wonder:.32,weep:.42,drone:.38,heart:.5,tense:.68,build:.8,war:1,choir:1.3,tutti:1.45,outro:.55,pulse:.8};
function scheduleArc(R,off,base){var g=R.sec.gain;g.setValueAtTime(.5,base);TL.cues.forEach(function(c){var lv=ARC[c.name];if(lv==null||c.b<=off)return;var a=Math.max(base,base+c.a-off);g.setTargetAtTime(lv,a,c.name==='build'?.4:.12)})}
function scheduleFiles(R,c,off,base){var B=c===ctx?buffers:(c.__b||{});TL.files.forEach(function(f){var buf=B[f.src];if(!buf)return;if(f.until&&f.until<=off+.05)return;var s=c.createBufferSource();s.buffer=buf;s.loop=!!f.loop;var g=c.createGain(),start=base+f.at-off,so=f.offset||0;
 if(f.at<off){so+=off-f.at;start=base}if(!f.loop&&so>=buf.duration)return;g.gain.value=f.gain;if(f.fade){g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(f.gain,start+f.fade)}
 var dst=f.role==='vo'?R.vo:f.role==='sfx'?R.dr:R.bed;s.connect(g);g.connect(dst);s.start(start,f.loop?so%buf.duration:so);
 var endT=f.until?base+f.until-off:(f.loop?base+TL.end-off+.5:start+buf.duration-so);if(f.until||f.loop){if(f.fade)g.gain.setTargetAtTime(.0001,Math.max(start,endT-f.fade),f.fade/4);s.stop(Math.max(start,endT)+.1)}
 if(f.duck||f.role==='vo'){R.mus.gain.setTargetAtTime(.45,start,.08);R.mus.gain.setTargetAtTime(1,Math.min(endT,start+buf.duration-so),.3)}})}
var PF={};function prefetch(s){if(!PF[s])PF[s]=fetch(s).then(function(r){if(!r.ok)throw new Error(r.status);return r.arrayBuffer()});return PF[s]}
function loadFiles(c){c=c||ctx;var into=c===ctx?buffers:(c.__b={});var srcs={};TL.files.forEach(function(f){srcs[f.src]=1});return Promise.all(Object.keys(srcs).map(function(s){if(into[s])return;
 return prefetch(s).then(function(ab){ab=ab.slice(0);return new Promise(function(ok,no){c.decodeAudioData(ab,ok,no)})}).then(function(b){into[s]=b}).catch(function(e){console.warn('scroll: audio '+s+' not loaded',e&&e.message)})}))}
// ---------- scheduler ----------
function schedule(){if(!run)return;var now=ctx.currentTime-t0;while(ei<evs.length&&evs[ei].t<now+.3){var e=evs[ei++];if(e.t>=now-.03){try{e.f(run,t0+Math.max(e.t,now))}catch(err){}}}}
function stopRun(){if(!run)return;var R=run;run=null;try{R.master.gain.cancelScheduledValues(ctx.currentTime);R.master.gain.setTargetAtTime(0,ctx.currentTime,.03)}catch(e){}setTimeout(function(){try{R.master.disconnect()}catch(e){}},500)}
// ---------- visuals ----------
var stage=$('stage'),fxEl=$('fx'),dove=$('dove'),card=$('card'),cl=$('cline'),cr=$('cref'),vo=$('vo'),vl=$('vline'),vr=$('vref'),drop=$('drop'),dl=$('dline'),dr=$('dref'),flash=$('flash'),grain=$('grain');
var curShot=-1,curItem={card:-1,vo:-1,drop:-1};
function buildDOM(){stage.innerHTML='';TL.shots.forEach(function(s){var d=document.createElement('div');d.className='sc'+(s.fade?' fade':'')+(s.white?' white':'');
  if(s.video){var v=document.createElement('video');v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.src=resolve(DOC.meta.videos,s.video);d.appendChild(v);s.el=v;s.isVid=true}
  else if(s.img){var im=new Image();im.decoding='async';im.alt='';im.src=resolve(DOC.meta.images,s.img);d.appendChild(im);s.el=im}
  stage.appendChild(d);s.box=d})}
function lerp(a,b,p){return a+(b-a)*p}
function setItem(L,idx,t){var it=idx>=0?TL.items[idx]:null,box=L==='card'?card:L==='vo'?vo:drop,line=L==='card'?cl:L==='vo'?vl:dl,ref=L==='card'?cr:L==='vo'?vr:dr;
 if(!it){if(L==='drop'){box.className='';box.hidden=true}else box.className=box.className.replace(/\bin\b/,'').trim()+' out';return}
 line.innerHTML=fmt(it.text);ref.innerHTML=it.ref?fmt(it.ref):'';ref.style.display=it.ref?'':'none';
 if(L==='drop'){box.hidden=false;box.className='on'}
 else{box.className=(it.kind==='title'?'title ':it.kind==='chapter'?'chapter ':'')+'in'}
 layout()}
function layout(){card.style.transform='';var vb=vo.getBoundingClientRect(),cb=card.getBoundingClientRect();
 if(/\bin\b/.test(vo.className)&&/\bin\b/.test(card.className)&&cb.bottom>vb.top-10){card.style.transform='translateY('+(-(cb.bottom-vb.top+14))+'px)'}}
function frame(){if(!playing)return;schedule();var t=ctx.currentTime-t0;if(t>=TL.end){finish();return}
 var idx=-1;for(var i=0;i<TL.shots.length;i++){var s=TL.shots[i];if(t>=s.a&&t<s.b){idx=i;break}}
 if(idx!==curShot){if(curShot>=0){var ps=TL.shots[curShot];ps.box.classList.remove('on');if(ps.isVid)try{ps.el.pause()}catch(e){}}
  if(idx>=0){var sh=TL.shots[idx];sh.box.classList.add('on');stage.setAttribute('data-g',sh.grade||'');
   if(sh.isVid){try{sh.el.currentTime=Math.max(0,t-sh.a);sh.el.play().catch(function(){})}catch(e){}}
   if(sh.hit||sh.drop){flash.style.transition='none';flash.style.opacity=sh.drop?.0:sh.hit>=2||sh.shake?.5:.28;requestAnimationFrame(function(){flash.style.transition='opacity .3s';flash.style.opacity=0})}
   if(sh.shake){document.body.classList.remove('shake');void document.body.offsetWidth;document.body.classList.add('shake')}}
  curShot=idx}
 var sh=idx>=0?TL.shots[idx]:null;
 if(sh&&sh.el&&!sh.isVid){var p=Math.min(1,Math.max(0,(t-sh.a)/(sh.b-sh.a))),e=p*p*(3-2*p)*.35+p*.65,K=sh.ken,k=lerp(K.k[0],K.k[1],e);
  sh.el.style.transform='translate3d('+lerp(K.x[0],K.x[1],e)+'%,'+lerp(K.y[0],K.y[1],e)+'%,0) scale('+(sh.flip?-k:k)+','+k+')'}
 // fx overlays
 var fx=sh&&sh.fx,op=0;if(fx==='dove'||fx==='rise'){var p2=(t-sh.a)/(sh.b-sh.a);op=Math.min(1,p2*5,(1-p2)*5);
  dove.firstChild.style.transform=fx==='dove'?'translate('+lerp(-70,190,p2)+'%,'+(Math.sin(p2*3.14)*-20)+'%) scale(.85)':'translate(40%,'+lerp(90,-70,p2)+'%) scale('+lerp(.5,1.1,p2)+')'}
 dove.style.opacity=op;fxEl.style.opacity=fx==='flare'?(.45+.25*Math.sin(t*2)):0;
 // text layers
 ['card','vo','drop'].forEach(function(L){var f=-1;for(var i=0;i<TL.items.length;i++){var it=TL.items[i];if(it.layer===L&&t>=it.a&&t<it.b){f=i;break}}
  if(f!==curItem[L]){curItem[L]=f;setItem(L,f,t)}
  else if(f>=0&&L!=='drop'){var it=TL.items[f],box=L==='card'?card:vo;if(t>it.b-.3&&!/out/.test(box.className)){var nx=null;for(var j=0;j<TL.items.length;j++){var o=TL.items[j];if(o.layer===L&&Math.abs(o.a-it.b)<.01)nx=o}if(!nx)box.className=box.className.replace(/\bin\b/,'out')}}});
 grain.style.transform='translate('+((Math.random()*8|0)-4)+'%,'+((Math.random()*8|0)-4)+'%)';
 window.__scrollT=t;window.__scrollText=[cl,vl,dl].map(function(x,i){var b=[card,vo,drop][i];return (i===2?!drop.hidden:/\bin\b/.test(b.className))?x.textContent:''}).join(' | ');
 window.__scrollScene=sh?(sh.img||sh.video||'black'):'none';requestAnimationFrame(frame)}
function start(){initAudio();if(ctx.state!=='running')ctx.resume();stopRun();P=makeParams(DOC.meta,seed);
 var go2=function(){var S=Score(ctx,P,noiseBuf);evs=DOC.meta.generative?buildScore(TL,P,S):[];ei=0;run=makeRun(ctx,ctx.destination);
  var off=Math.max(0,Math.min(startAt,TL.end-1));startAt=0;t0=ctx.currentTime+.15-off;while(ei<evs.length&&evs[ei].t<off-.02)ei++;
  scheduleGate(run,ctx,off,t0+off);scheduleArc(run,off,t0+off);try{scheduleFiles(run,ctx,off,t0+off)}catch(e){console.warn('scroll: audio file scheduling failed',e&&e.message)}
  curShot=-1;curItem={card:-1,vo:-1,drop:-1};TL.shots.forEach(function(s){s.box.classList.remove('on')});card.className='';vo.className='';drop.hidden=true;
  $('ov').hidden=true;$('load').textContent='';$('end').hidden=true;$('ctl').hidden=false;playing=true;if(timer)clearInterval(timer);timer=setInterval(schedule,50);requestAnimationFrame(frame)};
 if(TL.files.length)$('load').textContent='Starting\u2026';loadFiles().then(go2,go2)}
function finish(){playing=false;clearInterval(timer);timer=null;setTimeout(stopRun,2500);TL.shots.forEach(function(s){s.box.classList.remove('on')});card.className='';vo.className='';drop.hidden=true;
 $('seedv').textContent=seed;$('share').href=location.pathname+'?seed='+seed;$('end').hidden=false;$('ctl').hidden=true;window.__scrollScene='end'}
function setSeed(s){seed=s;var u=new URL(location.href);u.searchParams.set('seed',s);u.searchParams.delete('at');history.replaceState(null,'',u)}
function remix(){setSeed(1+Math.floor(Math.random()*999998));start()}
function grainTex(){var c=document.createElement('canvas');c.width=c.height=160;var x=c.getContext('2d'),d=x.createImageData(160,160);for(var i=0;i<d.data.length;i+=4){var v=Math.random()*255|0;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0);grain.style.backgroundImage='url('+c.toDataURL()+')'}
// offline render (verification): returns loudness stats per window, optionally a WAV (base64)
window.__scrollOffline=function(sd,opt){opt=opt||{};var sr=opt.sr||32000,p=makeParams(DOC.meta,sd||seed),oc=new OfflineAudioContext(2,Math.ceil((TL.end+3)*sr),sr),nb=mkNoise(oc);
 var save=ctx;ctx=oc;var S=Score(oc,p,nb),R=makeRun(oc,oc.destination,opt.raw);R.master.gain.value=VOL;var ev=DOC.meta.generative?buildScore(TL,p,S):[];ev.forEach(function(e){try{e.f(R,e.t+.05)}catch(x){}});scheduleGate(R,oc,0,.05);scheduleArc(R,0,.05);ctx=save;
 return loadFiles(oc).then(function(){scheduleFiles(R,oc,0,.05);return oc.startRendering()}).then(function(b){var L=b.getChannelData(0),Rr=b.getChannelData(1),w=Math.floor(sr*(opt.win||.5)),out=[],pk=0,clips=0;
  for(var i=0;i<L.length;i+=w){var m=0,s=0,n=0;for(var j=i;j<Math.min(L.length,i+w);j++){var a=Math.max(Math.abs(L[j]),Math.abs(Rr[j]));if(a>m)m=a;s+=L[j]*L[j]+Rr[j]*Rr[j];n+=2;if(a>=.999)clips++}if(m>pk)pk=m;out.push([+(i/sr).toFixed(2),+(20*Math.log10(m+1e-9)).toFixed(1),+(10*Math.log10(s/n+1e-12)).toFixed(1)])}
  var res={peak:+(20*Math.log10(pk)).toFixed(2),clips:clips,win:out,end:TL.end,bpm:p.bpm,events:ev.length};
  if(opt.wav){var n=L.length,buf=new ArrayBuffer(44+n*4),v=new DataView(buf),ws=function(o,s){for(var k=0;k<s.length;k++)v.setUint8(o+k,s.charCodeAt(k))};ws(0,'RIFF');v.setUint32(4,36+n*4,true);ws(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sr,true);v.setUint32(28,sr*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,n*4,true);
   for(i=0;i<n;i++){v.setInt16(44+i*4,Math.max(-1,Math.min(1,L[i]))*32767,true);v.setInt16(46+i*4,Math.max(-1,Math.min(1,Rr[i]))*32767,true)}var u8=new Uint8Array(buf),str='';for(i=0;i<u8.length;i+=32768)str+=String.fromCharCode.apply(null,u8.subarray(i,i+32768));res.wav=btoa(str)}
  return res})};
function boot(txt){DOC=parseScroll(txt);if(DOC.errors.length)console.warn('scroll:',DOC.errors.join('; '));if(!(seed>0))seed=DOC.meta.seed||1;
 var beat=60/DOC.meta.tempo;TL=compile(DOC,beat);document.body.classList.add('g-'+(DOC.meta.grade||'warm').split(/\s+/)[0]);
 if(DOC.meta.title){$('ttl').textContent=DOC.meta.title}if(DOC.meta.subtitle)$('sub').textContent=DOC.meta.subtitle;
 $('len').textContent=Math.floor(TL.end/60)+':'+('0'+Math.round(TL.end%60)).slice(-2);$('endn').innerHTML=DOC.meta.endnote?fmt(DOC.meta.endnote):'';$('endr').innerHTML=DOC.meta.endref?fmt(DOC.meta.endref):'';
 TL.files.forEach(function(f){prefetch(f.src).catch(function(){})});
 if(TL.files.length)$('mus').textContent=DOC.meta.generative?'live score with soundtrack cues':'soundtrack';
 buildDOM();grainTex();var dimg=dove.firstChild;dimg.src=resolve(DOC.meta.images,'dove');
 var ims=stage.querySelectorAll('img'),seen={},list=[];[].forEach.call(ims,function(im){if(!seen[im.src]){seen[im.src]=1;list.push(im)}});var left=list.length,go=$('go'),ld=$('load');
 function one(){left--;ld.textContent=left>0?'Loading '+Math.round(100*(1-left/list.length))+'%':'';if(left<=0)ready()}
 function ready(){go.disabled=false;ld.textContent=''}
 list.forEach(function(im){if(im.complete)one();else{im.addEventListener('load',one);im.addEventListener('error',one)}});if(!list.length)ready();setTimeout(ready,7000);
 window.__scrollDoc=DOC;window.__scrollTL=TL}
$('go').onclick=start;$('replay').onclick=start;$('remix').onclick=remix;$('remix2').onclick=remix;
$('mute').onclick=function(){muted=!muted;this.textContent=muted?'Muted':'Sound on';this.setAttribute('aria-label',muted?'Unmute':'Mute');if(run)run.master.gain.setTargetAtTime(muted?0:VOL,ctx.currentTime,.02)};
document.addEventListener('keydown',function(e){if(e.key==='m'||e.key==='M')$('mute').click()});
$('go').disabled=true;fetch(SRC,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('scroll '+r.status);return r.text()}).then(boot).catch(function(e){$('load').textContent='Could not load the film ('+e.message+').'});
window.__scrollDebug=function(name,args,dur,raw){var sr=32000,oc=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),p=makeParams(DOC.meta,1),S=Score(oc,p,mkNoise(oc)),R=makeRun(oc,oc.destination,raw!==false);R.master.gain.value=1;
 var a=(args||[]).map(function(x){return typeof x==='string'&&x[0]==='@'?S.nf(parseInt(x.slice(1),10),parseInt(x.split(',')[1]||'2',10)):x});S[name].apply(null,[R,.05].concat(a));
 return oc.startRendering().then(function(b){var L=b.getChannelData(0),n=L.length,re=new Float32Array(n);re.set(L);return Array.from(re.filter(function(_,i){return i%1===0}).slice(0,n))})};
window.__scrollSeek=function(t){startAt=t;start()};

})();
