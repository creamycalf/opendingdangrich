import * as E from './engine.mjs';
import {chooseAiAction} from './ai-action.mjs';

// Transaction boundary: reject a command without leaving a half-mutated game.
// Inputs, AI and replay share this path. No UI, clock, filesystem or platform API.
export function executeCommand(map,state,command){
  if(!command||typeof command.type!=='string')throw Error('无效游戏命令');
  const next=JSON.parse(JSON.stringify(state));
  if(next.map!==map.id)throw Error('命令地图与对局不匹配');
  let value,walk,action;
  switch(command.type){
    case 'aiAction':
      if(command.animated!==undefined&&typeof command.animated!=='boolean')throw Error('掷骰动画参数无效');
      if(E.beginTurn(next)){
        action=chooseAiAction(map,next);
        if(action.type==='roll'){action={...action,animated:command.animated};value=E.roll(next,map,command.animated);next.dicePending=true;}
        else E.useItem(map,next,action.item,action.target);
      }break;
    case 'beginTurn':value=E.beginTurn(next);break;
    case 'roll':
      if(command.animated!==undefined&&typeof command.animated!=='boolean')throw Error('掷骰动画参数无效');
      if(E.beginTurn(next)){value=E.roll(next,map,command.animated);next.dicePending=true;}
      break;
    case 'dicePresented':
      if(next.phase!=='moving'||!next.dicePending)throw Error('没有待展示的骰子');
      next.dicePending=false;delete next.rollPlan;if(next.remaining===0)next.phase='end';break;
    case 'step':
    case 'aiStep':
      if(next.dicePending)throw Error('掷骰展示尚未结束');
      value=command.type==='aiStep'?E.aiDirection(map,next):command.to;
      walk=E.step(map,next,value);break;
    case 'noExit':
      if(next.phase!=='moving'||next.dicePending||E.choices(map,next).length)throw Error('仍有可行路线');
      next.remaining=0;next.phase='landed';break;
    case 'landing':E.landing(map,next);break;
    case 'advance':E.advance(map,next);break;
    case 'answer':E.answer(map,next,command.action,command.value);break;
    case 'aiAnswer':{
      const [action,data]=E.aiAnswer(map,next);E.answer(map,next,action,data);break;
    }
    case 'miniTick':E.miniTick(next,command.inputs);break;
    case 'nextTurn':E.nextTurn(map,next);break;
    case 'useItem':E.useItem(map,next,command.item,command.target);break;
    default:throw Error('未知游戏命令：'+command.type);
  }
  return {state:next,value,walk,...(action?{action}:{})};
}

export function replayCommands(map,record){
  if(record?.format!=='dingdang-replay-v1'||!Array.isArray(record.commands))throw Error('回放格式无效');
  if(record.initial?.ruleset!==E.RULESET)throw Error('回放规则版本不兼容');
  let state=E.restore(map,JSON.stringify(record.initial));
  for(let i=0;i<record.commands.length;i++){
    try{state=executeCommand(map,state,record.commands[i]).state;}
    catch(error){throw Error(`回放第 ${i+1} 条命令失败：${error.message}`);}
  }
  return state;
}
