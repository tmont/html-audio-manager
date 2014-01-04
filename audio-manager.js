(function(window) {

	var AudioContext = window.AudioContext || window.webkitAudioContext;
	window.AudioManager = {
		createContext: function() {
			return new AudioContext();
		},

		load: function(url, options, callback) {
			if (typeof(options) === 'function') {
				callback = options;
				options = {};
			}

			var req = new XMLHttpRequest();
			req.open('GET', url, true);
			req.responseType = 'arraybuffer';

			var context = options.context || this.createContext();
			options.context = context;
			req.onload = function() {
				context.decodeAudioData(req.response, function(buffer) {
					callback(null, buffer, options);
				}, callback);
			};

			req.send(null);
		},

		play: function(options, callback) {
			if (typeof(options) === 'function') {
				callback = options;
				options = {};
			}

			if (options.buffer) {
				options.context = options.context || this.createContext();
				play(options.buffer);
			} else if (options.url) {
				this.load(options.url, options, function(err, buffer) {
					if (err) {
						callback && callback(err);
						return;
					}

					play(buffer);
				});
			} else {
				throw new Error('One of options.url or options.buffer must be set');
			}

			function play(buffer) {
				var source = options.context.createBufferSource();
				source.buffer = buffer;
				source.connect(options.context.destination);
				if (options.loop) {
					source.loop = true;
				}
				source.start(0);
				callback(null, { buffer: buffer, source: source }, options);
			}
		},

		stop: function(source) {
			source.stop(0);
		}
	};

}(window));