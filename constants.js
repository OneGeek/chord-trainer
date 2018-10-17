
const MidiMessage = {
    NoteOn: 144,
    NoteOff: 128,
    Clock: 248
}

const MIDI_C0_OFFSET = 24;
const OCTAVE_SEMITONES = 12;
const NOTE_NAMES = [ 'C','C#','D','D#','E','F','F#','G','G#','A','A#','B' ];
const ORDINALS = [ 'First','Second','Third','Fourth','Fifth','Sixth','Seventh' ];

const SCALE_FACTOR = 3
const KEY_WIDTH_WHITE = 15 * SCALE_FACTOR;
const KEY_WIDTH_BLACK = 10 * SCALE_FACTOR;
const KEYBOARD_HEIGHT = 70 * SCALE_FACTOR;
const KEY_HEIGHT_WHITE = KEYBOARD_HEIGHT;
const KEY_HEIGHT_BLACK = Math.round((2/3) * KEY_HEIGHT_WHITE);
const OCTAVE_WIDTH = 7 * KEY_WIDTH_WHITE; // 7 white keys
const OCTAVE_TOTAL = 5;

const MINOR_THIRD = 3;
const MAJOR_THIRD = 4;
const PERFECT_FOURTH = 5;
const MAJOR_CHORD_INTERVALS = [MAJOR_THIRD, MINOR_THIRD];
const MINOR_CHORD_INTERVALS = [MINOR_THIRD, MAJOR_THIRD];
const DIMINISHED_CHORD_INTERVALS = [MINOR_THIRD, MINOR_THIRD];

const MAJOR_SCALE_PATTERN = [2,2,1,2,2,2,1]
const MAJOR_CHORD_DEGREES = [1,3,5]
