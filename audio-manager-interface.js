(function(window, document, $) {

	var prefix = 'audio-manager-',
		meta = window.AudioMetadata;

	function AudioManagerInterface($element, options) {
		if (!options || typeof(options) !== 'object') {
			options = {};
		}

		if (!options.manager) {
			throw new Error('An AudioManager must be passed to rach3');
		}

		this.$element = $element;
		this.manager = options.manager;
		var files = options.manager.files;
		this.files = Object.keys(files).map(function(name) {
			return files[name];
		});

		//this.manager.on('load', $.proxy(this.addFile, this));

		this.$container = null;
		this.controls = {};
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

			this.controls.$play = $('<div/>').addClass(prefix + 'play').appendTo($controlContainer);
			this.controls.$prev = $('<div/>').addClass(prefix + 'prev').appendTo($controlContainer);
			this.controls.$next = $('<div/>').addClass(prefix + 'next').appendTo($controlContainer);
			this.controls.$volume = $('<div/>').addClass(prefix + 'volume').appendTo($controlContainer);
			this.controls.$time = $('<div/>').addClass(prefix + 'time').appendTo($controlContainer);
			this.controls.$progress = $('<div/>').addClass(prefix + 'progress').appendTo($progressContainer);
			$progressContainer.appendTo($controlContainer);

			var self = this;
			[ 'play', 'prev', 'next', 'volume' ].forEach(function(button) {
				self.controls['$' + button].append($('<span/>'));
			});

			this.$container
				.append($infoContainer, $controlContainer)
				.appendTo(this.$element);

			this.controls.$time.text('03:20');
		},

		play: function() {

		},

		pause: function() {

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