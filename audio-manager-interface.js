(function(window, document, $) {

	var prefix = 'audio-manager-';

	function AudioManagerInterface($element, options) {
		if (!options || typeof(options) !== 'object') {
			options = {};
		}

		if (!options.manager) {
			throw new Error('An AudioManager must be passed to rach3');
		}

		var self = this;

		this.$element = $element;
		this.current = 0;
		this.currentVolume = 1;
		this.manager = options.manager;
		this.manager.on('timeupdate', function(time, duration) {
			self.updateTime(time, duration);
		});
		this.manager.on('loading', function(time, duration) {
			self.updateProgress(time, duration);
		});
		this.manager.on('finish', function() {
			if (self.files.length > 1) {
				self.next();
			} else {
				self.stop();
			}
		});
		var files = options.manager.files;
		this.files = Object.keys(files).map(function(name) {
			return files[name];
		});

		this.$container = null;
		this.controls = {};
		this.info = {};
		if (!options.noRender) {
			this.render();
		}
	}

	AudioManagerInterface.prototype = {
		render: function() {
			if (this.$container) {
				return;
			}

			this.$container = $('<div/>').addClass(prefix + 'container');
			var $controlContainer = $('<div/>').addClass(prefix + 'control-container'),
				$infoContainer = $('<div/>').addClass(prefix + 'info-container'),
				$progressContainer = $('<div/>').addClass(prefix + 'progress-container'),
				$progressWell = $('<div/>').addClass(prefix + 'progress-well').appendTo($progressContainer).click(seek),
				$progressBuffered = $('<div/>').addClass(prefix + 'progress-buffered').appendTo($progressWell).click(seek);

			function seek(e) {
				var x = e.clientX + $(document).scrollLeft(),
					realX = x - $progressWell.offset().left,
					ratio = realX / $progressWell.width(),
					timeToSeekTo = self.files[self.current].getDuration() * ratio;

				self.seek(timeToSeekTo);
			}

			this.controls.$buffered = $progressBuffered;

			this.controls.$play = $('<div/>')
				.addClass(prefix + 'play')
				.appendTo($controlContainer)
				.click(function() {
					var file = self.files[self.current];
					if (file.isPlaying()) {
						self.pause();
					} else {
						self.play();
					}
				});

			this.controls.$prev = $('<div/>')
				.addClass(prefix + 'prev')
				.appendTo($controlContainer)
				.click(function() { self.prev(); });
			this.controls.$next = $('<div/>')
				.addClass(prefix + 'next')
				.appendTo($controlContainer)
				.click(function() { self.next(); });

			this.controls.$volume = $('<div/>')
				.addClass(prefix + 'volume')
				.appendTo($controlContainer)
				.click(function() {
					$(this).toggleClass(prefix + 'active');
				});

			var $sliderContainer = $('<div/>').addClass(prefix + 'volume-control').appendTo(this.controls.$volume);

			$('<input/>')
				.attr({ type: 'range', value: 100, max: 100, min: 0 })
				.appendTo($sliderContainer)
				.on('input', function() {
					var max = parseInt(this.max),
						value = parseInt(this.value);

					self.setVolume(Math.pow(value / max, 1.5));
				});

			this.controls.$time = $('<div/>').addClass(prefix + 'time').appendTo($controlContainer);
			this.controls.$progress = $('<div/>').addClass(prefix + 'progress').appendTo($progressBuffered).click(seek);
			$progressContainer.appendTo($controlContainer);

			this.info.$track = $('<div/>').addClass(prefix + 'track').appendTo($infoContainer);
			this.info.$title = $('<div/>').addClass(prefix + 'title').appendTo($infoContainer);
			this.info.$year = $('<div/>').addClass(prefix + 'year').appendTo($infoContainer);
			this.info.$album = $('<div/>').addClass(prefix + 'album').appendTo($infoContainer);
			this.info.$artist = $('<div/>').addClass(prefix + 'artist').appendTo($infoContainer);

			var self = this;
			[ 'play', 'prev', 'next', 'volume' ].forEach(function(button) {
				self.controls['$' + button].append($('<span/>'));
			});

			this.$container
				.append($infoContainer, $controlContainer)
				.appendTo(this.$element);

			this.controls.$time.text('00:00');
			this.files[this.current].init();
			this.setInfo();
		},

		setInfo: function() {
			var file = this.files[this.current],
				self = this;

			file.getMetadata(function(err, metadata) {
				if (err) {
					return;
				}

				metadata.title && self.info.$title.text(metadata.title);
				metadata.year && self.info.$year.text(metadata.year);
				metadata.track && self.info.$track.text(metadata.track);
				metadata.artist && self.info.$artist.text(metadata.artist);
				metadata.album && self.info.$album.text(metadata.album);
			});
		},

		updateProgress: function(time, duration) {
			duration = duration || 1;
			var percent = (time / duration) * 100;
			this.controls.$buffered.width(percent + '%');
		},

		updateTime: function(time, duration) {
			duration = duration || 1;

			function pad(s) {
				return s < 10 ? '0' + s : s;
			}

			var percent = (time / duration) * 100,
				minutes = Math.floor(time / 60),
				seconds = Math.floor(time - (minutes * 60));

			this.controls.$progress.width(percent + '%');

			//since this can happen many times per second, let's micro-optimize it
			var $time = this.controls.$time,
				node = $time[0].firstChild,
				text = pad(minutes) + ':' + pad(seconds);
			if (node.nodeValue === text) {
				return;
			}

			$time[0].replaceChild(document.createTextNode(text), node);
		},

		seek: function(time) {
			var file = this.files[this.current];
			file.seek(time || 0);
		},

		play: function() {
			var file = this.files[this.current];
			this.setInfo();
			this.manager.play(file.name);
			this.setVolume(this.currentVolume);
			this.controls.$play.toggleClass(prefix + 'play ' + prefix + 'pause');
			if (file.isBuffered()) {
				//no loading events are sent if the audio is completely buffered
				this.controls.$buffered.width('100%');
			}
		},

		pause: function() {
			var file = this.files[this.current];
			this.manager.pause(file.name);
			this.controls.$play.toggleClass(prefix + 'play ' + prefix + 'pause');
		},

		stop: function() {
			var file = this.files[this.current];
			this.updateProgress(0);
			this.manager.stop(file.name);
			if (this.controls.$play.hasClass(prefix + 'pause')) {
				this.controls.$play.toggleClass(prefix + 'pause ' + prefix + 'play');
			}
		},

		prev: function() {
			this.stop();
			this.current = (this.current - 1 + this.files.length) % this.files.length;
			this.play();
		},

		next: function() {
			this.stop();
			this.current = (this.current + 1) % this.files.length;
			this.play();
		},

		setVolume: function(value) {
			var file = this.files[this.current];
			this.currentVolume = value;
			this.manager.setVolume(value, file.name);
		},

		destroy: function() {
			this.$container.remove();
			this.$container = null;
			this.controls = {};
			this.info = {};
		}
	};

	$.fn.rach3 =  function(options) {
		options = options || {};

		return this.each(function() {
			var $element = $(this),
				ui = $element.data(prefix),
				method = typeof(options) === 'string' ? options : '';

			if (!ui) {
				$element.data(prefix, (ui = new AudioManagerInterface($element, options)));
			}

			if (typeof(ui[method]) === 'function') {
				ui[method]();
			}
		});
	};

}(window, document, jQuery));