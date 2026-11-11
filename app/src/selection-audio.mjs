// New PC b99f: selection callback 0x46772d, voice table 0x4c88fc.
// Touch character taps combine the native cursor move and Ready action.
// Slot/control widgets are touch-only navigation, so have no invented PC cue.
const selectionVoices=Object.freeze({doraemon:0,nobita:1,dorami:2,yellow:6,shizuka:3,suneo:4,gian:5});
export function selectionAudio(action){
 if(action?.type==='confirm')return [{kind:'sfx',clip:82}];
 if(action?.type==='cancel')return [{kind:'sfx',clip:74}];
 if(action?.type!=='character'||!Object.hasOwn(selectionVoices,action.character))return [];
 const out=[];
 if(action.previousCharacter!==action.character)out.push({kind:'sfx',clip:77});
 // Native table requests character 6, but both supplied voice archives lack
 // its bank0/59 entry. Keep yellow silent instead of borrowing another voice.
 if(selectionVoices[action.character]!==6)out.push({kind:'voice',character:selectionVoices[action.character],bank:0,clip:59});
 return out;
}
