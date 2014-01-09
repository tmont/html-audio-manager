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
		this.manager = options.manager;
		this.manager.on('playing', function(time, duration) {
			self.updateProgress(time, duration);
		});
		var files = options.manager.files;
		this.files = Object.keys(files).map(function(name) {
			return files[name];
		});

		//this.manager.on('load', $.proxy(this.addFile, this));

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
				$progressContainer = $('<div/>').addClass(prefix + 'progress-container');

			$('<div/>').addClass(prefix + 'progress-well').appendTo($progressContainer);

			this.controls.$play = $('<div/>')
				.addClass(prefix + 'play')
				.appendTo($controlContainer)
				.click(function() {
					var file = self.files[self.current];
					if (file.playing) {
						self.pause();
					} else {
						self.play();
					}
				});

			this.controls.$prev = $('<div/>').addClass(prefix + 'prev').appendTo($controlContainer);
			this.controls.$next = $('<div/>').addClass(prefix + 'next').appendTo($controlContainer);
			this.controls.$volume = $('<div/>').addClass(prefix + 'volume').appendTo($controlContainer);
			this.controls.$time = $('<div/>').addClass(prefix + 'time').appendTo($controlContainer);
			this.controls.$progress = $('<div/>').addClass(prefix + 'progress').appendTo($progressContainer);
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
			this.setInfo();
		},

		setInfo: function() {
			var file = this.files[this.current],
				self = this;

			file.load(function(err) {
				if (err) {
					return;
				}

				if (!file.metadata) {
					var method = /\.ogg$/.test(file.path) ? 'ogg' : 'id3v2';
					file.metadata = window.AudioMetadata[method](file.raw);
				}

				var data = file.metadata;
				data.title && self.info.$title.text(data.title);
				data.year && self.info.$year.text(data.year);
				data.tracknumber && self.info.$track.text(data.tracknumber);
				data.artist && self.info.$artist.text(data.artist);
				data.album && self.info.$album.text(data.album);
			});
		},

		updateProgress: function(time, duration) {
			if (duration <= 0) {
				return;
			}

			function pad(s) {
				return s < 10 ? '0' + s : s;
			}

			var percent = (time / duration) * 100,
				minutes = Math.floor(time / 60),
				seconds = Math.floor(time - (minutes * 60));

			this.controls.$progress.width(percent + '%');
			this.controls.$time.text(pad(minutes) + ':' + pad(seconds));
		},

		play: function() {
			var file = this.files[this.current];
			this.manager.play(file.name);
			this.controls.$play.toggleClass(prefix + 'play ' + prefix + 'pause');
		},

		pause: function() {
			var file = this.files[this.current];
			this.manager.pause(file.name);
			this.controls.$play.toggleClass(prefix + 'play ' + prefix + 'pause');
		},

		prev: function() {

		},

		next: function() {

		},

		setVolume: function(value) {

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