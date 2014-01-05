# AudioManager
`AudioManager` is a lightweight object for playing sounds
using the [Web Audio API](http://www.w3.org/TR/webaudio/).

The `<audio>` element, while marginally useful, is complete
and utter garbage for doing simple things like, you know,
looping a sound. The Web Audio API actually does things like
that, including a myriad of other things that aren't covered
by this library.

`AudioManager` is a simple abstraction for playing sounds. The
web audio API is kind of cumbersome, and this fixes that.
A little bit.

## Example

## Usage
Play a sound:

```javascript
var manager = new AudioManager();

manager.play('http://example.com/getoffmy.wav');

//or

manager.play('http://example.com/keepitoffmy.wav', function(err, source) {
  //source is an AudioBufferSourceNode
});
```

Stop playing a sound:

```javascript
manager.stop('http://example.com/getoffmy.wav');
```

Loop a sound:

```javascript
manager.play('http://example.com/getoffmy.wav', { loop: true });
```

Load a sound but don't play it yet (`play()` implicitly calls `load()`
if needed):
```javascript
manager.load('http://example.com/getoffmy.wav', function(err, buffer) {
  //buffer is an AudioBuffer
});

