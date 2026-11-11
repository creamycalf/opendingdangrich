import {PC_INPUTS, pcAvailableInputs, pcDefaultInputs} from './pc-controller-settings.mjs';
import './pc-controls.css';

const storageKey = 'dingdang.controls.v1';
function pads() {
  try { return Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => !!pad && pad.connected).slice(0, 4); }
  catch { return []; }
}
function assignments() {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (Array.isArray(ids) && ids.length === 4 && new Set(ids).size === 4 &&
        ids.every(id => Number.isInteger(id) && id >= 0 && id < 8)) return ids as number[];
  } catch { /* Absent or damaged settings use the PC defaults. */ }
  return pcDefaultInputs(pads().length);
}

export function mountPcControls(host: HTMLElement, close: () => void) {
  const panel = document.createElement('section');
  panel.className = 'pcControls';
  const heading = host.querySelector('h2');
  if (heading) {
    const art = new Image(); art.src = 'assets/pc-controls/414.png'; art.alt = '操控设定';
    art.style.cssText = 'max-width:145px;max-height:32px;object-fit:contain';
    heading.replaceChildren(art);
  }
  const note = document.createElement('p');
  note.textContent = '小游戏可接外置设备。各玩家也可直接点屏幕上的按钮。';
  const grid = document.createElement('div');
  grid.className = 'pcDeviceGrid';
  let chosen = assignments();
  function render() {
    grid.replaceChildren();
    const available = new Set([...pcAvailableInputs(pads().length), ...chosen]);
    chosen.forEach((id, slot) => {
      const row = document.createElement('label'), name = document.createElement('strong');
      name.textContent = 'P' + (slot + 1);
      const icon = document.createElement('img');
      icon.src = 'assets/pc-controls/' + (416 + id) + '.png'; icon.alt = '';
      const select = document.createElement('select');
      select.setAttribute('aria-label', name.textContent + ' 控制设备');
      for (const value of [...available].sort((a,b)=>a-b)) {
        select.add(new Option(PC_INPUTS[value], String(value), false, value === id));
      }
      select.onchange = () => {
        const value = Number(select.value), other = chosen.indexOf(value);
        if (other >= 0) chosen[other] = id;
        chosen[slot] = value;
        render();
        grid.querySelectorAll('select')[slot].focus();
      };
      row.append(name,icon,select); grid.append(row);
    });
  }
  const actions = document.createElement('footer');
  const reset = document.createElement('button'), cancel = document.createElement('button'), save = document.createElement('button');
  reset.textContent = '重设'; cancel.textContent = '取消'; save.textContent = '保存';
  reset.onclick = () => { chosen = pcDefaultInputs(pads().length); render(); };
  cancel.onclick = close;
  save.onclick = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(chosen)); close(); }
    catch { note.textContent = '未能保存，请检查存储空间后重试。'; }
  };
  actions.append(reset,cancel,save);
  panel.append(note,grid,actions);
  host.append(panel);
  render();
}

const keys: Record<string, [number, number]> = {
  ArrowLeft:[4,4], Delete:[4,4], ArrowRight:[4,8], PageDown:[4,8],
  KeyA:[5,4], KeyQ:[5,4], KeyD:[5,8], KeyE:[5,8],
  KeyJ:[6,4], KeyU:[6,4], KeyL:[6,8], KeyO:[6,8],
};
/** Keep touch controls independent of PC seat assignments. Capture quick taps
 * between ticks; only catch and obstacle defense repeat while held. */
export function bindMiniDevices(stage: HTMLElement, humans: boolean[], game: number, playing: () => boolean) {
  const ids = assignments();
  const down = new Map<string, [number, number]>();
  const queued = [0,0,0,0];
  function press(key:string, device:number, input:number) {
    const seat = ids.indexOf(device);
    if (!playing() || !humans[seat] || down.has(key)) return;
    down.set(key,[seat,input]); queued[seat] = input;
  }
  function keydown(e:KeyboardEvent) {
    const binding = keys[e.code];
    if (!binding || !playing() || !humans[ids.indexOf(binding[0])] || e.ctrlKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    if (!e.repeat) press(e.code,...binding);
  }
  function keyup(e:KeyboardEvent) { down.delete(e.code); }
  function mouse(e:PointerEvent) {
    if (e.pointerType !== 'mouse' || ![0,2].includes(e.button) || (e.target as Element).closest('button')) return;
    press('mouse'+e.button,7,e.button===0 ? 4 : 8);
  }
  function release(e:PointerEvent) { if(e.pointerType==='mouse') down.delete('mouse'+e.button); }
  function context(e:Event) { if (playing() && humans[ids.indexOf(7)]) e.preventDefault(); }
  function clear() { down.clear(); queued.fill(0); }
  window.addEventListener('keydown',keydown); window.addEventListener('keyup',keyup);
  window.addEventListener('blur',clear); window.addEventListener('pointerup',release);
  stage.addEventListener('pointerdown',mouse); stage.addEventListener('contextmenu',context);
  return {
    clear,
    sample() {
      const connected = pads();
      for(let device=0;device<4;device++){
        const pad=connected[device];
        for(const input of [4,8]){
          const left=input===4, key='pad'+device+'-'+input;
          const axis=pad?.axes[0] ?? 0;
          if(pad && (pad.buttons[left?14:15]?.pressed || pad.buttons[left?0:1]?.pressed || (left?axis < -.5:axis > .5))) press(key,device,input);
          else down.delete(key);
        }
      }
      const sampled = queued.slice();
      queued.fill(0);
      for(const [seat,input] of down.values()) if(game===0 || (game===4 && input===8)) sampled[seat]=input;
      return sampled;
    },
    dispose() {
      clear(); window.removeEventListener('keydown',keydown); window.removeEventListener('keyup',keyup);
      window.removeEventListener('blur',clear); window.removeEventListener('pointerup',release);
      stage.removeEventListener('pointerdown',mouse); stage.removeEventListener('contextmenu',context);
    },
  };
}
