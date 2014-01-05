\version "2.18.0"
\language "english"

global = {
  \time 4/4
  \numericTimeSignature
  \set Score.tempoHideNote = ##t
  \tempo 4 = 144
}

square = \new Staff \with {
  midiInstrument = #"lead 1 (square)"
} {
  \clef treble \relative c' {
    \global
    \key gs \minor gs8 gs b gs d'8. cs16 ~ cs8 b |
  }
}

percussion = \new DrumStaff <<
  \new DrumVoice \drummode { \global \voiceOne \repeat unfold 8 hh8 }
  \new DrumVoice \drummode { \global \voiceTwo bd4 sn bd sn }
>>

\score {
  <<
    \square
    \percussion
  >>
  \layout {}
  \midi {}
}