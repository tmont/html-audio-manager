(function(window, document, $) {

	var prefix = 'rach3-';

	function AudioManagerInterface($element, options) {
		if (!options || typeof(options) !== 'object') {
			options = {};
		}

		if (!options.manager) {
			throw new Error('options.manager must be set to an instance of rach3.AudioManager');
		}

		var self = this;

		this.$element = $element;
		this.current = 0;
		this.currentVolume = 1;
		this.manager = options.manager;
		this.showPlaylist = 'showPlaylist' in options ? !!options.showPlaylist : true;
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
			var btn = ' ' + prefix + 'btn',
				control = ' ' + prefix + 'control';
			var $controlContainer = $('<div/>').addClass(prefix + 'control-container'),
				$infoContainer = $('<div/>').addClass(prefix + 'info-container'),
				$progressContainer = $('<div/>').addClass(prefix + 'progress-container' + control),
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
				.addClass(prefix + 'play' + btn + control)
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
				.addClass(prefix + 'prev' + btn + control)
				.appendTo($controlContainer)
				.click(function() { self.prev(); });
			this.controls.$next = $('<div/>')
				.addClass(prefix + 'next' + btn + control)
				.appendTo($controlContainer)
				.click(function() { self.next(); });

			$progressContainer.appendTo($controlContainer);
			var $timeContainer = $('<div/>').addClass(prefix + 'time' + control).appendTo($controlContainer);
			this.controls.$elapsed = $('<span/>').addClass(prefix + 'time-elapsed').appendTo($timeContainer).text('');
			this.controls.$duration = $('<span/>').addClass(prefix + 'time-duration').appendTo($timeContainer).text('');

			this.controls.$options = $('<div/>')
				.addClass(prefix + 'options' + btn + control)
				.append($('<i/>').addClass(prefix + 'spoke1'))
				.append($('<i/>').addClass(prefix + 'spoke2'))
				.appendTo($controlContainer)
				.click(function() {
					self.$container.toggleClass(prefix + 'options-open');
					$(this).toggleClass(prefix + 'active');
				});

			$('<div/>')
				.addClass(prefix + 'options-container')
				.appendTo(this.controls.$options);

			this.controls.$volume = $('<div/>')
				.addClass(prefix + 'volume' + btn + control)
				.appendTo($controlContainer)
				.click(function() {
					self.$container.toggleClass(prefix + 'volume-open');
					$(this).toggleClass(prefix + 'active');
				});

			var $sliderContainer = $('<div/>')
				.addClass(prefix + 'volume-control' + control)
				.appendTo(this.controls.$volume);

			$('<input/>')
				.attr({ type: 'range', value: 100, max: 100, min: 0 })
				.appendTo($sliderContainer)
				.on('input', function() {
					var max = parseInt(this.max),
						value = parseInt(this.value);

					self.setVolume(Math.pow(value / max, 1.5));
				});

			this.controls.$progress = $('<div/>')
				.addClass(prefix + 'progress')
				.appendTo($progressBuffered)
				.click(seek);

			this.info.$track = $('<div/>').addClass(prefix + 'track').appendTo($infoContainer);
			this.info.$title = $('<div/>').addClass(prefix + 'title').appendTo($infoContainer);
			this.info.$year = $('<div/>').addClass(prefix + 'year').appendTo($infoContainer);
			this.info.$album = $('<div/>').addClass(prefix + 'album').appendTo($infoContainer);
			this.info.$artist = $('<div/>').addClass(prefix + 'artist').appendTo($infoContainer);

			var self = this;
			[ 'play', 'prev', 'next', 'volume', 'options' ].forEach(function(button) {
				self.controls['$' + button].append($('<span/>'));
			});

			this.$playlist = $();

			if (this.showPlaylist && this.files.length > 1) {
				this.$playlist = $('<ol/>').addClass(prefix + 'playlist');
				this.$container.addClass(prefix + 'showing-playlist');
				(function appendTrack(index) {
					var file = self.files[index];
					if (!file) {
						return;
					}

					file.getMetadata(function(err, metadata) {
						if (err) {
							appendTrack(index + 1);
							return;
						}

						$('<li/>')
							.attr('data-track', index + 1)
							.append($('<span/>').addClass(prefix + 'track-title').text(metadata.title))
							.append($('<span/>').addClass(prefix + 'track-info')
								.append($('<span/>').addClass(prefix + 'track-duration').text('00:00'))
								.append($('<span/>').addClass(prefix + 'track-download').html('&darr;'))
							)
							.click(function() {
								if (self.current === index) {
									return;
								}

								self.stop();
								self.current = index;
								self.play();
							})
							.appendTo(self.$playlist);

						appendTrack(index + 1);
					});
				}(0));
			}

			this.$container
				.append($infoContainer, $controlContainer, this.$playlist)
				.appendTo(this.$element);

			var file = this.files[this.current];
			file.init();
			this.updateTime(0, file.getDuration());
			this.setInfo(function(err) {
				if (!err) {
					self.setActiveTrack();
				}
			});
		},

		setInfo: function(callback) {
			var file = this.files[this.current],
				self = this;

			file.getMetadata(function(err, metadata) {
				if (err) {
					callback && callback(err);
					return;
				}

				metadata.title && self.info.$title.text(metadata.title);
				metadata.year && self.info.$year.text(metadata.year);
				metadata.track && self.info.$track.text(metadata.track);
				metadata.artist && self.info.$artist.text(metadata.artist);
				metadata.album && self.info.$album.text(metadata.album);
				callback && callback();
			});
		},

		updateProgress: function(time, duration) {
			duration = duration || 1;
			var percent = (time / duration) * 100;
			this.controls.$buffered.width(percent + '%');
			var file = this.files[this.current];
			this.updateTime(file.getCurrentTime(), file.getDuration());
		},

		updateTime: function(time, duration) {
			time = time || 0;
			duration = duration || 0;
			function pad(s) {
				return s < 10 ? '0' + s : s;
			}

			var percent = !duration ? 0 : (time / duration) * 100;

			this.controls.$progress.width(percent + '%');

			//since this can happen many times per second, let's micro-optimize it
			function setTime($element, total) {
				var minutes = Math.floor(total / 60),
					seconds = Math.floor(total - (minutes * 60));
				var node = $element[0].firstChild,
					text = pad(minutes) + ':' + pad(seconds);
				if (node.nodeValue === text) {
					return;
				}

				$element[0].replaceChild(document.createTextNode(text), node);
			}

			setTime(this.controls.$elapsed, time);
			setTime(this.controls.$duration, duration);
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

			this.setActiveTrack();
		},

		setActiveTrack: function() {
			var $track = this.$playlist.find('[data-track="' + (this.current + 1) + '"]');
			if (!$track.length) {
				return;
			}

			$track
				.siblings().removeClass(prefix + 'active').end()
				.addClass(prefix + 'active');
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
			var file = this.files[this.current];
			if (file.getCurrentTime() > 2) {
				//just go back to the beginning of the current track
				this.seek(0);
				return;
			}

			if (this.files.length <= 1) {
				//nowhere to go
				return;
			}

			//go to the previous track
			this.stop();
			this.current = (this.current - 1 + this.files.length) % this.files.length;
			this.play();
		},

		next: function() {
			if (this.files.length <= 1) {
				//nowhere to go
				return;
			}

			//go to the next track
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