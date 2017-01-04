/*!
 *
 *	jQuery Dropdown
 *
 *	https://github.com/daneWilliams/jquery.dropdown
 *
 *	================================================================
 *
 *	@version		2.2.0
 *
 *	@author			Dane Williams (danewilliams.uk)
 *	@copyright		2014-2016 Dane Williams
 *	@license		MIT License
 *
 */

;(function( $, window, document, undefined ) {


	'use strict';


	/**
	 *
	 *	Constructor
	 *
	 *	================================================================ */

	function Dropdown( elem, options ) {

		// Plugin data
		this.name     = 'dropdown';
		this.defaults = defaults;
		this.objects  = objects;

		// Store reference to elements
		this.elem  = elem;
		this.$elem = $(elem);
		this.elems = {};

		// Set options
		this.opt = $.extend( true, {}, defaults, options, $(elem).data('dropdown') );

		// Set templates
		this._tpl = templates;
		this.tpl  = $.extend( true, {}, this._tpl, this.opt.templates );

		// Set classes
		this._cls = classes;
		this.cls  = this._mergeClasses();

		// Instance
		this.inst = {

			// Instance ID
			uid: this.id(),

			// Menus
			menu: null,
			menuMain: null,
			menus: {},

			// Items
			items: {},
			value: null,
			selected: null,
			focused: null,

			// States
			open:      false,
			opening:   false,
			closing:   false,
			animating: false,
			resizing:  false,
			resetting: false,

			// Resize
			resizeTimeout: null,

			// Position
			above: false

		};

		// Initialise
		this.init();

	}


	/**
	 *
	 *	Methods
	 *
	 *	================================================================ */
	
	$.extend( Dropdown.prototype, {


		/**
		 *
		 *	Initialise
		 *
		 *	================================================================ */

		init: function() {

			var self = this;

			// Check for transition support
			if ( !self._supportsTransitions() )
				self.opt.speed = 0;

			// Build the dropdown
			self._build();

			// Populate
			self._populate();

			// Bind events
			self._bind();

			// Bind keybard events
			if ( self.opt.keyboard )
				self._bindKeyboard();

			// Multi
			if ( self.opt.multi ) {

				self.inst.selected = [];
				self.inst.value    = [];

			}

			// Select initial
			if ( !$.isEmptyObject( self.inst.items ) ) {

				$.each( self.inst.items, function( item ) {

					item = self.getItem( item );

					if ( item.selected && !item.children.items )
						self.select( item );

				});

			}

			// Event
			self.$elem.trigger( self.name + '.init', self );

		},


		/**
		 *
		 *	Select an item
		 *
		 *	================================================================ */

		select: function( item ) {

			var self = this;
			var opt  = self.opt,
			    inst = self.inst;

			// Get item
			item = self.getItem( item );

			if ( !item )
				return false;

			// Open menu
			if ( opt.nested && item.children.menu )
				return self.openMenu( item.children.menu );

			// Deselect
			if ( opt.multi && item.selected )
				return self.deselect( item );

			// Get current item
			var cur = false;

			if ( inst.selected ) {

				if ( !opt.multi )
					cur = self.getItem( inst.selected );

				if ( cur.uid == item.uid )
					cur = false;

			}

			// Callback
			self._beforeSelect( item, cur );

			// Select item
			if ( !item.url || opt.selectLinks ) {

				// Deselect current
				if ( cur && !opt.multi )
					self.deselect( cur );

				// Update item
				item.selected = true;
				item.elem.addClass( self.cls.selected );

				// Update plugin
				if ( opt.multi ) {

					if ( -1 === inst.selected.indexOf( item.uid ) )
						inst.selected.push( item.uid );

					if ( -1 === inst.value.indexOf( item.value ) )
						inst.value.push( item.value );

				} else {

					inst.selected = item.uid;
					inst.value    = item.value;

				}

				// Select/deselect parent
				self.selectParent( item );

			}

			// Update toggle text
			if ( opt.autoToggle && ( !item.url || opt.autoToggleLink || null === opt.autoToggleLink ) ) {

				// Reset
				if ( !inst.selected || !inst.selected.length ) {

					if ( opt.multi )
						self.toggleTextMulti();

					else
						self.toggleText();

				} else {

					var toggleText = item.text;

					if ( opt.autoToggleHTML && item.html ) {

						toggleText = item.html;

					}

					if ( opt.multi )
						self.toggleTextMulti( toggleText );

					else
						self.toggleText( toggleText );

				}

			}

			// Close dropdown
			if ( opt.autoClose || ( !opt.multi && opt.autoCloseLink ) ) {

				if ( opt.multi ) {

					if ( opt.autoCloseMax && opt.maxSelect && inst.selected.length === opt.maxSelect )
						self.close();

				} else {

					if ( !item.url || opt.autoCloseLink || ( opt.autoClose && null == opt.autoCloseLink ) )
						self.close();

				}

			}

			// Callback
			self._afterSelect( item, cur );

			// Follow link
			if ( item.url && opt.followLinks ) {

				window.location.href = item.url;
				return true;

			}

			return true;

		},


		/**
		 *
		 *	Select by value(s)
		 *
		 *	================================================================ */

		selectValue: function( values, clear ) {

			var self = this;
			var inst = self.inst;

			// Get array of values
			if ( !values )
				values = [];

			if ( !Array.isArray( values ) )
				values = [ values ];

			// Deselect all
			if ( clear )
				self.deselect();

			// Select
			for ( var uid in inst.items ) {

				$.each( values, function( i, value ) {

					if ( self.value( uid ) === value ) {

						self.select( uid );

					}

				});

			}

			return true;

		},


		/**
		 *
		 *	Deselect an item
		 *
		 *	================================================================ */

		deselect: function( item ) {

			var self = this;
			var opt  = self.opt,
			    inst = self.inst,
			    cls  = self.cls;

			// Deselect all
			if ( !item ) {

				if ( !inst.selected || !inst.selected.length )
					return false;

				if ( opt.multi ) {

					for ( var uid in inst.selected )
						self.deselect( uid );

				} else {

					self.deselect( inst.selected );

				}

				return true;

			}

			// Get item
			item = self.getItem( item );

			if ( !item )
				return false;

			// Callback
			self._beforeDeselect( item );

			// Update item
			item.selected = false;
			item.elem.removeClass( cls.selected );

			// Update plugin
			if ( inst.selected ) {

				if ( opt.multi ) {

					var selected = inst.selected.indexOf( item.uid );

					if ( -1 !== selected )
						inst.selected.splice( selected, 1 );

					inst.value = jQuery.grep( inst.value, function( value ) {
						return value != item.value;
					});

				} else {

					inst.selected = null;

					if ( inst.value === item.value )
						inst.value = null;

				}

			}

			// Update toggle
			if ( opt.autoToggle ) {

				if ( opt.multi )
					self.toggleTextMulti( item.text );

				else
					self.toggleText();

			}

			// Select/deselect parent
			self.selectParent( item );

			// Callback
			self._afterDeselect( item );

			return true;

		},


		/**
		 *
		 *	Select/deselect a parent item
		 *
		 *	================================================================ */

		selectParent: function( item ) {

			var self = this;
			var opt  = self.opt,
			    inst = self.inst;

			if ( !item.parent )
				return false;

			// Get parent
			var parent = self.getItem( item.parent );

			if ( !parent )
				return false;

			// Update parent
			if ( item.selected ) {

				// Select parent
				parent.selected = true;

				if ( parent.elem )
					parent.elem.addClass( self.cls.selected );

			} else {

				// Check for selected children
				var selected = 0;

				$.each( parent.children.items, function( i, uid ) {

					var child = self.getItem( uid );

					if ( child && child.selected ) {

						selected++;

					}

				});

				if ( selected ) {

					// Select parent
					parent.selected = true;

					if ( parent.elem )
						parent.elem.addClass( self.cls.selected );

				} else {

					// Deselect parent
					parent.selected = false;

					if ( parent.elem )
						parent.elem.removeClass( self.cls.selected );

				}

			}

			// Update ancestors
			if ( parent.parent )
				self.selectParent( parent );

			return true;

		},


		/**
		 *
		 *	Open the dropdown
		 *
		 *	================================================================ */

		open: function( menu ) {

			var self = this;
			var opt  = self.opt,
			    inst = self.inst,
			    elem = self.elems;

			// Already open/opening
			if ( inst.open || inst.opening )
				return false;

			// Open menu
			if ( menu )
				return self.openMenu( menu );

			// Callback
			self._beforeOpen();

			// Set start values
			var start = {
				opacity: 0,
				y: -( elem.toggleButton.outerHeight() / 2 )
			};

			// Set finish values
			var finish = {
				opacity: 1,
				y: 0
			};

			// Above
			if ( inst.above )
				start.y = ( elem.toggleButton.outerHeight() / 2 );

			// Animate
			elem.menuWrapper.show().css( start ).transition( finish, opt.speed, opt.easing, function() {

				// Callback
				self._afterOpen();

			});

			return true;

		},


		/**
		 *
		 *	Close the dropdown
		 *
		 *	================================================================ */

		close: function( menu ) {

			var self = this;
			var opt  = self.opt,
			    inst = self.inst,
			    elem = self.elems;

			// Already closed/closing
			if ( !inst.open || inst.closing )
				return false;

			// Close menu
			if ( menu )
				return self.closeMenu( menu );

			// Callback
			self._beforeClose();

			// Set start values
			var start = {
				opacity: 1,
				y: 0
			};

			// Set finish values
			var finish = {
				opacity: 0,
				y: -( elem.toggleButton.outerHeight() / 2 )
			};


			// Above
			if ( self.inst.above )
				finish.y = ( elem.toggleButton.outerHeight() / 2 );

			// Animate
			elem.menuWrapper.show().css( start ).transition( finish, opt.speed, opt.easing, function() {

				elem.menuWrapper.hide();

				// Callback
				self._afterClose();

			});

			return true;

		},


		/**
		 *
		 *	Open a menu
		 *
		 *	================================================================ */

		openMenu: function( menu, noAnimation ) {

			var self = this;
			var opt  = self.opt,
			    inst = self.inst;

			// Already opening
			if ( inst.opening )
				return false;

			// Get menu
			menu = self.getMenu( menu );

			if ( !menu )
				return false;

			// Get current menu
			var current = ( inst.menu ? self.getMenu() : false );

			if ( current && current.uid == menu.uid )
				return false;

			// Animation speed
			var speed = ( noAnimation ? 0 : opt.speed );

			// Callback
			self._beforeOpenMenu( menu, current );

			// Set start values
			var start = {
				x: '100%'
			};

			menu.elem.show().css( start );

			if ( current )
				current.elem.css({ x: 0 });

			// Set finish values
			var finish = {
				x: 0
			};

			// Animate
			if ( current )
				current.elem.transition( { x: '-100%' }, speed );

			menu.elem.transition( finish, speed, opt.easing, function() {

				// Callback
				self._afterOpenMenu( menu, current );

			});

			return true;

		},


		/**
		 *
		 *	Close a menu
		 *
		 *	================================================================ */

		closeMenu: function( menu, noAnimation ) {

			var self = this;
			var opt  = self.opt,
			    inst = self.inst;


			// Already closing
			if ( inst.closing )
				return false;

			// Get menu
			menu = self.getMenu( menu );

			if ( !menu )
				return false;

			// Get target menu
			var target = ( menu.parent ? self.getMenu( menu.parent ) : false );

			if ( target && target.uid == menu.uid )
				return false;

			// No target
			if ( !target )
				return self.close();

			// Animation speed
			var speed = ( noAnimation ? 0 : self.opt.speed );

			// Callback
			self._beforeCloseMenu( menu, target );

			// Set start values
			var start = {
				x: 0
			};

			menu.elem.css( start );
			target.elem.show().css({ x: '-100%' });

			// Set finish values
			var finish = {
				x: '100%'
			};

			// Animate
			target.elem.transition({ x: 0 }, speed );

			menu.elem.transition( finish, speed, opt.easing, function() {

				// Callback
				self._afterCloseMenu( menu, target );

				return true;

			});

		},


		/**
		 *
		 *	Resize the dropdown
		 *
		 *	================================================================ */

		resize: function( menu, noAnimation ) {

			var self    = this,
			    opt     = self.opt,
			    inst    = self.inst,
			    wrapper = self.elems.menuWrapper;

			// Already resizing
			if ( inst.resizing )
				return false;

			// Get the menu
			menu = self.getMenu( menu );

			if ( !menu )
				return false;

			// Resize object
			var resize = $.extend( true, {}, self.objects.resize );

			// Callback
			self._beforeResize( menu, resize );

			// Viewport dimensions
			resize.viewport.width  = $(window).width();
			resize.viewport.height = $(window).height();

			// Make wrapper dimensions available
			if ( !inst.open )
				wrapper.show().css({ opacity: 0 });

			// Wrapper dimensions
			resize.wrapper.width  = wrapper.outerWidth( true );
			resize.wrapper.height = wrapper.outerHeight( true );

			resize.wrapper.diff.width  = ( resize.wrapper.width  - wrapper.width()  );
			resize.wrapper.diff.height = ( resize.wrapper.height - wrapper.height() );

			// Make menu dimensions available
			menu.elem.show().css({ opacity: 0, position: 'fixed', height: '', width: '' });

			// List dimensions
			var $list = menu.elem.children( '.' + self._cls.menuList ).eq(0);

			$list.css({ height: '', width: '' });

			resize.list.width  = $list.width();
			resize.list.height = $list.height();

			// Menu dimensions
			resize.menu.width  = menu.elem.outerWidth( true );
			resize.menu.height = menu.elem.outerHeight( true );

			// Add collision values
			resize = self._collisionValues( menu, resize );

			// Reset list
			$list.css({ height: resize.collision.list.height });

			// Reset dropdown
			if ( !self.inst.open )
				wrapper.css({ display: '', opacity: '' });

			// Reset menu
			menu.elem.css({ display: '', opacity: '', position: '' });

			// Animation speed
			var speed = ( noAnimation ? 0 : self.opt.speed );

			// Animate
			wrapper.transition( { height: resize.collision.menu.height }, speed, opt.easing, function() {

				// Callback
				self._afterResize( menu, resize );

				return resize;

			});

			return resize;

		},


		/**
		 *
		 *	Focus an item
		 *
		 *	================================================================ */

		focus: function( item ) {

			var self = this,
			    opt  = self.opt,
			    inst = self.inst,
			    cls  = self.cls;

			// Remove current focus
			if ( inst.focused ) {

				var focused = self.getItem( inst.focused );
				focused.elem.removeClass( cls.focused );

				inst.focused = null;

			}

			// Get the item
			item = self.getItem( item );

			if ( !item )
				return;

			// Update classes
			item.elem.addClass( cls.focused );

			// Update link
			item.elem.children( '.' + cls.core.menuLink ).focus();

			// Update state
			inst.focused = item.uid;

		},


		/**
		 *
		 *	Reset the dropdown
		 *
		 *	================================================================ */

		reset: function( clear ) {

			var self = this;
			var inst = self.inst,
			    opt  = self.opt,
			    elem = self.elem,
			    cls  = self.cls;

			// Get the menus
			var target  = self.getMenu( 'main' );
			var current = self.getMenu();

			// Callback
			self._beforeReset( clear, target, current );

			// Deselect
			if ( clear )
				self.deselect();

			// Callback
			self._afterReset( clear, target, current );

		},


		/**
		 *
		 *	Get selected
		 *
		 *	================================================================ */

		selected: function( items ) {

			var self     = this;
			var selected = self.inst.selected;

			if ( !selected || !selected.length )
				return false;

			if ( !items )
				return selected;

			if ( !Array.isArray( selected ) )
				selected = [ selected ];

			// Get items
			items = {};

			for ( var uid in selected )
				items[ uid ] = self.getItem( uid );

			return items;

		},


		/**
		 *
		 *	Get value
		 *
		 *	================================================================ */

		value: function( item ) {

			var self = this;

			if ( !item )
				return self.inst.value;

			// Get item
			item = self.getItem( item );

			if ( item )
				return item.value;

			return null;

		},


		/**
		 *
		 *	Get item text
		 *
		 *	================================================================ */

		text: function( item ) {

			var self = this;

			if ( !item )
				return false;

			item = self.getItem( item );

			if ( item )
				return item.text;

			return null;

		},


		/**
		 *
		 *	Get a menu
		 *
		 *	================================================================ */

		getMenu: function( menu ) {

			var self = this,
			    inst = self.inst,
			    elem = self.inst;

			// Check if this is an item
			var item = self.getItem( menu );

			if ( item )
				menu = item.menu;

			// Get current menu
			if ( !menu ) {

				if ( inst.menu )
					menu = inst.menu;

				else
					menu = inst.menuMain;

			}

			// Get by string
			if ( typeof menu === 'string' ) {

				// Main menu
				if ( 'main' == menu )
					menu = inst.menus[ inst.menuMain ];

				// Object
				else if ( inst.menus[ menu ] )
					menu = inst.menus[ menu ];

				// Element
				else if ( elem.dropdown.find( '#' + menu ) )
					menu = elem.dropdown.find( '#' + menu );

			}

			if ( !menu )
				return false;

			// Get from jQuery object
			if ( menu.jquery ) {

				var uid = menu.data( 'dropdown-uid' );

				if ( !uid || !inst.menus[ uid ] )
					return false;

				return inst.menus[ uid ];

			}

			// Not a menu
			if ( typeof menu !== 'object' )
				return false;

			return menu;

		},


		/**
		 *
		 *	Add a menu
		 *
		 *	================================================================ */

		addMenu: function( menu ) {

			var self = this,
			    opt  = self.opt,
			    inst = self.inst,
			    cls  = self.cls;

			// Get menu object
			menu = $.extend( true, {}, self.objects.menu, menu );

			// Generate ID
			if ( !menu.uid )
				menu.uid = self.id();

			// Add to plugin
			inst.menus[ menu.uid ] = menu;

			// Main menu
			if ( !inst.menuMain )
				inst.menuMain = menu.uid;

			// Set title
			if ( !menu.title ) {

				menu.title = opt.titleText;

				if ( opt.autoTitle && menu.parent ) {

					var parent = self.getItem( menu.parent );

					if ( parent )
						menu.title = parent.text;

				}

			}

			// Build element
			menu.elem = self._buildMenu( menu );

			// Main menu
			if ( inst.menuMain == menu.uid )
				menu.elem.addClass( cls.menuMain );

			// Any items?
			if ( menu.items ) {

				self.addItems( menu.items, menu.uid );

			}

			return menu;

		},


		/**
		 *
		 *	Get an item
		 *
		 *	================================================================ */

		getItem: function( item ) {

			var self = this,
			    inst = self.inst,
			    elem = self.elems;

			// Get by ID
			if ( typeof item === 'string' ) {

				// Object
				if ( inst.items[ item ] )
					item = inst.items[ item ];

				// Element
				else if ( elem.dropdown.find( '#' + item ) )
					item = elem.dropdown.find( '#' + item );

			}

			if ( !item )
				return false;

			// Get from jQuery object
			if ( item.jquery ) {

				var uid = item.data( 'dropdown-uid' );

				if ( !uid || !inst.items[ uid ] )
					return false;

				return inst.items[ uid ];

			}

			// Not an item
			if ( typeof item !== 'object' )
				return false;

			return item;

		},


		/**
		 *
		 *	Add items
		 *
		 *	================================================================ */

		addItems: function( items, menu ) {

			var self = this;

			// No items
			if ( !Array.isArray( items ) )
				return false;

			// Add items
			$.each( items, function( i, item ) {

				self.addItem( item, menu );

			});

		},


		/**
		 *
		 *	Add single item
		 *
		 *	================================================================ */

		addItem: function( item, menu ) {

			var self = this,
			    opt  = self.opt,
			    inst = self.inst;

			// Get menu
			menu = ( opt.nested ? self.getMenu( menu ) : self.getMenu() );

			// Create item
			item = $.extend( true, {}, self.objects.item, item );

			// Set ID
			item.id = ( item.uid ? item.uid : self.id() );

			// Set menu
			item.menu = ( item.menu ? item.menu : menu.uid );

			// Add top divider
			if ( null == item.divider && item.label )
				item.divider = 'top';

			// Add to plugin
			inst.items[ item.uid ] = item;

			// Add children
			if ( item.children.items && item.children.items.length ) {

				// Set menu
				if ( !opt.nested ) {

					item.children.menu = menu;

				} else {

					// Add new
					if ( !item.children.menu ) {

						var submenu = self.addMenu({ parent: item.uid, title: item.children.title });

						item.children.menu = submenu.uid;

					}

				}

				// Add parent
				if ( item.value || item.url || opt.selectParents ) {

					var parent = $.extend( true, {}, self.objects.item, {
						uid: false,
						menu: false,
						parent: item.uid,
						children: {}
					});

					item.children.items.unshift( parent );

				} else {

					// Add label
					if ( !opt.nested ) {

						if ( !item.children.items[0].label )
							item.children.items[0].label = item.text;

					}

				}

				// Get children
				var children = self.addItems( item.children.items, item.children.menu );

				item.children.items = [];

				// Modify child items and parent
				$.each( children, function( j, child ) {

					inst.items[ child.uid ].parent = item.uid;

					item.children.items.push( child.uid );

					if ( child.selected )
						item.selected = true;

				});

				// Add element
				if ( opt.nested )
					item.elem = self._buildItem( item );

			} else {

				// Add element
				item.elem = self._buildItem( item );

			}

			return item;

		},


		/**
		 *
		 *	Update toggle text
		 *
		 *	================================================================ */

		toggleText: function( text ) {

			var self = this,
			    elem = self.elems;

			// Get toggle
			var $toggle = elem.toggleButton,
			    $text   = elem.toggleText;

			// Store original
			if ( !$toggle.data( 'dropdown-text' ) )
				$toggle.data( 'dropdown-text', $text.html() );

			// Reset
			if ( !text ) {

				$text.html( $toggle.data( 'dropdown-text' ) );
				return true;

			}

			// Update
			$text.html( text );
			return true;

		},


		/**
		 *
		 *	Update mutli toggle text
		 *
		 *	================================================================ */

		toggleTextMulti: function( text ) {

			var self = this,
			    elem = self.elems;

			// Get toggle
			var $toggle = elem.toggleButton,
			    $text   = elem.toggleText;

			// Store original
			if ( !$toggle.data( 'dropdown-text' ) )
				$toggle.data( 'dropdown-text', $text.html() );

			// Reset
			if ( !text ) {

				$toggle.data( 'dropdown-text-multi', [] );
				$text.html( $toggle.data( 'dropdown-text' ) );

				return true;

			}

			// Get values
			var vals = $toggle.data( 'dropdown-text-multi' );
			    vals = ( vals ? vals : [] );

			// Check if text already exists
			var index = vals.indexOf( text );

			// Remove text
			if ( -1 !== index )
				vals.splice( index, 1 );

			// Add text
			else
				vals.push( text );

			// Get new text
			var str = $toggle.data( 'dropdown-text' );

			if ( vals.length )
				str = vals.join( ', ' );

			// Store values
			$toggle.data( 'dropdown-text-multi', vals );

			// Update
			$text.html( str );

		},


		/**
		 *
		 *	Generate a unique ID
		 *
		 *	================================================================ */

		id: function() {

			var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});

			return id;

		},


		/**
		 *
		 *	Get resize collision values
		 *
		 *	================================================================ */

		_collisionValues: function( menu, resize ) {

			var self = this,
			    opt  = self.opt,
			    inst = self.inst,
			    elem = self.elems;

			// Create collision object
			var collision = $.extend( true, {}, self.objects.collision, resize );

			// Get scroll distances
			collision.scrolled = {
				x: $(document).scrollLeft(),
				y: $(document).scrollTop()
			};

			// Get position
			collision.position = {
				x: 'left',
				y: ( inst.above ? 'top' : 'bottom' )
			};

			collision.offset = {
				x: elem.dropdown.offset().left,
				y: elem.dropdown.offset().top
			};

			// Get available space
			collision.space = {
				top:    ( collision.offset.y - collision.scrolled.y ),
				bottom: ( resize.viewport.height + collision.scrolled.y ) - collision.offset.y - elem.toggleButton.outerHeight( true ),
				left:   ( collision.offset.x - collision.scrolled.x ),
				right:  ( resize.viewport.width + collision.scrolled.x ) - collision.offset.x
			};

			// Account for margin
			if ( opt.margin ) {

				$.each( collision.space, function( i, value ) {

					collision.space[ i ] = value - opt.margin;

				});

			}

			// Check for mobile
			var mobile = ( elem.menuWrapper.css('position') == 'fixed' ? true : false );

			// Get total height
			collision.height = ( resize.menu.height + resize.wrapper.diff.height );

			if ( mobile ) {

				if ( resize.menu.height > resize.wrapper.height ) {

					collision.menu.height = ( resize.wrapper.height - resize.wrapper.diff.height );

				}

			} else {

				// Collision checks
				if ( opt.collision ) {

					var space = 0;

					// Exceeds vertical space
					if ( inst.above ) {

						if ( collision.height > collision.space.top ) {

							space = collision.space.top;

							// Change position
							if ( collision.space.bottom > collision.space.top ) {

								collision.position.y  = 'bottom';
								space = collision.space.bottom;

							}

						}

					} else {

						if ( collision.height > collision.space.bottom ) {

							space = collision.space.bottom;

							// Change position
							if ( collision.space.top > collision.space.bottom ) {

								collision.position.y  = 'top';
								space = collision.space.top;

							}					

						}

					}

					if ( space && collision.height > space ) {

						collision.menu.height = ( space - collision.wrapper.diff.height );

					}

				}

			}

			// Get new list height
			collision.list.height = collision.menu.height - ( resize.menu.height - resize.list.height );

			// Add to resize object
			resize.collision = collision;

			return resize;

		},


		/**
		 *
		 *	Bind events
		 *
		 *	================================================================ */

		_bind: function() {

			var self = this,
			    inst = self.inst,
			    opt  = self.opt,
			    elem = self.elems;

			// Select item
			elem.dropdown.on( 'click', '.' + self._cls.menuItem, function(e) {

				e.preventDefault();

				self.select( $(this).data( 'dropdown-uid' ) );

			});

			// Toggle
			elem.toggleButton.on( 'click', function(e) {

				e.preventDefault();

				if ( !inst.open )
					self.open();

				else
					self.close();

			});

			// Open dropdown
			elem.dropdown.on( 'dropdown.open', function() {

				self.open();

			});

			// Close dropdown
			elem.dropdown.on( 'dropdown.close', function() {

				self.close();

			});

			elem.dropdown.on( 'click', '.' + self._cls.closeButton, function(e) {

				e.preventDefault();

				self.close();

			});

			// Sync with <select />
			self.$elem.on( 'change', function() {

				self.selectValue( self.$elem.val(), true );

			});

			// Back
			elem.dropdown.on( 'click', '.' + self._cls.backButton, function(e) {

				e.preventDefault();

				self.closeMenu();

			});

			// Auto close
			if ( opt.autoClose ) {

				$(document).on( 'mousedown', function(e) {

					var $target   = $(e.target);
					var $dropdown = $target.parents( '.' + self._cls.dropdown );

					if ( ( !$dropdown.length || $dropdown.data('uid') != inst.uid ) )
						self.close();

				});

			}

			// Auto resize
			if ( opt.autoResize ) {

				$(window).resize(function() {

					if ( inst.resizeTimeout ) 
						clearTimeout( inst.resizeTimeout );

					inst.resizeTimeout = setTimeout(function() {

						self._autoResize();

					}, opt.autoResize );

				});

			}

		},


		/**
		 *
		 *	Bind keyboard events
		 *
		 *	================================================================ */

		_bindKeyboard: function() {

			var self = this,
			    inst = self.inst,
			    opt  = self.opt,
			    elem = self.elems,
			    cls  = self.cls;

			$(document).on( 'keypress', function(e) {

				// Get the focused item
				var focused = ( inst.focused ? self.getItem( inst.focused ) : null );

				// Ignore this dropdown
				if ( !inst.open && !elem.toggleButton.is(':focus') )
					return;

				// Get the key
				var keyCode = ( e.keyCode ? e.keyCode : e.which );

				switch ( keyCode ) {


					// Tab
					case 9 :

						// Close
						if ( elem.toggleButton.is(':focus') && inst.open ) {

							e.preventDefault();

							self.close();

						}

					break;


					// Enter
					case 13 :

						e.preventDefault();

						// Select item
						if ( inst.open && focused ) {

							// Open menu
							if ( focused.children.menu ) {

								// Get the menu
								var menu = self.getMenu( focused.children.menu );

								// Focus on an item
								var target = menu.elem.find( '.' + cls.core.menuItem );

								if ( menu.elem.find( '.' + cls.core.selected ).length )
									target = menu.elem.find( '.' + cls.core.selected );

								self.focus( target.eq(0) );

								// Open the menu
								self.openMenu( focused.children.menu );
								return;

							} else {

								// Select item
								self.select( focused );
								return;

							}

						}

						// Open/close dropdown
						if ( elem.toggleButton.is(':focus') ) {

							if ( !inst.open )
								self.open();

							else
								self.close();

							return;

						}

					break;


					// Escape
					case 27 :

						// Close dropdown
						if ( inst.open ) {

							self.close();
							return;

						}

					break;


					// Up
					case 38:

						if ( !inst.open )
							return;

						e.preventDefault();

						if ( !focused )
							return;

						// Defocus
						if ( !focused.elem.prev().length ) {

							self.focus( false );
							elem.toggleButton.focus();
							return;

						}

						// Focus the previous item
						self.focus( focused.elem.prev() );

					break;


					// Down
					case 40:

						e.preventDefault();

						var menu = self.getMenu();

						// Open the dropdown
						if ( elem.toggleButton.is(':focus') ) {

							if ( !inst.open )
								self.open();

							// Focus on the first item
							var target = menu.elem.find( '.' + cls.core.menuItem );

							self.focus( target.eq(0) );
							return;

						}

						// Focus on an item
						if ( !focused ) {

							var target = menu.elem.find( '.' + cls.core.menuItem );

							if ( menu.elem.find( '.' + cls.core.selected ).length ) {

								target = menu.elem.find( '.' + cls.core.selected );

								if ( target.next().length )
									target = target.next();

							}

							self.focus( target.eq(0) );
							return;

						}

						// Focus the next item
						if ( focused.elem.next().length )
							self.focus( focused.elem.next() );

					break;


					// Left
					case 37:

						if ( !inst.open )
							return;

						if ( inst.menuMain == inst.menu )
							return;

						e.preventDefault();

						// Get the target item
						var menu = self.getMenu();
						var item = self.getItem( menu.parent );

						// Close the menu
						self.closeMenu( menu );

						// Focus the item
						self.focus( item );

					break;


					// Right
					case 39:

						if ( !inst.open || !focused )
							return;

						if ( !focused.children.menu )
							return;

						e.preventDefault();

						// Get the menu
						var menu = self.getMenu( focused.children.menu );

						// Focus the first or selected item
						var target = menu.elem.find( '.' + cls.core.menuItem );

						if ( menu.elem.find( '.' + cls.core.selected ).length )
							target = menu.elem.find( '.' + cls.core.selected );

						self.focus( target.eq(0) );

						// Open the menu
						self.openMenu( focused.children.menu );

					break;


				}

			});

		},


		/**
		 *
		 *	Build the dropdown
		 *
		 *	================================================================ */

		_build: function() {

			var self = this,
			    opt  = self.opt,
			    elem = self.elems,
			    cls  = self.cls;

			// Loop through each template
			$.each( self.tpl, function( name, tpl ) {

				// Create element
				elem[ name ] = $( tpl );

				// Add classes
				if ( cls[ name ] )
					elem[ name ].addClass( cls[ name ] );

			});

			// Build the structure
			elem.overlay.appendTo( elem.dropdown );
			elem.menuWrapper.appendTo( elem.dropdown );
			elem.menuContainer.appendTo( elem.menuWrapper );

			elem.toggleButton.prependTo( elem.dropdown );
			elem.toggleText.appendTo( elem.toggleButton );
			elem.toggleIcon.appendTo( elem.toggleButton );

			// Add toggle text
			elem.toggleText.text( opt.toggleText );

			// Add data
			elem.dropdown.data({
				uid:    self.inst.uid,
				target: self.$elem
			});

			// Add to page
			self.$elem.hide().after( elem.dropdown );

			// Add main menu
			self.addMenu();
			self.openMenu( false, true );

		},


		/**
		 *
		 *	Build a menu
		 *
		 *	================================================================ */

		_buildMenu: function( menu ) {

			var self  = this,
			    elems = {},
			    opt   = self.opt,
			    tpls  = self.tpl,
			    cls   = self.cls;

			// Create elements
			var names = [ 
				'menuObject', 'menuHeader', 'menuTitle', 'menuList', 'menuMask',
				'closeButton', 'closeText', 'closeIcon',
				'backButton', 'backText', 'backIcon'
			];

			$.each( names, function( i, name ) {

				// Create element
				if ( tpls[ name ] ) {

					elems[ name ] = $( tpls[ name ] );

					// Add classes
					if ( cls[ name ] )
						elems[ name ].addClass( cls[ name ] );

				}


			});

			// Build the menu
			var $menu = elems.menuObject.clone();

			elems.menuHeader.appendTo( $menu );
			elems.menuTitle.appendTo( elems.menuHeader );

			elems.closeButton.appendTo( elems.menuHeader );
			elems.closeIcon.appendTo( elems.closeButton );
			elems.closeText.appendTo( elems.closeButton );

			elems.backButton.prependTo( elems.menuHeader );
			elems.backIcon.appendTo( elems.backButton );
			elems.backText.appendTo( elems.backButton );

			elems.menuList.appendTo( $menu );
			elems.menuMask.appendTo( $menu );

			// Add ID
			$menu.data( 'dropdown-uid', menu.uid );

			// Add text
			elems.menuTitle.text( menu.title );

			elems.closeText.text( opt.closeText );
			elems.backText.text( opt.backText );

			// Add to dropdown
			self.elems.menuContainer.append( $menu );

			return $menu;

		},


		/**
		 *
		 *	Build an item
		 *
		 *	================================================================ */

		_buildItem: function( item ) {

			var self = this,
			    tpls = self.tpl,
			    cls  = self.cls;

			// Get the menu
			var menu = self.getMenu( item.menu );

			if ( !menu )
				return false;

			var $menu = menu.elem.children( '.' + self._cls.menuList );

			// Create elements
			var elems = {};

			var names = [ 
				'menuItem', 'menuLink', 'menuText',
				'menuDivider', 'menuLabel'
			];

			$.each( names, function( i, name ) {

				// Create element
				if ( tpls[ name ] ) {

					elems[ name ] = $( tpls[ name ] );

					// Add classes
					if ( cls[ name ] )
						elems[ name ].addClass( cls[ name ] );

				}


			});

			// Build the item
			var $item = elems.menuItem.clone();

			// Add classes
			if ( item.children.items ) {

				$item.addClass( cls.menuParent );

			}

			// Add ID
			$item.data( 'dropdown-uid', item.uid );

			// Add content
			var link = false;

			if ( item.html ) {

				if ( $item.children('a').length ) {

					elems.menuLink = $item.children('a');
					$item.children('a').addClass( cls.menuLink );

					link = true;

				} else {

					elems.menuLink.appendTo( $item );

				}

				elems.menuLink.html( item.html );

			} else {

				var $text = elems.menuText.clone();

				elems.menuLink.appendTo( $item );
				$text.appendTo( elems.menuLink );

				$text.html( item.text );

			}

			// Set URL
			if ( item.url )
				elems.menuLink.attr( 'href', item.url );

			// Add top divider
			if ( 'both' == item.divider || 'top' == item.divider )
				elems.menuDivider.clone().appendTo( $menu );

			// Add label
			if ( item.label ) {

				var $label  = elems.menuLabel.clone();
				var $labelT = elems.menuText.clone();

				$labelT.appendTo( $label );
				$labelT.html( item.label );

				$menu.append( $label );

			}

			// Add to menu
			$menu.append( $item );

			// Add bottom divider
			if ( 'both' == item.divider || 'bottom' == item.divider )
				elems.menuDivider.clone().appendTo( $menu );

			return $item;

		},


		/**
		 *
		 *	Populate the dropdown
		 *
		 *	================================================================ */

		_populate: function() {

			var self = this;

			// No items
			if ( !self.$elem.children().length )
				return false;

			// Get the element
			var tagName = self.$elem.prop( 'tagName' );

			// Form select
			if ( tagName == 'SELECT' ) {

				// Multiple?
				if ( self.$elem.attr( 'multiple' ) )
					self.opt.multi = true;

				return self._populateSelect();

			}

			// List
			if ( tagName == 'UL' || tagName == 'OL' ) {

				return self._populateList();

			}

			return false;

		},


		/**
		 *
		 *	Populate from form select
		 *
		 *	================================================================ */

		_populateSelect: function( $target ) {

			var self = this;

			// Get target
			var $parent = ( $target ? true : false );

			if ( !$target )
				$target = self.$elem;

			if ( !$target.length )
				return false;

			// Update multi option
			if ( null == self.opt.multi && $target.is('[multiple]') )
				self.opt.multi = true;

			// Get the items
			var self  = this,
			    items = [];

			$target.children().each(function() {

				var $this = $(this);

				var item = $.extend( true, {}, self.objects.item, {
					uid: self.id()
				}, $(this).data('dropdown') );

				// UID
				if ( $this.data('dropdown-uid') )
					item.uid = $this.data('dropdown-uid');

				// Nested
				if ( 'OPTGROUP' == $this.prop('tagName') ) {

					item.text = $this.prop('label');

					// Add children
					var children = self._populateSelect( $this );

					item.children.items = [];

					$.each( children, function( i, child ) {

						item.children.items.push( $.extend( {}, child, { parent: item.uid } ) );

					});

				} else {

					item.text  = $this.text();
					item.value = $this.attr('value');

					if ( !item.value && '0' !== item.value )
						item.value = item.text;

					// Selected
					if ( $this.is(':selected') )
						item.selected = true;

				}

				// Add to items
				items.push( item );

			});

			// Return child items
			if ( $parent )
				return items;

			// Add to dropdown
			self.addItems( items );

		},


		/**
		 *
		 *	Populate from list
		 *
		 *	================================================================ */

		_populateList: function( $target ) {

			var self = this;

			// Get target
			var $parent = ( $target ? true : false );

			if ( !$target )
				$target = self.$elem;

			if ( !$target.length )
				return false;

			// Get the items
			var self  = this,
			    items = [];

			$target.children().each(function() {

				var $this = $(this);

				var item = $.extend( true, {}, self.objects.item, {
					uid: self.id()
				}, $(this).data('dropdown') );

				// UID
				if ( $this.data('dropdown-uid') )
					item.uid = $this.data('dropdown-uid');

				// Nested
				if ( $this.children('ul, ol').length ) {

					item.text = $this.data('dropdown-text');

					if ( !item.text ) {

						if ( $this.children('a').length ) {

							item.text = $this.children('a').eq(0).text();

						} else {

							if ( $this.children('span').length )
								item.text = $this.children('span').eq(0).text();

						}

						if ( !item.text ) {

							item.text = $this.contents().filter(function(){
								return this.nodeType !== 1;
							}).text();

						}

					}

					// Add children
					var children = self._populateList( $this.children('ul, ol') );

					item.children.items = [];

					$.each( children, function( i, child ) {

						item.children.items.push( $.extend( {}, child, { parent: item.uid } ) );

					});

				} else {

					item.text  = $this.text();
					item.value = $this.data('dropdown-value');

					if ( $this.data('dropdown-text') )
						item.text = $this.data('dropdown-text');

					if ( !item.value && '0' !== item.value )
						item.value = item.text;

					// HTML
					if ( $this.children().length ) {

						item.html = $this.html();

						// URL
						if ( $this.children('a').length ) {

							item.url = $this.children('a').eq(0).attr('href');

						}

					}

					// URL
					if ( $this.data('dropdown-url') )
						item.url = $this.data('dropdown-url');

					// Selected
					if ( $this.data('dropdown-selected') || $this.hasClass( self._cls.selected ) )
						item.selected = true;

				}

				// Add to items
				items.push( item );

			});

			// Return child items
			if ( $parent )
				return items;

			// Add to dropdown
			self.addItems( items );

		},


		/**
		 *
		 *	Fired before the dropdown is opened
		 *
		 *	================================================================ */

		_beforeOpen: function() {

			var self = this,
			    opt  = self.opt,
			    inst = self.inst,
			    elem = self.elems;

			// Update plugin
			inst.opening   = true;
			inst.animating = true;

			// Update dropdown
			elem.dropdown.addClass( self.cls.opening );
			elem.dropdown.addClass( self.cls.animating );

			// Resize
			var resize = self.resize( false, true );

			// Reposition
			if ( opt.collision ) {

				// Vertical
				if ( resize.collision.position.y == 'top' ) {

					elem.dropdown.removeClass( self.cls.below );
					elem.dropdown.addClass( self.cls.above );

					self.inst.above = true;

				} else {

					elem.dropdown.removeClass( self.cls.above );
					elem.dropdown.addClass( self.cls.below );

					self.inst.above = false;

				}

			} else {

				if ( !elem.dropdown.hasClass( '.' + self._cls.below ) && !elem.dropdown.hasClass( '.' + self._cls.above ) )
					elem.dropdown.addClass( self.cls.below );

			}

			// Scroll to selected item
			if ( opt.scrollSelected )
				self._scrollSelected( false, resize );

			// Event
			self.$elem.trigger( self.name + '.open:before', this );

		},


		/**
		 *
		 *	Fired after the dropdown is opened
		 *
		 *	================================================================ */

		_afterOpen: function() {

			var self = this,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.open      = true;
			inst.opening   = false;
			inst.animating = false;

			// Update dropdown
			elem.dropdown.addClass( cls.open );
			elem.dropdown.removeClass( cls.opening );
			elem.dropdown.removeClass( cls.animating );

			// Event
			self.$elem.trigger( self.name + '.open', this );

		},


		/**
		 *
		 *	Fired before the dropdown is closed
		 *
		 *	================================================================ */

		_beforeClose: function() {

			var self = this,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.closing   = true;
			inst.animating = true;

			// Update dropdown
			elem.dropdown.addClass( cls.animating );
			elem.dropdown.addClass( cls.closing );

			// Defocus
			self.focus( false );

			// Event
			self.$elem.trigger( self.name + '.close:before', this );

		},


		/**
		 *
		 *	Fired after the dropdown is closed
		 *
		 *	================================================================ */

		_afterClose: function() {

			var self = this,
			    opt  = self.opt,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.open      = false;
			inst.closing   = false;
			inst.animating = false;
			inst.above     = false;

			// Update dropdown
			elem.dropdown.removeClass( cls.animating );
			elem.dropdown.removeClass( cls.closing );
			elem.dropdown.removeClass( cls.open );

			// Reset
			if ( opt.closeReset )
				self.reset();

			// Event
			self.$elem.trigger( self.name + '.close', this );

		},


		/**
		 *
		 *	Fired before a menu is opened
		 *
		 *	================================================================ */

		_beforeOpenMenu: function( menu, current ) {

			var self = this,
			    opt  = self.opt,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.opening   = menu.uid;
			inst.animating = true;

			// Update dropdown
			elem.dropdown.addClass( cls.animating );

			// Update menu
			menu.elem.addClass( cls.animating );

			// Update current menu
			if ( current )
				current.elem.addClass( cls.animating );

			// Resize
			var resize = self.resize( menu.uid );

			// Scroll to selected item
			if ( opt.scrollSelected )
				self._scrollSelected( menu.uid, resize );

			// Event
			self.$elem.trigger( self.name + '.open.menu:before', [ menu, current, this ] );

		},


		/**
		 *
		 *	Fired after a menu is opened
		 *
		 *	================================================================ */

		_afterOpenMenu: function( menu, current ) {

			var self = this,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.opening   = false;
			inst.animating = false;
			inst.menu      = menu.uid;

			// Update dropdown
			elem.dropdown.removeClass( cls.animating );

			// Update menu
			menu.elem.addClass( cls.menuOpen );
			menu.elem.removeClass( cls.animating );

			// Update current menu
			if ( current ) {

				current.elem.removeClass( cls.menuOpen );
				current.elem.removeClass( cls.animating );

			}

			// Event
			self.$elem.trigger( self.name + '.open.menu', [ menu, current, this ] );

		},


		/**
		 *
		 *	Fired before a menu is closed
		 *
		 *	================================================================ */

		_beforeCloseMenu: function( menu, target ) {

			var self = this,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.closing   = menu.uid;
			inst.animating = true;

			// Update dropdown
			elem.dropdown.addClass( cls.animating );

			// Update menu
			menu.elem.addClass( cls.animating );

			// Update target menu
			if ( target ) {

				target.elem.addClass( cls.animating );

				// Resize
				self.resize( target.uid );

			}

			// Event
			self.$elem.trigger( self.name + '.close.menu:before', [ menu, target, this ] );

		},


		/**
		 *
		 *	Fired after a menu is closed
		 *
		 *	================================================================ */

		_afterCloseMenu: function( menu, target ) {

			var self = this,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.closing   = false;
			inst.animating = false;
			inst.menu      = ( target ? target.uid : false );

			// Update dropdown
			elem.dropdown.removeClass( cls.animating );

			// Update menu
			menu.elem.removeClass( cls.menuOpen );
			menu.elem.removeClass( cls.animating );

			// Update target menu
			if ( target ) {

				target.elem.addClass( cls.menuOpen );
				target.elem.removeClass( cls.animating );

			}

			// Event
			self.$elem.trigger( self.name + '.close.menu', [ menu, target, this ] );

		},


		/**
		 *
		 *	Fired before the dropdown is resized
		 *
		 *	================================================================ */

		_beforeResize: function( menu ) {

			var self = this,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.resizing = true;

			// Update dropdown
			elem.dropdown.addClass( cls.resizing );

			// Event
			self.$elem.trigger( self.name + '.resize:before', [ menu, this ] );

		},


		/**
		 *
		 *	Fired after the dropdown is resized
		 *
		 *	================================================================ */

		_afterResize: function( menu ) {

			var self = this,
			    inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update plugin
			inst.resizing = false;

			// Update dropdown
			elem.dropdown.removeClass( cls.resizing );

			// Event
			self.$elem.trigger( self.name + '.resize', [ menu, this ] );

		},


		/**
		 *
		 *	Fired before an item is selected
		 *
		 *	================================================================ */

		_beforeSelect: function( item, cur ) {

			var self = this;

			// Event
			self.$elem.trigger( self.name + '.select:before', [ item, cur, this ] );

		},


		/**
		 *
		 *	Fired after an item is selected
		 *
		 *	================================================================ */

		_afterSelect: function( item, prev ) {

			var self = this;

			// Update <select /> value
			if ( 'SELECT' == self.$elem.prop( 'tagName' ) )
				self.$elem.val( self.inst.value );

			// Event
			self.$elem.trigger( self.name + '.select', [ item, prev, this ] );

		},


		/**
		 *
		 *	Fired before an item is deselected
		 *
		 *	================================================================ */

		_beforeDeselect: function( item ) {

			var self = this;

			// Event
			self.$elem.trigger( self.name + '.deselect:before', [ item, this ] );

		},


		/**
		 *
		 *	Fired after an item is deselected
		 *
		 *	================================================================ */

		_afterDeselect: function( item ) {

			var self = this;

			// Update <select /> value
			if ( 'SELECT' == self.$elem.prop( 'tagName' ) )
				self.$elem.val( self.inst.value );

			// Event
			self.$elem.trigger( self.name + '.deselect', [ item, this ] );

		},


		/**
		 *
		 *	Called before the dropdown is resized
		 *
		 *	================================================================ */

		_beforeReset: function( clear, target, current ) {

			var self = this;
			var inst = self.inst;

			// Update state
			inst.resetting = true;

			// Event
			self.$elem.trigger( self.name + '.reset:before', [ clear, target, current, self ] );

		},


		/**
		 *
		 *	Called after the dropdown is reset
		 *
		 *	================================================================ */

		_afterReset: function( clear, target, current ) {

			var self = this;
			var inst = self.inst,
			    elem = self.elems,
			    cls  = self.cls;

			// Update state
			inst.resetting = false;
			inst.opening   = false;
			inst.closing   = false;
			inst.animating = false;

			current.open   = false;
			target.open    = true;

			// Update plugin
			inst.menu = target.uid;

			// Update classes
			target.elem.removeClass( cls.menuOpening );
			current.elem.removeClass( cls.menuClosing );

			current.elem.removeClass( cls.menuOpen );
			target.elem.addClass( cls.menuOpen );

			// Update positions
			elem.menuWrapper.css({ x: 0, y: 0 });

			current.elem.css({ x: '-100%' });
			target.elem.css({ x: 0 });

			// Reset dimensions
			elem.menuWrapper.css({ height: '' });
			current.elem.find( '.' + cls.core.menuList ).eq(0).css({ height: '' });

			// Event
			self.$elem.trigger( self.name + '.reset', [ clear, target, current, self ] );

		},

		/**
		 *
		 *	Auto resize
		 *
		 *	================================================================ */

		_autoResize: function() {

			var self = this;
			var inst = self.inst;

			if ( inst.open )
				self.resize( false, true );

		},


		/**
		 *
		 *	Scroll to selected item
		 *
		 *	================================================================ */

		_scrollSelected: function( menu, resize ) {

			var self = this;
			var inst = self.inst,
			    opt  = self.opt,
				elem = self.elems,
				cls  = self.cls;

			// Get the menu
			menu = self.getMenu( menu );

			// No menu, bail
			if ( !menu )
				return;

			// Show the dropdown if needed
			if ( !inst.open )
				elem.menuWrapper.show().css({ opacity: 0 });

			// Show the menu if needed
			if ( !menu.open )
				menu.elem.show().css({ opacity: 0 });

			// Get list
			var $list = menu.elem.children( '.' + cls.core.menuList ).eq(0);

			// Get selected position
			var selectedOffset = 0;

			var $selected = menu.elem.find( '.' + cls.core.selected ).eq(0);

			if ( $selected.length ) {

				selectedOffset = $selected.position().top;

				if ( selectedOffset < 0 || selectedOffset > resize.collision.list.height ) {

					selectedOffset = selectedOffset + $list.scrollTop();

				}

				selectedOffset = selectedOffset - ( resize.collision.menu.height - resize.collision.list.height );

			}

			// Scroll
			$list.animate( { scrollTop: selectedOffset }, 1 );

			// Reset
			if ( !inst.open )
				elem.menuWrapper.css({ display: '', opacity: '' });

			if ( !menu.open )
				menu.elem.css({ display: '', opacity: '' });

		},


		/**
		 *
		 *	Merge classes
		 *
		 *	================================================================ */

		_mergeClasses: function() {

			var self = this;
			var user = self.opt.classes;
			var core = $.extend( true, {}, self._cls );

			var cls = {};

			$.each( core, function( i, coreClass ) {

				// Add the core class
				if ( !cls.core )
					cls.core = {};

				cls.core[i] = coreClass;

				var classStr = coreClass;

				// Check for user class
				if ( user[i] ) {

					classStr += ' ';
					classStr += user[i];

				}

				// Add to object
				cls[i] = classStr;

			});

			return cls;

		},


		/**
		 *
		 *	Check for transition support
		 *
		 *	================================================================ */

		_supportsTransitions: function() {

			var s = document.createElement('p').style,
				supportsTransitions = 'transition' in s ||
				'WebkitTransition' in s ||
				'MozTransition' in s ||
				'msTransition' in s ||
				'OTransition' in s;

			return supportsTransitions;

		}
		

	} );


	/**
	 *
	 *	Objects
	 *
	 *	================================================================ */

	var objects = {

		// Menu
		menu: {

			id:  null,
			uid: null,

			parent: false,

			items: null

		},

		// Item
		item: {

			id:  null,
			uid: null,

			text:  '',
			value: null,
			url:   null,
			html:  null,

			menu:   false,
			parent: false,

			label: '',
			divider: null,

			children: {
				menu:  false,
				title: '',
				items: false
			},

			selected:   false,
			selectable: true

		},

		// Resize
		resize: {

			// Viewport
			viewport: {
				width: 0,
				height: 0
			},

			// Wrapper
			wrapper: {

				width: 0,
				height: 0,

				// Difference
				diff: {
					width: 0,
					height: 0
				}

			},

			// Menu
			menu: {
				width: 0,
				height: 0
			},

			// List
			list: {
				width: 0,
				height: 0
			}

		},

		// Resize collision values
		collision: {

			width: 0,
			height: 0,

			// Scroll amount
			scrolled: {
				x: 0,
				y: 0
			},

			// Position
			position: {
				x: 0,
				y: 0
			},

			// Offset
			offset: {
				x: 0,
				y: 0
			},

			// Available space
			space: {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0
			}

		}

	};


	/**
	 *
	 *	Templates
	 *
	 *	================================================================ */

	var templates = {

		// Dropdown
		dropdown:      '<div />',
		overlay:       '<div />',

		// Menu
		menuWrapper:   '<nav />',
		menuContainer: '<div />',
		menuObject:    '<div />',
		menuMask:      '<div />',

		menuHeader:    '<header />',
		menuTitle:     '<h5 />',

		menuList:      '<ul role="menu" />',
		menuItem:      '<li />',
		menuLink:      '<a href="#" role="menuitem" />',
		menuText:      '<span />',

		menuDivider:   '<li role="presentation" />',
		menuLabel:     '<li role="presentation" />',

		// Toggle
		toggleButton:  '<a href="#" />',
		toggleText:    '<div />',
		toggleIcon:    '<i />',

		// Close
		closeButton:   '<a href="#" />',
		closeText:     '<span />',
		closeIcon:     '<i />',

		// Back
		backButton:    '<a href="#" />',
		backText:      '<span />',
		backIcon:      '<i />'

	};


	/**
	 *
	 *	Classes
	 *
	 *	================================================================ */

	var classes = {

		// Dropdown
		dropdown:		'dropdown',
		overlay:		'dropdown-overlay',

		// Menu
		menuMain:		'dropdown-menu-main',
		menuOpen:		'dropdown-menu-open',

		menuWrapper:	'dropdown-menu-wrapper',
		menuContainer:	'dropdown-menu-container',
		menuObject:		'dropdown-menu',
		menuMask:		'dropdown-mask',

		menuHeader: 	'dropdown-header',
		menuTitle:		'dropdown-title',

		menuList:		'dropdown-list',
		menuItem:		'dropdown-item',
		menuLink:		'dropdown-link',
		menuText:		'dropdown-text',
		menuParent:		'dropdown-parent',

		menuDivider:	'dropdown-divider',
		menuLabel:		'dropdown-label',

		// Toggle
		toggleButton:	'dropdown-toggle',
		toggleText:		'dropdown-text',
		toggleIcon:		'dropdown-icon',

		// Close
		closeButton:	'dropdown-close',
		closeText:		'dropdown-text',
		closeIcon:		'dropdown-icon',

		// Back
		backButton:		'dropdown-back',
		backText:		'dropdown-text',
		backIcon:		'dropdown-icon',

		// States
		open:			'dropdown-open',
		opening:		'dropdown-opening',
		closing:		'dropdown-closing',
		focused:		'dropdown-focused',
		animating:		'dropdown-animating',
		resizing:		'dropdown-resizing',
		selected:		'dropdown-selected',
		selectedParent:	'dropdown-parent-selected',

		// Position
		above:			'dropdown-above',
		below:			'dropdown-below'

	};


	/**
	 *
	 *	Defaults
	 *
	 *	================================================================ */

	var defaults = {

		// Animation
		speed: 200,
		easing: 'easeInOutCirc',

		// Positioning
		margin:         20,
		collision:      true,
		autoResize:     200,
		scrollSelected: true,

		// Keyboard navigation
		keyboard: true,

		// Nesting
		nested: true,
		selectParents: false,

		// Multiple
		multi:     false,
		maxSelect: false,
		minSelect: false,

		// Links
		selectLinks: false,
		followLinks: true,

		// Close
		closeText:     'Close',
		autoClose:     true,
		autoCloseMax:  true,
		autoCloseLink: true,
		closeReset:    true,

		// Back
		backText: 'Back',

		// Toggle
		toggleText:    'Please select',
		autoToggle:     true,
		autoToggleLink: false,
		autoToggleHTML: false,

		// Title
		titleText: 'Please select',
		autoTitle: true,

		// Custom classes
		classes: {},

		// Custom templates
		templates: {}

	};


	/**
	 *
	 *	Wrapper
	 *
	 *	================================================================ */

	$.fn.dropdown = function( options ) {

		var args = arguments;

		if ( options === undefined || typeof options === 'object' ) {

			return this.each( function() {

				if ( !$.data( this, 'plugin.dropdown' ) ) {

					$.data( this, 'plugin.dropdown', new Dropdown( this, options ) );
				}

			} );

		} else if ( typeof options === 'string' && options[0] !== '_' && options !== 'init' ) {

			var returns;

			this.each( function() {

				var instance = $.data( this, 'plugin.dropdown' );

				// Allow access to public methods
				if ( instance instanceof dropdown && typeof instance[ options ] === 'function' ) {
					returns = instance[ options ].apply( instance, Array.prototype.slice.call( args, 1 ) );
				}

				// Allow instances to be destroyed via the 'destroy' method
				if ( options === 'destroy' ) {
					$.data( this, 'plugin.dropdown', null );
				}

			});

			return returns !== undefined ? returns : this;

		}

	};


})( jQuery, window, document );


/*!
* jQuery Transit - CSS3 transitions and transformations
* (c) 2011-2014 Rico Sta. Cruz
* MIT Licensed.
*
* http://ricostacruz.com/jquery.transit
* http://github.com/rstacruz/jquery.transit
*/

;(function(t,e){if(typeof define==="function"&&define.amd){define(["jquery"],e)}else if(typeof exports==="object"){module.exports=e(require("jquery"))}else{e(t.jQuery)}})(this,function(t){t.transit={version:"0.9.12",propertyMap:{marginLeft:"margin",marginRight:"margin",marginBottom:"margin",marginTop:"margin",paddingLeft:"padding",paddingRight:"padding",paddingBottom:"padding",paddingTop:"padding"},enabled:true,useTransitionEnd:false};var e=document.createElement("div");var n={};function i(t){if(t in e.style)return t;var n=["Moz","Webkit","O","ms"];var i=t.charAt(0).toUpperCase()+t.substr(1);for(var r=0;r<n.length;++r){var s=n[r]+i;if(s in e.style){return s}}}function r(){e.style[n.transform]="";e.style[n.transform]="rotateY(90deg)";return e.style[n.transform]!==""}var s=navigator.userAgent.toLowerCase().indexOf("chrome")>-1;n.transition=i("transition");n.transitionDelay=i("transitionDelay");n.transform=i("transform");n.transformOrigin=i("transformOrigin");n.filter=i("Filter");n.transform3d=r();var a={transition:"transitionend",MozTransition:"transitionend",OTransition:"oTransitionEnd",WebkitTransition:"webkitTransitionEnd",msTransition:"MSTransitionEnd"};var o=n.transitionEnd=a[n.transition]||null;for(var u in n){if(n.hasOwnProperty(u)&&typeof t.support[u]==="undefined"){t.support[u]=n[u]}}e=null;t.cssEase={_default:"ease","in":"ease-in",out:"ease-out","in-out":"ease-in-out",snap:"cubic-bezier(0,1,.5,1)",easeInCubic:"cubic-bezier(.550,.055,.675,.190)",easeOutCubic:"cubic-bezier(.215,.61,.355,1)",easeInOutCubic:"cubic-bezier(.645,.045,.355,1)",easeInCirc:"cubic-bezier(.6,.04,.98,.335)",easeOutCirc:"cubic-bezier(.075,.82,.165,1)",easeInOutCirc:"cubic-bezier(.785,.135,.15,.86)",easeInExpo:"cubic-bezier(.95,.05,.795,.035)",easeOutExpo:"cubic-bezier(.19,1,.22,1)",easeInOutExpo:"cubic-bezier(1,0,0,1)",easeInQuad:"cubic-bezier(.55,.085,.68,.53)",easeOutQuad:"cubic-bezier(.25,.46,.45,.94)",easeInOutQuad:"cubic-bezier(.455,.03,.515,.955)",easeInQuart:"cubic-bezier(.895,.03,.685,.22)",easeOutQuart:"cubic-bezier(.165,.84,.44,1)",easeInOutQuart:"cubic-bezier(.77,0,.175,1)",easeInQuint:"cubic-bezier(.755,.05,.855,.06)",easeOutQuint:"cubic-bezier(.23,1,.32,1)",easeInOutQuint:"cubic-bezier(.86,0,.07,1)",easeInSine:"cubic-bezier(.47,0,.745,.715)",easeOutSine:"cubic-bezier(.39,.575,.565,1)",easeInOutSine:"cubic-bezier(.445,.05,.55,.95)",easeInBack:"cubic-bezier(.6,-.28,.735,.045)",easeOutBack:"cubic-bezier(.175, .885,.32,1.275)",easeInOutBack:"cubic-bezier(.68,-.55,.265,1.55)"};t.cssHooks["transit:transform"]={get:function(e){return t(e).data("transform")||new f},set:function(e,i){var r=i;if(!(r instanceof f)){r=new f(r)}if(n.transform==="WebkitTransform"&&!s){e.style[n.transform]=r.toString(true)}else{e.style[n.transform]=r.toString()}t(e).data("transform",r)}};t.cssHooks.transform={set:t.cssHooks["transit:transform"].set};t.cssHooks.filter={get:function(t){return t.style[n.filter]},set:function(t,e){t.style[n.filter]=e}};if(t.fn.jquery<"1.8"){t.cssHooks.transformOrigin={get:function(t){return t.style[n.transformOrigin]},set:function(t,e){t.style[n.transformOrigin]=e}};t.cssHooks.transition={get:function(t){return t.style[n.transition]},set:function(t,e){t.style[n.transition]=e}}}p("scale");p("scaleX");p("scaleY");p("translate");p("rotate");p("rotateX");p("rotateY");p("rotate3d");p("perspective");p("skewX");p("skewY");p("x",true);p("y",true);function f(t){if(typeof t==="string"){this.parse(t)}return this}f.prototype={setFromString:function(t,e){var n=typeof e==="string"?e.split(","):e.constructor===Array?e:[e];n.unshift(t);f.prototype.set.apply(this,n)},set:function(t){var e=Array.prototype.slice.apply(arguments,[1]);if(this.setter[t]){this.setter[t].apply(this,e)}else{this[t]=e.join(",")}},get:function(t){if(this.getter[t]){return this.getter[t].apply(this)}else{return this[t]||0}},setter:{rotate:function(t){this.rotate=b(t,"deg")},rotateX:function(t){this.rotateX=b(t,"deg")},rotateY:function(t){this.rotateY=b(t,"deg")},scale:function(t,e){if(e===undefined){e=t}this.scale=t+","+e},skewX:function(t){this.skewX=b(t,"deg")},skewY:function(t){this.skewY=b(t,"deg")},perspective:function(t){this.perspective=b(t,"px")},x:function(t){this.set("translate",t,null)},y:function(t){this.set("translate",null,t)},translate:function(t,e){if(this._translateX===undefined){this._translateX=0}if(this._translateY===undefined){this._translateY=0}if(t!==null&&t!==undefined){this._translateX=b(t,"px")}if(e!==null&&e!==undefined){this._translateY=b(e,"px")}this.translate=this._translateX+","+this._translateY}},getter:{x:function(){return this._translateX||0},y:function(){return this._translateY||0},scale:function(){var t=(this.scale||"1,1").split(",");if(t[0]){t[0]=parseFloat(t[0])}if(t[1]){t[1]=parseFloat(t[1])}return t[0]===t[1]?t[0]:t},rotate3d:function(){var t=(this.rotate3d||"0,0,0,0deg").split(",");for(var e=0;e<=3;++e){if(t[e]){t[e]=parseFloat(t[e])}}if(t[3]){t[3]=b(t[3],"deg")}return t}},parse:function(t){var e=this;t.replace(/([a-zA-Z0-9]+)\((.*?)\)/g,function(t,n,i){e.setFromString(n,i)})},toString:function(t){var e=[];for(var i in this){if(this.hasOwnProperty(i)){if(!n.transform3d&&(i==="rotateX"||i==="rotateY"||i==="perspective"||i==="transformOrigin")){continue}if(i[0]!=="_"){if(t&&i==="scale"){e.push(i+"3d("+this[i]+",1)")}else if(t&&i==="translate"){e.push(i+"3d("+this[i]+",0)")}else{e.push(i+"("+this[i]+")")}}}}return e.join(" ")}};function c(t,e,n){if(e===true){t.queue(n)}else if(e){t.queue(e,n)}else{t.each(function(){n.call(this)})}}function l(e){var i=[];t.each(e,function(e){e=t.camelCase(e);e=t.transit.propertyMap[e]||t.cssProps[e]||e;e=h(e);if(n[e])e=h(n[e]);if(t.inArray(e,i)===-1){i.push(e)}});return i}function d(e,n,i,r){var s=l(e);if(t.cssEase[i]){i=t.cssEase[i]}var a=""+y(n)+" "+i;if(parseInt(r,10)>0){a+=" "+y(r)}var o=[];t.each(s,function(t,e){o.push(e+" "+a)});return o.join(", ")}t.fn.transition=t.fn.transit=function(e,i,r,s){var a=this;var u=0;var f=true;var l=t.extend(true,{},e);if(typeof i==="function"){s=i;i=undefined}if(typeof i==="object"){r=i.easing;u=i.delay||0;f=typeof i.queue==="undefined"?true:i.queue;s=i.complete;i=i.duration}if(typeof r==="function"){s=r;r=undefined}if(typeof l.easing!=="undefined"){r=l.easing;delete l.easing}if(typeof l.duration!=="undefined"){i=l.duration;delete l.duration}if(typeof l.complete!=="undefined"){s=l.complete;delete l.complete}if(typeof l.queue!=="undefined"){f=l.queue;delete l.queue}if(typeof l.delay!=="undefined"){u=l.delay;delete l.delay}if(typeof i==="undefined"){i=t.fx.speeds._default}if(typeof r==="undefined"){r=t.cssEase._default}i=y(i);var p=d(l,i,r,u);var h=t.transit.enabled&&n.transition;var b=h?parseInt(i,10)+parseInt(u,10):0;if(b===0){var g=function(t){a.css(l);if(s){s.apply(a)}if(t){t()}};c(a,f,g);return a}var m={};var v=function(e){var i=false;var r=function(){if(i){a.unbind(o,r)}if(b>0){a.each(function(){this.style[n.transition]=m[this]||null})}if(typeof s==="function"){s.apply(a)}if(typeof e==="function"){e()}};if(b>0&&o&&t.transit.useTransitionEnd){i=true;a.bind(o,r)}else{window.setTimeout(r,b)}a.each(function(){if(b>0){this.style[n.transition]=p}t(this).css(l)})};var z=function(t){this.offsetWidth;v(t)};c(a,f,z);return this};function p(e,i){if(!i){t.cssNumber[e]=true}t.transit.propertyMap[e]=n.transform;t.cssHooks[e]={get:function(n){var i=t(n).css("transit:transform");return i.get(e)},set:function(n,i){var r=t(n).css("transit:transform");r.setFromString(e,i);t(n).css({"transit:transform":r})}}}function h(t){return t.replace(/([A-Z])/g,function(t){return"-"+t.toLowerCase()})}function b(t,e){if(typeof t==="string"&&!t.match(/^[\-0-9\.]+$/)){return t}else{return""+t+e}}function y(e){var n=e;if(typeof n==="string"&&!n.match(/^[\-0-9\.]+/)){n=t.fx.speeds[n]||t.fx.speeds._default}return b(n,"ms")}t.transit.getTransitionValue=d;return t});