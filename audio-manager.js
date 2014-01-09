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
		this.raw = null;
		this.buffer = null;
		this.context = options.context || createContext();
		this.source = null;
		this.offset = 0;
		this.startedAt = 0;
		this.playing = false;
		this.playingId = null;
		this.metadata = null;
		this.events = {
			play: [],
			stop: [],
			load: [],
			playing: []
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
				self.raw = req.response;
				self.context.decodeAudioData(self.raw, function(buffer) {
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
			this.playing = false;
			window.clearInterval(this.playingId);
			this.playingId = null;
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
				if (options.onended) {
					self.source.addEventListener('ended', options.onended);
				}

				self.source.start(0, self.offset);
				self.playing = true;
				self.startedAt = Date.now();
				self.emit('play');
				self.playingId = window.setInterval(function() {
					var currentTime = self.offset + ((Date.now() - self.startedAt) / 1000);

					//handle looping offsets
					while (currentTime >= self.buffer.duration) {
						currentTime -= self.buffer.duration;
					}
					self.emit('playing', [ currentTime, self.buffer.duration ]);
				}, 500);
			}
		},

		pause: function() {
			if (this.source) {
				this.source.stop(0);
				this.playing = false;
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
				this.startedAt = 0;
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
		this.events = {
			load: [],
			playing: []
		};

		var self = this;
		function listenToPlaying(file) {
			file.on('playing', function() {
				self.emit('playing', arguments);
			});
		}

		if (Array.isArray(files)) {
			for (var i = 0; i < files.length; i++) {
				this.files[files[i].name] = files[i];
				listenToPlaying(files[i]);
			}
		} else {
			for (var key in files) {
				files[key].name = key;
				this.files[key] = files[key];
				listenToPlaying(files[key]);
			}
		}
	}

	AudioFileManager.prototype = {
		loadAll: function(callback) {
			var active = 0,
				maxRequests = this.maxRequests,
				complete = 0,
				self = this,
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
						if (!err) {
							self.emit('load', file);
						}
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

	window.AudioFile = AudioFile;
	window.AudioFileManager = AudioFileManager;

}(window));