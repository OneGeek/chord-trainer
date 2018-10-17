

                          
class KeyboardKey {
    constructor(index) {
        this.index = index;
        this.isPressed = false;
        this.inChord = false;
        this.midiOctave = Math.trunc(index / OCTAVE_SEMITONES);
        this.octave = this.midiOctave - 2;
        this.octaveIndex = index % OCTAVE_SEMITONES;
        this.name = NOTE_NAMES[this.octaveIndex];
    }

    get isWhite() {
        return this.name.indexOf('#') === -1;
    }

    get isBlack() {
        return !this.isWhite;
    }

    describe() {
        return this.index + '|' + this.octaveIndex + '|' + this.octave + '   ' + this.name + ' (' + ORDINALS[this.octave] + ' octave)';
    }
}

class MidiUtil  {

    constructor(onNoteStateChange) {
        this.midi = null;
        this.inputs = null;
        this.inputSelector = null;
        this.port = null;

        this.onNoteStateChange = onNoteStateChange;

        console.log('Requesting MIDI access...');
        navigator.requestMIDIAccess().then(midi => this.initMidi(midi));
    }

    initMidi(midi) {
        console.log('Got MIDI access', midi);

        this.midi = midi;

        for (var input of midi.inputs.values()) {
            this.attachMidiPort(input);
            break; // Just use first input for now
        }

        midi.onstatechange = e => this.onMidiStateChange(e);
    }

    detachMidiPort() {
        if (this.port !== null) {
            this.port.onmidimessage = null;
            this.port.onstatechange = null;
            this.port = null;
        }
    }

    attachMidiPort(port) {
        this.port = port;
        console.log('Using midi device: ' + port.name, port);

        port.onmidimessage = msg => this.onMidiMessage(msg);
    }

    onMidiStateChange(e) {
        console.log('MIDI State Changed:', e.port.name, e.port.manufacturer, e.port.state);

        // Just use most recently connected midi device for now
        if (e.port.type === 'input' && e.port.state === 'connected') {
            this.detachMidiPort();
            this.attachMidiPort(e.port);
        }
    }

    onMidiMessage(message) {
        var [command, note, velocity] = message.data;

        switch (command) {
            case MidiMessage.Clock:
                break;
            case MidiMessage.NoteOn:
                this.onNoteStateChange(note, true);
                break;
            case MidiMessage.NoteOff:
                this.onNoteStateChange(note, false);
                break;
        }
    }

};


class Keyboard {
    
    constructor() {

        var octaveOffset = 2;

        this.width = (OCTAVE_TOTAL - octaveOffset) * OCTAVE_WIDTH;
        this.height = KEYBOARD_HEIGHT;

        this.svg = d3.select('svg.keyboard')
            .attr('width', this.width)
            .attr('height', this.height)
            .style('width', this.width + 'px')
            .style('height', this.height + 'px');

        console.log(this.svg);

        this.g = this.svg .append('g')
                .attr('transform', 'translate(' + (-2 * OCTAVE_WIDTH) + ',0)');

        this.state = [];
        for (var i=0; i < OCTAVE_TOTAL * OCTAVE_SEMITONES; i++) {
            this.state[i] = new KeyboardKey(i + MIDI_C0_OFFSET);
        }

        this.keys = this.g.selectAll('rect')
            .data(this.state)
            .enter().append('rect')
                .attr('x', key => this.keyOffset(key))
                .attr('y', 0)
                .attr('class', key => key.isWhite ? 'key white' : 'key black')
                .attr('width', key => key.isWhite ? KEY_WIDTH_WHITE : KEY_WIDTH_BLACK)
                .attr('height', key => key.isWhite ? KEY_HEIGHT_WHITE : KEY_HEIGHT_BLACK)
            ;

        this.keys.filter(key => key.isBlack).raise()

        this.update();

        this.g.selectAll('text')
            .data(this.state)
            .enter().append('text')
                .filter(key => key.isWhite)
                .attr('x', key => this.keyOffset(key) + 6)
                .attr('y', KEYBOARD_HEIGHT - 5)
                .text(key => key.name + key.octave)
                ;
    }

    update() {
        this.keys
            .classed('pressed', key => key.isPressed)
            .classed('in-chord', key => key.inChord)
            ;
    }

    keyOffset(key) {
        var keyOffset = 0;

        var octaveOffset = key.octave * OCTAVE_WIDTH;

        var numberOfLowerWhiteKeysInOctave = 0;
        var firstNoteInOctave = key.index - (key.index % OCTAVE_SEMITONES);

        for (var i=firstNoteInOctave; i < key.index; i++) {
            var lowerKey = new KeyboardKey(i);
            if (lowerKey.isWhite) {
                numberOfLowerWhiteKeysInOctave++;
            }
        }                                        

        keyOffset = octaveOffset + (numberOfLowerWhiteKeysInOctave * KEY_WIDTH_WHITE);
        if (key.isBlack) {
            keyOffset -= KEY_WIDTH_BLACK / 2;
        }

        return keyOffset;
    }
}

class ScaleDegree {
    constructor(degree, accidental) {
        this.degree = degree;
        this.isFlat = accidental === 'flat';
        this.isSharp = accidental === 'sharp';
        if (this.isFlat || this.isSharp) {
            this.accidental = accidental;
        }else {
            this.accidental = 'natural';
        }

        this.accidentalOffset = {
            flat: -1,
            natural: 0,
            sharp: 1
        }[this.accidental];

    }
}

const MAJOR_CHORD_DEGREES_EX = [
    new ScaleDegree(1),
    new ScaleDegree(3),
    new ScaleDegree(5)
];
const MINOR_CHORD_DEGREES_EX = [
    new ScaleDegree(1),
    new ScaleDegree(3, 'flat'),
    new ScaleDegree(5)
];
const DIMINISHED_CHORD_DEGREES_EX = [
    new ScaleDegree(1),
    new ScaleDegree(3, 'flat'),
    new ScaleDegree(5, 'flat')
];

class Chord {
    constructor(degrees) {
        this.degrees = degrees;
    }

    notesForScaleAtDegree(scaleRootNote, scalePattern, chordRootDegree) {
        var chordNotes = [];

        /*
        var cumulativeOffset = 0;
        var cumulativeScalePattern = [];
        for (var i=0; i < scalePattern.length; i++) {
            cumulativeScalePattern.push(cumulativeOffset);
            cumulativeOffset += scalePattern[i];
        }
        */

        for (var i = 0; i < this.degrees.length; i++) {
            var degree = this.degrees[i];
            var scalePosition = degree.degree - 1 + chordRootDegree;
            console.log(degree.degree, scalePosition);
            var offset = 0;
            if (scalePosition !== 0) {
                offset = scalePattern.concat(scalePattern).slice(0, scalePosition).reduce((a,b) => a+b);
            }
            console.log(scaleRootNote, offset, degree.accidentalOffset);
            chordNotes.push(scaleRootNote + offset + degree.accidentalOffset);
        }

        return chordNotes;
    }

}


class Util {

    static constructScaleChords(rootNote, scalePattern) {

    }

}

class ChordTrainer {
    constructor() {
        this.keyboard = new Keyboard();
        this.midiUtil = new MidiUtil((note, isPressed) => this.onNoteStateChange(note, isPressed));

        this.chordToMatch = null;

    }

    onNoteStateChange(note, isPressed) {
        var key = this.keyboard.state[note - MIDI_C0_OFFSET];
        //console.log(key.describe(), isPressed ? 'On' : 'Off');
        key.isPressed = isPressed;

        this.checkForMatchingChord()

        this.keyboard.update();
    }

    checkForMatchingChord() {
        var keysPressed = this.keyboard.state.filter(key => key.isPressed);
        var keysPressedInChord = keysPressed.filter(key => key.inChord);
        var keysInChord = this.keyboard.state.filter(key => key.inChord);

        if (keysInChord.length === keysPressed.length && keysPressed.length === keysPressedInChord.length) {
            this.promptForChord();
        }
    }

    promptForChord(which) {
        var chord = new Chord(MAJOR_CHORD_DEGREES_EX);
        var octaveOffset = 60;

        if (typeof which === 'undefined') {
            which = Math.floor(Math.random() * 7);
        }else {
            which -= 1;
        }

        var rootDegreeIndex = Math.floor(Math.random() * 7);

        
        //var chordName = new KeyboardKey(rootNote).name + ' Major';
        //var chordNotes = this.chordNotes(rootNote + octaveOffset, MAJOR_SCALE_PATTERN, MAJOR_CHORD_DEGREES, degreeOffset);
        var chordNotes = chord.notesForScaleAtDegree(octaveOffset, MAJOR_SCALE_PATTERN, which);

        this.chordToMatch = chordNotes;
        console.log(chordNotes);

        for (var i=0; i < this.keyboard.state.length; i++)
        {
            var key = this.keyboard.state[i];
            key.inChord = chordNotes.includes(key.index);
        }

        var chordQuality = '?';

        var interval1 = chordNotes[1] - chordNotes[0];
        var interval2 = chordNotes[2] - chordNotes[1];
        var chordIntervals = [interval1, interval2];

        console.log(chordIntervals);

        function chordMatches(intervalPattern) {
            return JSON.stringify(chordIntervals) === JSON.stringify(intervalPattern);
        }

        if (chordMatches(MAJOR_CHORD_INTERVALS)) {
            chordQuality = 'maj';
        } else if (chordMatches(MINOR_CHORD_INTERVALS)) {
            chordQuality = 'min';
        } else if (chordMatches(DIMINISHED_CHORD_INTERVALS)) {
            chordQuality = 'dim';
        }



        document.querySelector('.chord-prompt').innerText = new KeyboardKey(chordNotes[0]).name + ' ' + chordQuality;
    }
}

function init() {
    console.log('init()');
    window.chordtrainer = new ChordTrainer();
    promptForChord();
}

function promptForChord(which) {
    window.chordtrainer.promptForChord(which);
    window.chordtrainer.keyboard.update();
}

