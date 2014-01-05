(function(window) {

	function AudioManager(context) {
		this.context = context || AudioManager.createContext();
		this.buffers = {};
		this.sources = {};
	}

	AudioManager.prototype = {
		load: function(url, options, callback) {
			if (typeof(options) === 'function') {
				callback = options;
				options = {};
			}
			options = options || {};

			var req = new XMLHttpRequest(),
				self = this;
			req.open('GET', url, true);
			req.responseType = 'arraybuffer';

			req.onload = function() {
				self.context.decodeAudioData(req.response, function(buffer) {
					self.buffers[options.name || url] = buffer;
					callback && callback(null, buffer);
				}, callback);
			};

			req.send(null);
		},

		destroySource: function(source, name) {
			source.disconnect();
			var index = this.sources[name].indexOf(source);
			if (index >= 0) {
				this.sources[name].splice(index, 1);
			}
		},

		play: function(name, options, callback) {
			var self = this;

			if (typeof(options) === 'function') {
				callback = options;
				options = {};
			}
			options = options || {};

			var buffer = this.buffers[name];
			if (!buffer) {
				this.load(name, function(err, buffer) {
					if (err) {
						callback && callback(err);
						return;
					}

					play(buffer);
				});
			} else {
				play(buffer);
			}

			function play(buffer) {
				var source;
				if (options.override && this.sources[name] && this.sources[name].length) {
					source = this.sources[name][0];
				} else {
					source = self.context.createBufferSource();
					source.buffer = buffer;
					source.connect(self.context.destination);
				}

				if (options.loop) {
					source.loop = true;
				}

				source.start(0);

				if (!options.override) {
					if (!self.sources[name]) {
						self.sources[name] = [];
					}

					self.sources[name].push(source);
				}

				if (!options.persistent) {
					source.onended = function() {
						self.destroySource(source, name);
					};
				}

				callback && callback(null, source);
			}
		},

		stop: function(sourceOrName, options) {
			options = options || {};

			if (sourceOrName.stop) {
				sourceOrName.stop(0);
			} else {
				var sources = this.sources[sourceOrName];
				if (!sources || !sources.length) {
					return;
				}

				sources[0].stop(0);
				if (options.all) {
					for (var i = 1; i < sources.length; i++) {
						sources[i].stop(0);
					}
				}
			}
		}
	};

	AudioManager.createContext = function() {
		if (window.AudioContext) {
			return new window.AudioContext();
		}
		if (window.webkitAudioContext) {
			return new window.webkitAudioContext();
		}

		throw new Error('Your browser doesn\'t support AudioContext');
	};

	window.AudioManager = AudioManager;

}(window));