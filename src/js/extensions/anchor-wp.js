(function () {
	'use strict';

	var AnchorForm = MediumEditor.extensions.form.extend({
		/* Anchor Form Options */

		/* customClassOption: [string]  (previously options.anchorButton + options.anchorButtonClass)
		 * Custom class name the user can optionally have added to their created links (ie 'button').
		 * If passed as a non-empty string, a checkbox will be displayed allowing the user to choose
		 * whether to have the class added to the created link or not.
		 */
		customClassOption: null,

		/* customClassOptionText: [string]
		 * text to be shown in the checkbox when the __customClassOption__ is being used.
		 */
		customClassOptionText: 'Button',

		/* linkValidation: [boolean]  (previously options.checkLinkFormat)
		 * enables/disables check for common URL protocols on anchor links.
		 */
		linkValidation: false,

		/* placeholderText: [string]  (previously options.anchorInputPlaceholder)
		 * text to be shown as placeholder of the anchor input.
		 */
		placeholderText: 'Paste or type a link',

		/* targetCheckbox: [boolean]  (previously options.anchorTarget)
		 * enables/disables displaying a "Open in new window" checkbox, which when checked
		 * changes the `target` attribute of the created link.
		 */
		targetCheckbox: false,

		/* targetCheckboxText: [string]  (previously options.anchorInputCheckboxLabel)
		 * text to be shown in the checkbox enabled via the __targetCheckbox__ option.
		 */
		targetCheckboxText: 'Open in new window',

		// Options for the Button base class
		name: 'anchor',
		action: 'createLink',
		aria: 'link',
		tagNames: ['a'],
		contentDefault: '<b>#</b>',
		contentFA: '<i class="fa fa-link"></i>',

		wpLinkPopup: null,
		linkObject: null,
		mediumTextArea: null,

		init: function () {
			MediumEditor.extensions.form.prototype.init.apply(this, arguments);

			this.subscribe('editableKeydown', this.handleKeydown.bind(this));

		},

		onWPLinkOpen: function (e) {

			document.querySelector('#wp-link-text').value = this.linkObject.title;
			document.querySelector('#wp-link-url').value = this.linkObject.value;
			document.querySelector('#wp-link-target').checked = this.linkObject.target === '_blank';

		},

		onWPLinkClose: function () {

			if (this.linkObject == null) {
				return false;
			}

			this.mediumTextArea.remove();

			// I gave up and used jQuery. Couldn't get regular eventlisteners to work.
			jQuery(document).off('wplink-open');
			jQuery(document).off('wplink-close');

			var $submit = jQuery('#wp-link-submit');
			var isSubmit = $submit.is(':hover') || $submit.is(':focus');

			// Set value
			if (isSubmit) {
				this.linkObject = {
					title: document.querySelector('#wp-link-text').value,
					value: document.querySelector('#wp-link-url').value,
					target: document.querySelector('#wp-link-target').checked ? '_blank' : ''
				};
				this.completeFormSave(this.linkObject);
			} else {
				this.doFormCancel();
			}

			this.linkObject = null;
		},

		// Called when the button the toolbar is clicked
		// Overrides ButtonExtension.handleClick
		handleClick: function (event) {
			event.preventDefault();
			event.stopPropagation();

			var range = MediumEditor.selection.getSelectionRange(this.document);

			if (range.startContainer.nodeName.toLowerCase() === 'a' ||
				range.endContainer.nodeName.toLowerCase() === 'a' ||
				MediumEditor.util.getClosestTag(MediumEditor.selection.getSelectedParentElement(range), 'a')) {
				return this.execAction('unlink');
			}

			this.showForm();

			return false;
		},

		// Called when user hits the defined shortcut (CTRL / COMMAND + K)
		handleKeydown: function (event) {
			if (MediumEditor.util.isKey(event, MediumEditor.util.keyCode.K) && MediumEditor.util.isMetaCtrlKey(event) && !event.shiftKey) {
				this.handleClick(event);
			}
		},

		// Called by medium-editor to append form to the toolbar
		getForm: function () {
			if (!this.form) {
				this.form = this.createForm();
			}
			return this.form;
		},

		/*getTemplate: function () {
			var template = [
				'<input type="text" class="medium-editor-toolbar-input" placeholder="', this.placeholderText, '">'
			];

			template.push(
				'<a href="#" class="medium-editor-toolbar-save">',
				this.getEditorOption('buttonLabels') === 'fontawesome' ? '<i class="fa fa-check"></i>' : this.formSaveLabel,
				'</a>'
			);

			template.push('<a href="#" class="medium-editor-toolbar-close">',
				this.getEditorOption('buttonLabels') === 'fontawesome' ? '<i class="fa fa-times"></i>' : this.formCloseLabel,
				'</a>');

			// both of these options are slightly moot with the ability to
			// override the various form buildup/serialize functions.

			if (this.targetCheckbox) {
				// fixme: ideally, this targetCheckboxText would be a formLabel too,
				// figure out how to deprecate? also consider `fa-` icon default implcations.
				template.push(
					'<div class="medium-editor-toolbar-form-row">',
					'<input type="checkbox" class="medium-editor-toolbar-anchor-target" id="medium-editor-toolbar-anchor-target-field-' + this.getEditorId() + '">',
					'<label for="medium-editor-toolbar-anchor-target-field-' + this.getEditorId() + '">',
					this.targetCheckboxText,
					'</label>',
					'</div>'
				);
			}

			if (this.customClassOption) {
				// fixme: expose this `Button` text as a formLabel property, too
				// and provide similar access to a `fa-` icon default.
				template.push(
					'<div class="medium-editor-toolbar-form-row">',
					'<input type="checkbox" class="medium-editor-toolbar-anchor-button" id="medium-editor-toolbar-anchor-button-field-' + this.getEditorId() + '">',
					'<label for="medium-editor-toolbar-anchor-button-field-' + this.getEditorId() + '">',
					this.customClassOptionText,
					'</label>',
					'</div>'
				);
			}

			return template.join('');

		},*/

		// Used by medium-editor when the default toolbar is to be displayed
		isDisplayed: function () {
			return MediumEditor.extensions.form.prototype.isDisplayed.apply(this);
		},

		hideForm: function () {
			MediumEditor.extensions.form.prototype.hideForm.apply(this);
			this.getInput().value = '';
		},

		showForm: function (opts) {
			let list1 = jQuery(document).on('wplink-open', () => this.onWPLinkOpen());
			let list2 = jQuery(document).on('wplink-close', () => this.onWPLinkClose());


			var range = MediumEditor.selection.getSelectionRange(this.document);

			this.mediumTextArea = this.document.createElement('textarea');
			this.mediumTextArea.id = 'medium-link-textarea';
			this.mediumTextArea.style.display = 'none';

			let title = '';
			let url = '';
			let target = '';

			if (range.startContainer.nodeName.toLowerCase() === 'a' ||
				range.endContainer.nodeName.toLowerCase() === 'a' ||
				MediumEditor.util.getClosestTag(MediumEditor.selection.getSelectedParentElement(range), 'a')) {
				let anchor = MediumEditor.util.getClosestTag(MediumEditor.selection.getSelectedParentElement(range), 'a');
				title = anchor.text;
				url = anchor.href;
				target = anchor.target;
			} else {
				title = range + '';
				url = '';
				if (this.isEmail(title)) {
					url = 'mailto:' + title.toLowerCase();
				}
			}

			this.linkObject = {
				title: title,
				value: url,
				target: target
			};

			//var $textarea = $('<textarea id="acf-link-textarea" style="display:none;"></textarea>');
			this.mediumTextArea = document.createElement('textarea');
			this.mediumTextArea.id = 'medium-link-textarea';
			this.mediumTextArea.style.display = 'none';
			document.body.appendChild(this.mediumTextArea);

			this.base.saveSelection();
			// open popup
			wpLink.open('medium-link-textarea', this.linkObject.value, this.linkObject.title, null);
		},

		// Called by core when tearing down medium-editor (destroy)
		destroy: function () {
			if (!this.form) {
				return false;
			}

			if (this.form.parentNode) {
				this.form.parentNode.removeChild(this.form);
			}

			delete this.form;
		},

		// core methods


		doFormSave: function () {

			this.completeFormSave(this.linkObject);
		},

		completeFormSave: function (opts) {
			this.base.restoreSelection();
			this.execAction(this.action, opts);
			this.base.checkSelection();
		},

		ensureEncodedUri: function (str) {
			return str === decodeURI(str) ? encodeURI(str) : str;
		},

		ensureEncodedUriComponent: function (str) {
			return str === decodeURIComponent(str) ? encodeURIComponent(str) : str;
		},

		ensureEncodedParam: function (param) {
			var split = param.split('='),
				key = split[0],
				val = split[1];

			return key + (val === undefined ? '' : '=' + this.ensureEncodedUriComponent(val));
		},

		ensureEncodedQuery: function (queryString) {
			return queryString.split('&').map(this.ensureEncodedParam.bind(this)).join('&');
		},

		isEmail: function (email) {
			email += ''; // ensure it's a string
			return email.match(
				/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
			);
		},

		checkLinkFormat: function (value) {
			// Matches any alphabetical characters followed by ://
			// Matches protocol relative "//"
			// Matches common external protocols "mailto:" "tel:" "maps:"
			// Matches relative hash link, begins with "#"
			var urlRex = /^(.*?)(?:\?(.*?))?(?:#(.*))?$/;

			var valueString = value + '';

			var urlSchemeRegex = /^([a-z]+:)?\/\/|^(mailto|tel|maps):|^\#/i,
				hasScheme = urlSchemeRegex.test(value),
				scheme = '',
				// telRegex is a regex for checking if the string is a telephone number
				telRegex = /^\+?\s?\(?(?:\d\s?\-?\)?){3,20}$/,
				urlParts = valueString.match(urlRex),
				path = urlParts[1],
				query = urlParts[2],
				fragment = urlParts[3];

			if (telRegex.test(value)) {
				return 'tel:' + value;
			}

			if (!hasScheme) {
				var host = path.split('/')[0];
				// if the host part of the path looks like a hostname
				if (host.match(/.+(\.|:).+/) || host === 'localhost') {
					scheme = 'https://';
				}
			}

			return scheme +
				// Ensure path is encoded
				this.ensureEncodedUri(path) +
				// Ensure query is encoded
				(query === undefined ? '' : '?' + this.ensureEncodedQuery(query)) +
				// Include fragment unencoded as encodeUriComponent is too
				// heavy handed for the many characters allowed in a fragment
				(fragment === undefined ? '' : '#' + fragment);
		},

		doFormCancel: function () {
			this.base.restoreSelection();
			this.base.checkSelection();
		},

		// form creation and event handling


		createForm: function () {
			var doc = this.document,
				form = doc.createElement('div');

			// Anchor Form (div)
			form.className = 'medium-editor-toolbar-form';
			form.id = 'medium-editor-toolbar-form-anchor-' + this.getEditorId();

			//form.innerHTML = this.getTemplate();


			return form;
		},



	});

	MediumEditor.extensions.anchor = AnchorForm;
}());
