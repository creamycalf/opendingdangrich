// wa.exe 0x474755..0x474821, 0x495d82. Two complete player cycles
// per date while the crazy clock runs; expiry and road clocks are daily.
export function advanceDayCycle(g){
  g.dayCycle++;
  if(g.dayCycle<(g.slowDays?2:1))return false;
  g.dayCycle=0;if(g.slowDays)g.slowDays--;g.round++;
  return true;
}
