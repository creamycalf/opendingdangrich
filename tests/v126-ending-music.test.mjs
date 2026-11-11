import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {musicForGame} from '../app/src/audio-rules.mjs';
const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/v126-ending-music.json',import.meta.url))),tracks=Object.fromEntries(oracle.rows.map(r=>[r.scene,r.track]));
const game=()=>({phase:'gameover',players:[{control:'human'},{control:'ai'},{control:'human'},{control:'ai'}],winners:[0],startDate:'2000-04-03',round:1});
test('new PC selects victory/defeat by first winner, including ties and empty outcome',()=>{
 const g=game();assert.equal(musicForGame(g),tracks.humanCertificate);
 for(const winners of [[],[1],[3,1],[2,1]]){g.winners=winners;assert.equal(musicForGame(g),tracks.noHumanWinner);}
 g.winners=[3,0];assert.equal(musicForGame(g),tracks.humanCertificate);
 g.players[0].character='yellow';assert.equal(musicForGame(g),tracks.humanCertificate);
});
test('new PC result theme ends on collect/new match/title instead of leaking across scenes',()=>{
 const g=game();g.phase='prompt';g.pending={kind:'minigame',session:{stage:'playing'}};assert.equal(musicForGame(g),5);
 g.pending.session.stage='result';assert.equal(musicForGame(g),tracks.minigameResult);
 g.pending=null;g.phase='ready';assert.equal(musicForGame(g),2);
 g.phase='gameover';assert.equal(musicForGame(g),4);assert.equal(musicForGame(g,false),tracks.title);
 g.phase='ready';assert.equal(musicForGame(g),2);
});
test('monthly begins with original track 9; the result view owns the later track 10 transition',()=>{
 const g=game();g.phase='prompt';g.pending={kind:'monthly',converter:-1};
 assert.equal(musicForGame(g),9);
 for(let converter=0;converter<4;converter++){g.pending.converter=converter;assert.equal(musicForGame(g),9);}
 g.pending=null;g.phase='ready';assert.equal(musicForGame(g),2);
});
