import {EFFECT_CONFLICTS} from './original-effect-tables.mjs';
// New PC SHA b99f70be…792eb1, query 0x43911b, tables 0x4c3bac/0x4c5410.
// tools/audit_item_common_v126.py executes all 7,744 pair/source/mode queries.
// Keep the older extraction intact as independent historical evidence.
export const V126_EFFECT_CONFLICTS=structuredClone(EFFECT_CONFLICTS);
V126_EFFECT_CONFLICTS.self[14][38]=2;
V126_EFFECT_CONFLICTS.self[37][14]=2;
V126_EFFECT_CONFLICTS.self[38][14]=2;
V126_EFFECT_CONFLICTS.attack[8][30]=1;
V126_EFFECT_CONFLICTS.attack[35][33]=1;
