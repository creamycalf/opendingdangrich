// v1.26 scan code row 4, consumed by 0x4044e9. The switch lasts for this session.
export function acceptHiddenCode(input) {
  return typeof input === 'string' && input.trim().toUpperCase() === 'GO2HIDDENCHAR';
}

export function selectableCharacters(characters, unlocked) {
  return unlocked ? characters : characters.filter(character => character.id !== 'yellow');
}
