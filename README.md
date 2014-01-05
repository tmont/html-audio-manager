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
[Clicky](http://tmont.github.io/html-audio-manager/)

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

By default, `AudioManager` will bind to the `onended` event and disconnect
from the destination. You can keep the source around indefinitely by using
the `persistent` option. This would be useful for short sounds that you use
repeatedly, like a jumping sound effect in a platforming game.

```javascript
manager.play('http://example.com/getoffmy.wav', { persistent: true });
```

Using `persistent` should also be coupled with the `override` option,
which will reuse the sound instead of playing the same sound. This would
be necessary if the same sound should played multiple times simultaneously
(such as the sound of a zombie dying, because you could probably kill
more than one zombie at a time).

```javascript
manager.play('http://example.com/getoffmy.wav', { persistent: true, override: true });
```

The sources and buffers are exposed in `manager.buffers` and `manager.sources` if you
have the need to do something to them directly (like bind to events).
