import {musicForGame,commandAudio} from './audio-rules.mjs';
type Channel='music'|'sfx'|'voice';
type Settings={music:number;sfx:number;voice:number;language:'mandarin'|'cantonese'};
type Event={kind:string;clip:number;character?:number;bank?:number};
const KEY='dingdang.audio.v1';
export class GameAudio{
  settings:Settings={music:.45,sfx:.7,voice:.85,language:'mandarin'};
  private catalog:any;private context:AudioContext|null=null;private unlocked=false;
  private music:HTMLAudioElement|null=null;private track=-1;private gamePaused=false;private miniPaused=false;private background=false;private generation=0;private voiceGeneration=0;
  private sceneTrack:number|null=null;private lastGame:any;private lastActive=false;private sfxGeneration=0;private speechBatch=0;
  private history:{kind:string;clip:number;character?:number;bank?:number;status:string;url?:string}[]=[];
  private get blocked(){return this.gamePaused||this.miniPaused||this.background;}
  private buffers=new Map<string,Promise<AudioBuffer>>();private voices=new Set<{node:AudioBufferSourceNode;gain:GainNode;kind:Channel}>();
  errors:string[]=[];
  async init(){
    try{const s=JSON.parse(localStorage.getItem(KEY)??'null');if(s){for(const k of ['music','sfx','voice'] as const)if(typeof s[k]==='number'&&s[k]>=0&&s[k]<=1)this.settings[k]=s[k];if(['mandarin','cantonese'].includes(s.language))this.settings.language=s.language;}}catch{}
    const r=await fetch('assets/audio/catalog.json');if(!r.ok)throw Error('音频资源目录缺失');this.catalog=await r.json();
    document.addEventListener('pointerdown',()=>void this.unlock(),{capture:true});
    document.addEventListener('keydown',()=>void this.unlock(),{capture:true});
    const visibility=(hidden:boolean)=>{this.background=hidden;this.generation++;if(hidden){this.stopEffects();this.music?.pause();void this.context?.suspend();}else if(this.unlocked){void this.context?.resume().catch(()=>{});this.resumeMusic();}};
    document.addEventListener('visibilitychange',()=>visibility(document.hidden));
    window.addEventListener('dingdangPause',()=>visibility(true));window.addEventListener('dingdangResume',()=>visibility(false));
  }
  private async unlock(){
    try{if(!this.context||this.context.state==='closed')this.context=new AudioContext();}catch{this.errors.push('audio-context');return;}
    this.unlocked=true;if(this.context.state!=='running')await this.context.resume().catch(()=>{});this.resumeMusic();
  }
  private resumeMusic(){if(this.music&&!this.music.ended&&!this.blocked&&!document.hidden&&this.unlocked&&this.settings.music>0&&this.music.paused)void this.music.play().catch(()=>{});}
  set<K extends keyof Settings>(key:K,value:Settings[K]){
    this.settings[key]=value;try{localStorage.setItem(KEY,JSON.stringify(this.settings));}catch{}
    if(key==='language'){this.speechBatch++;this.voiceGeneration++;this.stopEffects('voice');}
    if(key==='voice'||key==='sfx'){if(!value){if(key==='voice'){this.voiceGeneration++;this.speechBatch++;}else this.sfxGeneration++;this.stopEffects(key);}else for(const v of this.voices)if(v.kind===key)v.gain.gain.value=Number(value);}
    if(this.music){this.music.volume=this.settings.music;if(!this.settings.music)this.music.pause();else this.resumeMusic();}
  }
  scene(track:number|null){this.sceneTrack=track;this.sync(this.lastGame,this.lastActive,this.gamePaused);}
  sync(game:any,active:boolean,paused=false){
    this.lastGame=game;this.lastActive=active;
    const wasBlocked=this.blocked,track=this.sceneTrack??musicForGame(game,active);this.gamePaused=paused;
    // A cold decode begun before pause must never start after a quick resume.
    if(this.blocked&&!wasBlocked)this.generation++;
    // Native 403f80 flags&2 arms the 485421 repeat timer. Defeat (6) and
    // minigame results (11) pass zero; victory (4) and background tracks repeat.
    if(track!==this.track){this.music?.pause();this.track=track;const meta=this.catalog?.music[track];this.music=meta?new Audio(meta.url):null;if(this.music){this.music.loop=track!==6&&track!==11;this.music.volume=this.settings.music;this.music.onerror=()=>this.errors.push('music:'+track);}}
    if(this.blocked||document.hidden){this.music?.pause();this.stopEffects();}else this.resumeMusic();
  }
  pause(paused:boolean){if(this.miniPaused===paused)return;this.miniPaused=paused;if(this.blocked){this.generation++;this.music?.pause();this.stopEffects();}else this.resumeMusic();}
  command(before:any,after:any,command:any,map?:any){
    const events=commandAudio(before,after,command,undefined,map),speech=events.filter(e=>e.kind==='voice');
    for(const e of events)if(e.kind!=='voice')void this.play(e);
    if(speech.length){const batch=++this.speechBatch,generation=this.generation;
      void(async()=>{for(const e of speech){if(batch!==this.speechBatch||generation!==this.generation)return;await this.play(e,true);}})();
    }
  }
  private stopEffects(kind?:Channel){for(const v of [...this.voices])if(!kind||v.kind===kind){v.node.stop();this.voices.delete(v);}}
  async play(e:Event,untilEnded=false){
    const entry={...e,status:'requested',url:undefined as string|undefined};this.history.push(entry);if(this.history.length>80)this.history.shift();
    const kind=e.kind as 'sfx'|'voice',ctx=this.context;if(!ctx||!this.unlocked||document.hidden||this.blocked||!this.settings[kind]){entry.status='blocked';return;}
    const meta=kind==='sfx'?this.catalog?.sfx[e.clip]:this.catalog?.voices[this.settings.language][[e.character,e.bank,e.clip].join('-')];if(!meta){entry.status='original-empty';return;}entry.url=meta.url;
    if(kind==='voice'){if(!untilEnded)this.speechBatch++;this.stopEffects('voice');this.voiceGeneration++;}const generation=this.generation,voiceGeneration=this.voiceGeneration,sfxGeneration=this.sfxGeneration;
    try{
      if(!this.buffers.has(meta.url)){const p=fetch(meta.url).then(r=>{if(!r.ok)throw Error(meta.url);return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).catch(e=>{this.buffers.delete(meta.url);throw e;});this.buffers.set(meta.url,p);if(this.buffers.size>96)this.buffers.delete(this.buffers.keys().next().value!);}
      const buffer=await this.buffers.get(meta.url)!;
      if(generation!==this.generation||(kind==='voice'&&voiceGeneration!==this.voiceGeneration)||(kind==='sfx'&&sfxGeneration!==this.sfxGeneration)||document.hidden||this.blocked||!this.settings[kind]){entry.status='cancelled';return;}
      if(kind==='voice')this.stopEffects('voice');else if(this.voices.size>=8)return;
      const node=ctx.createBufferSource(),gain=ctx.createGain();node.buffer=buffer;gain.gain.value=this.settings[kind];node.connect(gain).connect(ctx.destination);
      const playing={node,gain,kind};this.voices.add(playing);let ended:()=>void=()=>{};const finished=new Promise<void>(resolve=>ended=resolve);
      node.onended=()=>{this.voices.delete(playing);node.disconnect();gain.disconnect();ended();};node.start();entry.status='started';if(untilEnded)await finished;
    }catch{entry.status='error';this.errors.push(kind+':'+meta.url);}
  }
  diagnostics(){return {track:this.track,paused:this.blocked,playing:!!this.music&&!this.music.paused,musicLoop:this.music?.loop??false,musicEnded:this.music?.ended??false,unlocked:this.unlocked,context:this.context?.state,activeEffects:this.voices.size,errors:[...this.errors],settings:{...this.settings},events:this.history.map(e=>({...e}))};}
}
export const audio=new GameAudio();
