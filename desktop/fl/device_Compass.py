# name=Compass
# url=https://github.com/apollossandbox/tamed-player
# supportedDevices=Tamed Link
"""
Compass link for FL Studio.

Compass's Audio Doctor sends a short MIDI message through a virtual MIDI
port (for example a loopMIDI port called "Tamed Link"). This script reads it
and sets the project tempo, rewinds to bar 1 and opens the playlist, so the WAV
you drag in from Compass lands on the grid.

Messages (SysEx, manufacturer 0x7D, then "TP"):
  F0 7D 54 50 01 b0 b1 b2 b3 F7   set tempo, value = BPM x 1000 in four 7-bit bytes
  F0 7D 54 50 02 F7               ping, answered with F0 7D 54 50 03 F7 when an output port is linked
  F0 7D 54 50 05 F7               rewind to bar 1 and show the playlist
"""
import midi
import general
import transport
import ui
import device

HEAD = (0xF0, 0x7D, 0x54, 0x50)


def OnInit():
    print("Compass link is ready")


def _hint(text):
    try:
        ui.setHintMsg(text)
    except Exception:
        pass


def OnSysEx(event):
    data = event.sysex
    if not data or len(data) < 6 or tuple(data[:4]) != HEAD:
        return
    event.handled = True
    cmd = data[4]
    body = data[5:-1]
    if cmd == 0x01 and len(body) >= 4:
        milli = (body[0] << 21) | (body[1] << 14) | (body[2] << 7) | body[3]
        bpm = milli / 1000.0
        if 10.0 <= bpm <= 522.0:
            general.processRECEvent(midi.REC_Tempo, milli, midi.REC_Control | midi.REC_UpdateControl)
            _hint("Compass: tempo set to %g BPM" % bpm)
    elif cmd == 0x02:
        try:
            device.midiOutSysex(bytes(HEAD + (0x03, 0xF7)))
        except Exception:
            pass
        _hint("Compass is connected")
    elif cmd == 0x05:
        try:
            if transport.isPlaying():
                transport.stop()
            transport.setSongPos(0)
            ui.showWindow(midi.widPlaylist)
            ui.setFocused(midi.widPlaylist)
        except Exception:
            pass
