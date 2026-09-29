(function(){
'use strict';
var VOL=.72;var $=function(id){return document.getElementById(id)};
var IMGV='-1.webp';
// ---------- seed ----------
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var qs=new URLSearchParams(location.search);
var seed=parseInt(qs.get('seed'),10);if(!(seed>0))seed=1;
var startAt=parseFloat(qs.get('at'))||0;
// ---------- timeline (nominal seconds, snapped to the beat grid) ----------
var SCENES=[
 {s:0,e:2.2},
 {s:2.2,e:3,img:'light',k:[1.35,1.08],x:[0,0],y:[3,0]},
 {s:3,e:7,img:'face',k:[1.02,1.18],x:[0,0],y:[0,-2]},
 {s:7,e:11,img:'crowd',k:[1.12,1.2],x:[-3,3],y:[0,0]},
 {s:11,e:13},
 {s:13,e:18,img:'hands',k:[1.05,1.16],x:[1,-1],y:[0,0]},
 {s:18,e:22,img:'millstone',k:[1.2,1.28],x:[0,0],y:[-5,4],dim:[1,.45]},
 {s:22,e:25,img:'eyes',k:[1.05,1.22],x:[0,0],y:[0,0]},
 {s:25,e:26,img:'braid',k:[1.1,1.2],x:[0,-2],y:[0,0],hit:1},
 {s:26,e:27,img:'cords',k:[1.15,1.3],x:[2,-2],y:[0,0],hit:1,rot:[-2,2]},
 {s:27,e:28,img:'knot',k:[1.1,1.25],x:[0,0],y:[0,0],hit:1},
 {s:28,e:29,img:'knot',k:[1.45,1.6],x:[3,0],y:[0,0],hit:1,flip:1},
 {s:29,e:30,img:'whip',k:[1.1,1.22],x:[0,0],y:[2,-2],hit:1},
 {s:30,e:32,img:'tables',k:[1.08,1.18],x:[-2,2],y:[0,0],hit:1},
 {s:32,e:34,img:'doves',k:[1.1,1.2],x:[0,0],y:[3,-3],hit:1},
 {s:34,e:36,img:'stone',k:[1.05,1.15],x:[0,0],y:[0,0],hit:2},
 {s:36,e:40,img:'ruins',k:[1.1,1.22],x:[2,-2],y:[0,0]},
 {s:40,e:50,img:'close',k:[1.0,1.24],x:[0,0],y:[0,-1]},
 {s:50,e:52.5,img:'dawn',k:[1.05,1.15],x:[0,0],y:[0,0],hit:3},
 {s:52.5,e:55,img:'rise',k:[1.05,1.2],x:[0,0],y:[2,-3]},
 {s:55,e:59}
];
var TEXTS=[
 [0.3,2.1,'There is a love so great<br>it cannot be contained'],
 [2.2,3,'Overflowing',0,1],
 [3.1,4.1,'It overflows.'],[4.1,5.1,'For the lost.'],[5.1,6,'The misguided.'],[6,6.95,'Even for you.'],
 [7.2,9,'Your hands can<br>wound the body.'],[9,10.9,'They cannot touch<br>what He holds.'],
 [13.4,17.8,'Hear His words about<br>the little ones','Matthew 18:6'],
 [18.2,20,'Better a millstone<br>around the neck,'],[20,21.9,'and the depths<br>of the sea.'],
 [22.3,24.9,'&ldquo;I never knew you.&rdquo;','Matthew 7:23'],
 [30,32,'He made a whip of cords','John 2:15'],
 [32,34,'And drove them out of<br>His Father&rsquo;s house.'],
 [34,36,'Not one stone<br>left on another.','Matthew 24:2 &middot; 70 AD'],
 [36.2,38,'They ignored Him.'],[38,39.9,'History remembers.'],
 [40.2,42,'I will not fear'],[42,44,'Fear shrinks the soul'],[44,46,'Let it come.<br>Let it pass.'],[46,48,'Only He remains'],[48,49.9,'And I will stand'],
 [50.3,54.8,'&ldquo;Do not fear,<br>for I am with you.&rdquo;','Isaiah 41:10'],
 [55.4,58.6,'Do not be afraid',0,1]
];
var END=59;
// ---------- music parameters from seed ----------
var P,beat,q,q8;
function params(sd){
 var r=rng(sd*9973+17);
 var roots=[65.41,61.74,58.27,55.0,69.3,51.91];            // C2 default (boxing bass sits ~53-86 Hz)
 var scales=[[0,2,3,5,7,8,10],[0,1,3,5,7,8,10],[0,2,3,5,7,8,11],[0,3,5,7,10,12,15]];
 var p={bpm:sd===1?129:Math.round((125+r()*8)*2)/2,
  root:sd===1?roots[0]:roots[Math.floor(r()*roots.length)],
  scale:sd===1?scales[0]:scales[Math.floor(r()*scales.length)],
  swing:r()*0.06, r:r};
 // 2-bar 808 pattern (32 sixteenths): probability map in drill/half-time style
 var bassP=[1,0,0,.35,0,0,.55,0,.2,0,.6,0,.1,.45,0,.2, .9,0,0,.4,0,.25,.5,0,0,.35,.55,0,.2,0,.5,.3];
 var degs=[0,0,0,-2,3,5,-4,7];
 p.bass=[];for(var i=0;i<32;i++){var on=i===0||i===16||r()<bassP[i];p.bass.push(on?{d:degs[Math.floor(r()*degs.length)]*(i===0?0:1),g:r()<.3,l:1+Math.floor(r()*3)}:null)}
 p.hat=[];for(i=0;i<32;i++){p.hat.push(i%2===0?1:(r()<.35?(r()<.3?3:2):0))} // 1 = 8th, 2 = 16th, 3 = triplet roll
 p.kick=[];for(i=0;i<32;i++)p.kick.push(i===0||i===16||(r()<.25&&i%4===3)||(r()<.3&&(i===10||i===26)));
 p.snare=[];for(i=0;i<32;i++)p.snare.push(i===8||i===24?1:(r()<.08&&i%2===1?.35:0));
 p.pl=[];var len=[8,8,6,12][Math.floor(r()*4)];for(i=0;i<16;i++){p.pl.push(r()<.62?Math.floor(r()*7):-1)}
 p.plDiv=len;
 var progs=[[0,5,2,6],[0,5,3,4],[0,6,5,4],[0,3,5,6],[0,5,6,4]];
 p.prog=sd===1?progs[0]:progs[Math.floor(r()*progs.length)];
 return p;
}
function setup(){P=params(seed);beat=60/P.bpm;q=function(x){return Math.round(x/beat)*beat};q8=function(x){return Math.round(x/(beat/2))*(beat/2)}}
function note(deg,oct){var sc=P.scale,n=sc.length,o=Math.floor(deg/n),i=((deg%n)+n)%n;return P.root*Math.pow(2,(sc[i]+12*(o+(oct||0)))/12)}
function semis(s,oct){return P.root*Math.pow(2,(s+12*(oct||0))/12)}
// ---------- audio ----------
var ctx,noiseBuf,run=null,muted=false;
function initAudio(){
 if(ctx)return;
 var AC=window.AudioContext||window.webkitAudioContext;ctx=new AC();
 noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
}
function makeRun(){
 var R={};
 R.master=ctx.createGain();R.master.gain.value=muted?0:VOL;
 var comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.2;
 R.master.connect(comp);comp.connect(ctx.destination);R.comp=comp;
 R.bus=ctx.createGain();R.bus.gain.value=.8;R.bus.connect(R.master);
 // saturated 808 bus (adds harmonics so phones hear the bass)
 R.sat=ctx.createWaveShaper();var c=new Float32Array(1024);for(var i=0;i<1024;i++){var x=i/511.5-1;c[i]=Math.tanh(x*2.6)}R.sat.curve=c;
 R.satG=ctx.createGain();R.satG.gain.value=.6;R.sat.connect(R.satG);R.satG.connect(R.bus);
 // reverb
 R.rev=ctx.createConvolver();var L=ctx.sampleRate*2.6,ir=ctx.createBuffer(2,L,ctx.sampleRate);
 for(var ch=0;ch<2;ch++){var dd=ir.getChannelData(ch);for(i=0;i<L;i++)dd[i]=(Math.random()*2-1)*Math.pow(1-i/L,3.2)}
 R.rev.buffer=ir;R.revG=ctx.createGain();R.revG.gain.value=.5;R.rev.connect(R.revG);R.revG.connect(R.bus);
 // delay for plucks
 R.dl=ctx.createDelay(2);R.dl.delayTime.value=beat*.75;R.fb=ctx.createGain();R.fb.gain.value=.38;var dlf=ctx.createBiquadFilter();dlf.type='lowpass';dlf.frequency.value=2400;
 R.dl.connect(dlf);dlf.connect(R.fb);R.fb.connect(R.dl);dlf.connect(R.bus);
 R.nodes=[];return R;
}
function env(g,t,a,peak,dec,end){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+dec);}
function noise(R,t,dur){var s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.start(t,Math.random()*1.5);s.stop(t+dur+.05);return s}
function osc(type,f,t,dur){var o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);o.start(t);o.stop(t+dur+.05);return o}
var S={
 kick:function(R,t,v){var o=osc('sine',150,t,.5),g=ctx.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(48,t+.12);env(g,t,.002,v,.45);o.connect(g);g.connect(R.sat);
  var n=noise(R,t,.02),hp=ctx.createBiquadFilter(),ng=ctx.createGain();hp.type='highpass';hp.frequency.value=3000;env(ng,t,.001,v*.25,.02);n.connect(hp);hp.connect(ng);ng.connect(R.bus)},
 b808:function(R,t,f,dur,v,glideTo){var o=osc('sine',f,t,dur+.2),g=ctx.createGain();o.frequency.setValueAtTime(f*2.2,t);o.frequency.exponentialRampToValueAtTime(f,t+.06);
  if(glideTo){o.frequency.setValueAtTime(f,t+dur*.55);o.frequency.exponentialRampToValueAtTime(glideTo,t+dur*.95)}
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.004);g.gain.setValueAtTime(v*.8,t+dur*.6);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.15);o.connect(g);g.connect(R.sat)},
 snare:function(R,t,v){var n=noise(R,t,.25),bp=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.frequency.value=1900;bp.Q.value=.6;env(g,t,.001,v,.22);n.connect(bp);bp.connect(g);g.connect(R.bus);
  var sg=ctx.createGain();sg.gain.value=.35;g.connect(sg);sg.connect(R.rev);
  var o=osc('triangle',210,t,.1),og=ctx.createGain();o.frequency.exponentialRampToValueAtTime(150,t+.08);env(og,t,.001,v*.6,.09);o.connect(og);og.connect(R.bus)},
 clap:function(R,t,v){for(var i=0;i<3;i++){var tt=t+i*.011,n=noise(R,tt,.12),bp=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.frequency.value=1300;bp.Q.value=.9;env(g,tt,.001,v*(i==2?1:.6),i==2?.16:.03);n.connect(bp);bp.connect(g);g.connect(R.bus);if(i==2){var sg=ctx.createGain();sg.gain.value=.4;g.connect(sg);sg.connect(R.rev)}}},
 hat:function(R,t,v,open){var n=noise(R,t,open?.3:.06),hp=ctx.createBiquadFilter(),g=ctx.createGain();hp.type='highpass';hp.frequency.value=7200;env(g,t,.001,v,open?.28:.045);n.connect(hp);hp.connect(g);g.connect(R.bus)},
 crash:function(R,t,v){var n=noise(R,t,2.2),hp=ctx.createBiquadFilter(),g=ctx.createGain();hp.type='highpass';hp.frequency.value=3500;env(g,t,.002,v,2.1);n.connect(hp);hp.connect(g);g.connect(R.bus);var sg=ctx.createGain();sg.gain.value=.5;g.connect(sg);sg.connect(R.rev)},
 impact:function(R,t,v,big){ // whip-cut hit: sub boom + crack + tail
  var o=osc('sine',120,t,1.6),g=ctx.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(big?34:42,t+.35);env(g,t,.002,v,big?1.6:.9);o.connect(g);g.connect(R.sat);
  var n=noise(R,t,.4),bp=ctx.createBiquadFilter(),ng=ctx.createGain();bp.type='bandpass';bp.Q.value=1.2;bp.frequency.setValueAtTime(5200,t);bp.frequency.exponentialRampToValueAtTime(900,t+.18);env(ng,t,.0015,v*.9,.3);n.connect(bp);bp.connect(ng);ng.connect(R.bus);
  var sg=ctx.createGain();sg.gain.value=big?.9:.55;ng.connect(sg);sg.connect(R.rev);
  var tt=osc('triangle',95,t,.5),tg=ctx.createGain();tt.frequency.exponentialRampToValueAtTime(55,t+.3);env(tg,t,.002,v*.5,.4);tt.connect(tg);tg.connect(R.bus);tg.connect(R.rev)},
 swish:function(R,t,dur,v){var n=noise(R,t,dur),bp=ctx.createBiquadFilter(),g=ctx.createGain();bp.type='bandpass';bp.Q.value=3;bp.frequency.setValueAtTime(400,t);bp.frequency.exponentialRampToValueAtTime(6000,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+dur*.95);g.gain.linearRampToValueAtTime(0,t+dur);n.connect(bp);bp.connect(g);g.connect(R.bus)},
 riser:function(R,t,dur,v){S.swish(R,t,dur,v);var o=osc('sawtooth',note(0,1),t,dur),lp=ctx.createBiquadFilter(),g=ctx.createGain();o.frequency.exponentialRampToValueAtTime(note(0,3),t+dur);lp.type='lowpass';lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(5000,t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v*.3,t+dur*.97);g.gain.linearRampToValueAtTime(0,t+dur);o.connect(lp);lp.connect(g);g.connect(R.bus)},
 pad:function(R,t,dur,freqs,v,cut){var lp=ctx.createBiquadFilter(),g=ctx.createGain();lp.type='lowpass';lp.frequency.value=cut||900;lp.Q.value=.4;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(.6,dur*.3));g.gain.setValueAtTime(v,t+dur*.8);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.4);lp.connect(g);g.connect(R.bus);var sg=ctx.createGain();sg.gain.value=.6;g.connect(sg);sg.connect(R.rev);
  freqs.forEach(function(f){[-7,7].forEach(function(dt){var o=osc('sawtooth',f,t,dur+.5);o.detune.value=dt;o.connect(lp)})})},
 drone:function(R,t,dur,f,v){var o=osc('sine',f,t,dur+.5),o2=osc('triangle',f*2,t,dur+.5),g=ctx.createGain(),g2=ctx.createGain();g2.gain.value=.25;o2.connect(g2);g2.connect(g);o.connect(g);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(1.2,dur*.4));g.gain.setValueAtTime(v,t+dur*.7);g.gain.exponentialRampToValueAtTime(.0001,t+dur+.3);g.connect(R.sat)},
 pluck:function(R,t,f,v){var o=osc('square',f,t,.35),lp=ctx.createBiquadFilter(),g=ctx.createGain();lp.type='lowpass';lp.frequency.setValueAtTime(3800,t);lp.frequency.exponentialRampToValueAtTime(350,t+.2);env(g,t,.002,v,.3);o.connect(lp);lp.connect(g);g.connect(R.bus);var sg=ctx.createGain();sg.gain.value=.5;g.connect(sg);sg.connect(R.dl)},
 bell:function(R,t,f,v){var o=osc('sine',f,t,2.5),o2=osc('sine',f*2.76,t,1.2),g=ctx.createGain(),g2=ctx.createGain();env(g,t,.003,v,2.4);env(g2,t,.002,v*.3,.9);o.connect(g);o2.connect(g2);g2.connect(g);g.connect(R.bus);var sg=ctx.createGain();sg.gain.value=.8;g.connect(sg);sg.connect(R.rev)}
};
// sections: which layers play (nominal seconds)
function section(x){
 if(x<3)return 'intro';if(x<11)return 'A';if(x<13)return 'gap';if(x<18)return 'soft';if(x<22)return 'B';if(x<25)return 'build';
 if(x<34)return 'whip';if(x<40)return 'C';if(x<50)return 'pulse';if(x<55)return 'lift';return 'outro';}
function buildEvents(){
 var ev=[],r=rng(seed*31+7),st=beat/4,T=q(END),i;
 function add(t,f){ev.push({t:t,f:f})}
 var chordAt=function(bar){var dg=P.prog[bar%4];return [note(dg,2),note(dg+2,2),note(dg+4,2)]};
 // intro: low note + swelling drone
 add(0,function(R,t){S.drone(R,t,q(3)-.05,P.root/2*1.0001,.55);S.pad(R,t+.2,q(3)-.3,[note(0,1),note(4,1)],.05,500)});
 add(q(2.2),function(R,t){S.bell(R,t,note(4,3),.12);S.swish(R,t-.6,.6,.12)});
 // pads per bar for sections with harmony
 var bar=4*beat,nb=Math.ceil(T/bar);
 for(i=0;i<nb;i++){(function(b){var t=b*bar,sec=section(t+.01);
   if(sec==='A'||sec==='soft'||sec==='B'||sec==='C'||sec==='lift'){
    var e=Math.min(bar,(sec==='A'?q(11):sec==='soft'?q(18):sec==='B'?q(22):sec==='C'?q(40):q(55))-t);if(e<.1)return;
    add(t,function(R,tt){S.pad(R,tt,e-.05,chordAt(b),sec==='lift'?.06:sec==='soft'?.045:.035,sec==='lift'?2400:sec==='B'?600:1100)})}
   if(sec==='pulse'){add(t,function(R,tt){S.pad(R,tt,bar,[note(0,1),note(4,1)],.03,420)})}
 })(i)}
 // step sequencer
 var nsteps=Math.floor(T/st);
 for(i=0;i<nsteps;i++){(function(i){
  var t=i*st+(i%2?P.swing*st:0),sec=section(t+.001),s32=i%32;
  if(sec==='gap'||sec==='intro'||sec==='outro')return;
  if(sec==='pulse'){ if(i%4===0)add(t,function(R,tt){S.kick(R,tt,.55);S.b808(R,tt,P.root,beat*.7,.3)}); return;}
  var drums=sec!=='soft';
  var bs=P.bass[s32];
  if(bs&&sec!=='whip'&&sec!=='build'){var f=note(bs.d),nxt=bs.g?note(bs.d+(r()<.5?2:-3)):0,dur=st*bs.l*1.9;add(t,function(R,tt){S.b808(R,tt,f,dur,sec==='soft'?.45:.62,nxt)})}
  if(sec==='build'&&s32%8===0)add(t,function(R,tt){S.b808(R,tt,P.root,beat*1.8,.55)});
  if(drums&&P.kick[s32]&&sec!=='whip')add(t,function(R,tt){S.kick(R,tt,.85)});
  var h=P.hat[s32];
  if(h&&(sec!=='soft'||h===1)){
   if(h===3&&sec!=='soft'){for(var k=0;k<3;k++)(function(k){add(t+k*st/3,function(R,tt){S.hat(R,tt,.12)})})(k)}
   else add(t,function(R,tt){S.hat(R,tt,h===1?.16:.1,sec==='lift'&&s32%8===4)})}
  if(drums&&sec!=='whip'&&sec!=='build'&&P.snare[s32]){var sv=P.snare[s32];add(t,function(R,tt){if(sv>=1){S.snare(R,tt,.5);S.clap(R,tt,.35)}else S.snare(R,tt,.12)})}
  // pluck motif (the bright staccato line), A/B/C/lift sections
  if((sec==='A'||sec==='B'||sec==='C'||sec==='lift'||sec==='soft')&&i%2===0){var pn=P.pl[(i/2)%P.pl.length|0];if(pn>=0&&(sec!=='soft'||i%4===0)){var pf=note(pn,sec==='lift'?4:3);add(t,function(R,tt){S.pluck(R,tt,pf,sec==='soft'?.06:.09)})}}
 })(i)}
 // build: snare roll accelerating 22 -> 25, riser, stop half a beat before the first whip hit
 var b0=q(22),b1=q(25);
 for(var t=b0,stepv=beat;t<b1-beat*.5;t+=stepv){(function(tt,v){add(tt,function(R,x){S.snare(R,x,v)})})(t,.12+.35*(t-b0)/(b1-b0));if(t>b0+(b1-b0)*.5)stepv=beat/4;else if(t>b0+(b1-b0)*.25)stepv=beat/2}
 add(b0,function(R,t){S.riser(R,t,b1-b0-beat*.5,.25)});
 // hits on every scene cut that is marked
 SCENES.forEach(function(sc){if(!sc.hit)return;var t=q(sc.s);add(t,function(R,x){
   if(sc.hit===1){S.impact(R,x,.95,false);S.b808(R,x,P.root,beat*1.6,.5)}
   else if(sc.hit===2){S.impact(R,x,1.1,true);S.crash(R,x,.28)}
   else {S.crash(R,x,.22);S.kick(R,x,.9)}})});
 // whip section: 16th hats + off-beat snares between hits
 for(t=q(25);t<q(34)-.01;t+=beat/2){(function(tt){add(tt,function(R,x){S.hat(R,x,.12)})})(t)}
 // big entry of C and lift
 add(q(11)-beat,function(R,t){S.swish(R,t,beat,.1)});
 add(q(13),function(R,t){S.kick(R,t,.9);S.crash(R,t,.15)});
 add(q(40),function(R,t){S.bell(R,t,note(0,3),.1)});
 add(q(50)-beat*2,function(R,t){S.riser(R,t,beat*2,.2)});
 // outro: final low note, bell
 add(q(55),function(R,t){S.impact(R,t,.7,true);S.drone(R,t,q(END)-q(55)-.3,P.root/2,.5);S.bell(R,t+.02,note(0,3),.1);S.pad(R,t,q(END)-q(55)-.5,[note(0,1),note(2,1),note(4,1)],.04,700)});
 ev.sort(function(a,b){return a.t-b.t});return ev;
}
// ---------- scheduler ----------
var t0=0,evs=[],ei=0,timer=null,playing=false;
function schedule(){
 if(!run)return;var now=ctx.currentTime-t0;
 while(ei<evs.length&&evs[ei].t<now+.25){var e=evs[ei++];if(e.t>=now-.02){try{e.f(run,t0+Math.max(e.t,now))}catch(err){}}}
}
function stopRun(){if(!run)return;var R=run;run=null;try{R.master.gain.cancelScheduledValues(ctx.currentTime);R.master.gain.setTargetAtTime(0,ctx.currentTime,.03)}catch(e){}setTimeout(function(){try{R.master.disconnect();R.comp.disconnect()}catch(e){}},400)}
// ---------- visuals ----------
var stage=$('stage'),els=[],cues=[],cur=-1,curT=-1,doveEl=$('dove'),doveImg=doveEl.querySelector('img'),lineEl=$('line'),refEl=$('ref'),flash=$('flash');
function buildDOM(){
 SCENES.forEach(function(sc){var d=document.createElement('div');d.className='sc';if(sc.img){var im=new Image();im.decoding='async';im.alt='';im.src='img/'+sc.img+IMGV;d.appendChild(im);sc.el=im}stage.appendChild(d);els.push(d)});
}
function lerp(a,b,p){return a+(b-a)*p}
function frame(){
 if(!playing)return;
 schedule();
 var t=ctx.currentTime-t0;
 if(t>=q(END)){finish();return}
 // scene
 var idx=-1;for(var i=0;i<SCENES.length;i++){if(t>=q(SCENES[i].s)&&t<q(SCENES[i].e)){idx=i;break}}
 if(idx!==cur){if(cur>=0)els[cur].classList.remove('on');if(idx>=0){els[idx].classList.add('on');var sc=SCENES[idx];
   if(sc.hit){flash.style.transition='none';flash.style.opacity=sc.hit===2?.55:.3;requestAnimationFrame(function(){flash.style.transition='opacity .25s';flash.style.opacity=0})}
   if(sc.hit===2){stage.classList.remove('shake');void stage.offsetWidth;stage.classList.add('shake')}}
  cur=idx}
 if(idx>=0&&SCENES[idx].el){var s=SCENES[idx],a=q(s.s),b=q(s.e),p=Math.min(1,Math.max(0,(t-a)/(b-a)));p=p*p*(3-2*p)*.4+p*.6;
  var k=lerp(s.k[0],s.k[1],p),x=lerp(s.x[0],s.x[1],p),y=lerp(s.y[0],s.y[1],p),rot=s.rot?lerp(s.rot[0],s.rot[1],p):0;
  s.el.style.transform='translate('+x+'%,'+y+'%) scale('+(s.flip?-k:k)+','+k+') rotate('+rot+'deg)';
  if(s.dim)s.el.style.filter='brightness('+lerp(s.dim[0],s.dim[1],p)+')';}
 // dove crossing over the face (4.4 -> 7) and rising (52.5 -> 55)
 var da=q(4.4),db=q(7);
 if(t>=da&&t<db){var dp=(t-da)/(db-da);doveEl.style.opacity=Math.min(1,dp*4,(1-dp)*4);doveImg.style.transform='translate('+lerp(-60,200,dp)+'%,'+(Math.sin(dp*3.14)*-18)+'%) scale(.9)'}
 else doveEl.style.opacity=0;
 // text
 var ti=-1;for(i=0;i<cues.length;i++){if(t>=cues[i].a&&t<cues[i].b){ti=i;break}}
 if(ti!==curT){curT=ti;lineEl.className='';refEl.className='';void lineEl.offsetWidth;
  if(ti>=0){var c=cues[ti];lineEl.innerHTML=c.txt;refEl.innerHTML=c.ref||'';lineEl.className=(c.big?'big ':'')+'in';if(c.ref)refEl.className='in'}
  else{lineEl.style.opacity='';}}
 if(ti>=0&&t>cues[ti].b-.28&&!cues[ti].held&&lineEl.className.indexOf('out')<0){var nx=cues[ti+1];if(!(nx&&Math.abs(nx.a-cues[ti].b)<.01)){lineEl.className=(cues[ti].big?'big ':'')+'out';if(cues[ti].ref)refEl.className='out'}}
 window.__fearT=t;window.__fearText=ti>=0?lineEl.textContent:'';window.__fearScene=idx>=0?(SCENES[idx].img||'black'):'none';
 requestAnimationFrame(frame);
}
function start(){
 initAudio();if(ctx.state!=='running')ctx.resume();
 stopRun();setup();
 cues=TEXTS.map(function(x){return{a:q(x[0]),b:q(x[1]),txt:x[2],ref:x[3]||'',big:x[4]}});
 evs=buildEvents();ei=0;run=makeRun();
 var off=Math.max(0,Math.min(startAt,END-1));startAt=0;
 t0=ctx.currentTime+.12-off;while(ei<evs.length&&evs[ei].t<off-.02)ei++;
 cur=-1;curT=-1;els.forEach(function(e){e.classList.remove('on')});lineEl.className='';refEl.className='';
 $('ov').hidden=true;$('end').hidden=true;$('ctl').hidden=false;
 playing=true;if(timer)clearInterval(timer);timer=setInterval(schedule,50);
 requestAnimationFrame(frame);
}
function finish(){playing=false;clearInterval(timer);timer=null;
 setTimeout(function(){stopRun()},1500);
 els.forEach(function(e){e.classList.remove('on')});lineEl.className='';refEl.className='';
 $('seedv').textContent=seed;$('share').href=location.pathname+'?seed='+seed;
 $('end').hidden=false;$('ctl').hidden=true;window.__fearScene='end'}
function setSeed(s){seed=s;var u=new URL(location.href);u.searchParams.set('seed',s);u.searchParams.delete('at');history.replaceState(null,'',u)}
function remix(){setSeed(1+Math.floor(Math.random()*999998));start()}
$('go').onclick=start;$('replay').onclick=start;$('remix').onclick=remix;$('remix2').onclick=remix;
$('mute').onclick=function(){muted=!muted;this.textContent=muted?'Muted':'Sound on';this.setAttribute('aria-label',muted?'Unmute':'Mute');if(run)run.master.gain.setTargetAtTime(muted?0:VOL,ctx.currentTime,.02)};
document.addEventListener('keydown',function(e){if(e.key==='m'||e.key==='M')$('mute').click()});
// test hook: render the mix offline (used for verification only)
window.__fearOffline=function(s){if(s)seed=s;setup();var sr=22050,oc=new OfflineAudioContext(1,Math.ceil((q(END)+2)*sr),sr),saved=ctx;ctx=oc;
 if(!noiseBuf){noiseBuf=oc.createBuffer(1,sr*2,sr);var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1}
 var R=makeRun();buildEvents().forEach(function(e){e.f(R,e.t+.05)});ctx=saved;
 return oc.startRendering().then(function(b){var x=b.getChannelData(0),o=new Uint8Array(x.length*2);for(var i=0;i<x.length;i++){var v=Math.max(-1,Math.min(1,x[i]))*32767|0;o[2*i]=v&255;o[2*i+1]=(v>>8)&255}
  var str='';for(i=0;i<o.length;i+=32768)str+=String.fromCharCode.apply(null,o.subarray(i,i+32768));return btoa(str)})};
buildDOM();
// preload: enable start when images are in (or after 6 s regardless)
var imgs=stage.querySelectorAll('img'),left=imgs.length+1,go=$('go'),ld=$('load');
function one(){left--;ld.textContent=left>0?'Loading '+Math.round(100*(1-left/(imgs.length+1)))+'%':'';if(left<=0)ready()}
function ready(){go.disabled=false;ld.textContent=''}
go.disabled=true;
[].forEach.call(imgs,function(im){if(im.complete)one();else{im.onload=one;im.onerror=one}});
if(doveImg.complete)one();else{doveImg.onload=one;doveImg.onerror=one}
setTimeout(ready,6000);
})();
