(function(window) {

	function AudioFile(path, options) {
		options = options || {};
		this.path = path;
		this.name = options.name || path;
		this.offset = 0;
		this.metadata = null;
		this.playing = false;
		this.audio = null;

		this.defaultVolume = options.defaultVolume || 1;
		this.currentVolume = this.defaultVolume;

		this.events = {
			play: [],
			stop: [],
			timeupdate: [],
			loading: [],
			finish: []
		};

		var self = this;
		this.onFinished = function() {
			self.audio.removeEventListener('ended', self.onFinished);
			self.emit('finish');
		};
	}

	AudioFile.prototype = {
		init: function() {
			if (this.audio) {
				return;
			}

			var self = this;

			this.audio = new Audio(this.path);
			this.audio.addEventListener('timeupdate', function() {
				self.emit('timeupdate', [ self.getCurrentTime(), self.getDuration() ]);
			});
			this.audio.addEventListener('playing', function() {
				self.playing = true;
			});
			this.audio.addEventListener('ended', function() {
				self.playing = false;
			});
			this.audio.addEventListener('progress', function(e) {
				self.emit('loading', [ self.getAmountBuffered(), self.getDuration() ]);
			});
		},

		getMetadata: function(callback) {
			if (this.metadata) {
				callback(null, this.metadata);
				return;
			}

			var self = this;
			var xhr = new XMLHttpRequest();
			xhr.open('GET', this.path, true);
			xhr.responseType = 'arraybuffer';
			xhr.setRequestHeader('Range', 'bytes=0-300');
			xhr.addEventListener('readystatechange', function(e) {
				if (xhr.readyState === 4) {
					if (xhr.status >= 200 && xhr.status < 300) {
						var type = /\.ogg$/.test(self.path) ? 'ogg' : 'id3v2';
						self.metadata = window.AudioMetadata[type](xhr.response);
						callback(null, self.metadata);
					} else {
						callback(xhr);
					}
				}
			});

			xhr.send(null);
		},

		getCurrentTime: function() {
			if (!this.audio) {
				return 0;
			}

			return this.audio.currentTime;
		},

		getDuration: function() {
			if (!this.audio) {
				return 0;
			}

			return this.audio.duration;
		},

		isPlaying: function() {
			return this.playing;
		},

		getAmountBuffered: function() {
			if (!this.audio) {
				return 0;
			}

			var ranges = this.audio.buffered;
			var total = 0;
			for (var i = 0; i < ranges.length; i++) {
				total += (ranges.end(i) - ranges.start(i));
			}

			return total;
		},

		isBuffered: function() {
			if (!this.audio) {
				return false;
			}

			return this.getAmountBuffered() >= this.getDuration();
		},

		play: function(options) {
			options = options || {};
			this.init();
			this.setVolume(this.currentVolume);
			this.audio.addEventListener('ended', this.onFinished);
			this.audio.loop = !!options.loop;
			this.audio.play();
			this.emit('play');
		},

		pause: function() {
			if (!this.audio) {
				return;
			}

			this.audio.removeEventListener('ended', this.onFinished, false);
			this.audio.pause();
			this.playing = false;
		},

		seek: function(time) {
			if (!this.audio) {
				return;
			}

			if (this.audio.fastSeek) {
				this.audio.fastSeek(time);
			} else {
				this.audio.currentTime = time;
			}
		},

		stop: function() {
			if (!this.audio) {
				return;
			}

			this.pause();
			this.seek(0);
			this.emit('stop');
		},

		setVolume: function(value) {
			if (!this.audio) {
				return;
			}

			value = Math.max(0, Math.min(value, 1));
			this.audio.volume = value;
			this.currentVolume = value;
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
			timeupdate: [],
			finish: []
		};

		var self = this;
		function listen(file) {
			file.on('timeupdate', function(time, duration) {
				self.emit('timeupdate', [ time, duration, file ]);
			});
			file.on('finish', function() {
				self.emit('finish', [ file ]);
			});
		}

		if (Array.isArray(files)) {
			for (var i = 0; i < files.length; i++) {
				this.files[files[i].name] = files[i];
				listen(files[i]);
			}
		} else {
			for (var key in files) {
				files[key].name = key;
				this.files[key] = files[key];
				listen(files[key]);
			}
		}
	}

	AudioFileManager.prototype = {
		play: function(name, options) {
			var file = this.files[name];
			if (!file) {
				throw new Error('Unknown file ' + name);
			}

			file.play(options);
		},

		stop: function(name) {
			if (!name) {
				for (var key in this.files) {
					this.files[key].stop();
				}
				return;
			}

			this.files[name] && this.files[name].stop();
		},

		pause: function(name) {
			if (!name) {
				for (var key in this.files) {
					this.files[key].pause();
				}
				return;
			}

			this.files[name] && this.files[name].pause();
		},

		setVolume: function(value, name) {
			if (!name) {
				for (var key in this.files) {
					this.files[key].setVolume(value);
				}
				return;
			}

			this.files[name] && this.files[name].setVolume(value);
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