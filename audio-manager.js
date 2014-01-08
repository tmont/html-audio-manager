(function(window) {

	function createContext() {
		if (window.AudioContext) {
			return new window.AudioContext();
		}
		if (window.webkitAudioContext) {
			return new window.webkitAudioContext();
		}

		throw new Error('Your browser doesn\'t support AudioContext');
	}

	function AudioFile(path, options) {
		options = options || {};
		this.path = path;
		this.name = options.name || path;
		this.buffer = null;
		this.context = options.context || createContext();
		this.source = null;
		this.offset = 0;
		this.startedAt = 0;
		this.events = {
			play: [],
			stop: [],
			load: []
		};
	}

	AudioFile.prototype = {
		load: function(callback) {
			if (this.buffer) {
				//already loaded
				callback(null, this);
				return;
			}

			var req = new XMLHttpRequest(),
				self = this;
			req.open('GET', this.path, true);
			req.responseType = 'arraybuffer';

			req.onload = function() {
				self.context.decodeAudioData(req.response, function(buffer) {
					self.buffer = buffer;
					self.emit('load', buffer);
					callback && callback(null, self);
				}, callback);
			};

			req.send(null);
		},

		destroy: function() {
			if (!this.source) {
				return;
			}

			this.source.disconnect();
			this.source = null;
		},

		play: function(options) {
			options = options || {};
			var self = this;
			if (!this.buffer) {
				this.load(function(err) {
					if (err) {
						throw err;
					}

					play();
				});
			} else {
				play();
			}

			function play() {
				self.destroy();
				self.source = self.context.createBufferSource();
				self.source.buffer = self.buffer;
				self.source.connect(self.context.destination);

				self.source.loop = !!options.loop;
				var listeners = [];

				if (options.onended) {
					listeners.push(options.onended);
				}

				self.source.onended = function() {
					for (var i = 0; i < listeners.length; i++) {
						listeners[i].apply(null, arguments);
					}
				};

				self.source.start(0, self.offset);
				self.startedAt = Date.now();
				self.looping = self.source.loop;
				self.emit('play');
			}
		},

		pause: function() {
			if (this.source) {
				this.source.stop(0);
				this.offset += (Date.now() - this.startedAt) / 1000;

				//handle looping offsets
				while (this.offset >= this.buffer.duration) {
					this.offset -= this.buffer.duration;
				}

				this.destroy();
			}
		},

		stop: function() {
			if (this.source) {
				this.source.stop(0);
				this.destroy();
				this.offset = 0;
				this.emit('stop');
			}
		},

		on: function(event, listener) {
			if (!this.events[event]) {
				return;
			}

			this.events[event].push(listener);
		},

		emit: function(event, args) {
			var listeners = this.events[event];
			if (!listeners) {
				return;
			}
			for (var i = 0; i < listeners.length; i++) {
				listeners[i].apply(this, args);
			}
		}
	};

	function AudioFileManager(files, options) {
		options = options || {};
		this.maxRequests = options.maxRequests || 5;
		this.files = {};
		if (Array.isArray(files)) {
			for (var i = 0; i < files.length; i++) {
				this.files[files[i].name] = files[i];
			}
		} else {
			this.files = files;
		}
	}

	AudioFileManager.prototype = {
		loadAll: function(callback) {
			var active = 0,
				maxRequests = this.maxRequests,
				complete = 0,
				responseSent = false,
				keys = Object.keys(this.files),
				expected = keys.length;

			function loadFile(file, next) {
				if (active > maxRequests) {
					window.setTimeout(function() {
						loadFile(file, next);
					}, 50);
				} else {
					active++;
					file.load(function(err) {
						active--;
						complete++;
						next(err);
					});
				}
			}

			for (var i = 0; i < keys.length; i++) {
				loadFile(this.files[keys[i]], function(err) {
					if (responseSent) {
						return;
					}

					if (err) {
						responseSent = true;
						callback(err);
						return;
					}

					if (complete === expected) {
						responseSent = true;
						callback();
					}
				});
			}
		},

		play: function(name, options) {
			var file = this.files[name];
			if (!file) {
				throw new Error('Unknown file ' + name);
			}

			file.play(options);
		},

		stop: function(name) {
			var file = this.files[name];
			if (!file) {
				throw new Error('Unknown file ' + name);
			}

			file.stop();
		},

		stopAll: function() {
			for (var key in this.files) {
				this.files[key].stop();
			}
		},

		pause: function(name) {
			var file = this.files[name];
			if (!file) {
				throw new Error('Unknown file ' + name);
			}

			file.pause();
		},

		pauseAll: function() {
			for (var key in this.files) {
				this.files[key].pause();
			}
		}
	};

	window.AudioFile = AudioFile;
	window.AudioFileManager = AudioFileManager;

}(window));