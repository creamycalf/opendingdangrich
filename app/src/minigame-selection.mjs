// wa.exe 0x445a2d: rejection draw over eight IDs, clear only after all used.
export function selectMiniGame(g,draw){
  if(g.miniPlayed===255)g.miniPlayed=0;
  let id;do{id=draw(8);}while(g.miniPlayed&(1<<id));
  g.miniPlayed|=1<<id;return id;
}
