/*
 * Copyright (C) 2014 Kaj Magnus Lindberg (born 1979)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// <reference path="../../typedefs/react/react.d.ts" />
/// <reference path="../ReactStore.ts" />
/// <reference path="../login/login-dialog.ts" />
/// <reference path="../page-tools/page-tools.ts" />
/// <reference path="../utils/page-scroll-mixin.ts" />
/// <reference path="name-login-btns.ts" />
/// <reference path="../../typedefs/keymaster/keymaster.d.ts" />

//------------------------------------------------------------------------------
   module debiki2.reactelements {
//------------------------------------------------------------------------------

var keymaster: Keymaster = window['keymaster'];
var d = { i: debiki.internal, u: debiki.v0.util };
var r = React.DOM;
var reactCreateFactory = React['createFactory'];
var ReactBootstrap: any = window['ReactBootstrap'];
var Button = reactCreateFactory(ReactBootstrap.Button);
var DropdownButton = reactCreateFactory(ReactBootstrap.DropdownButton);
var MenuItem = reactCreateFactory(ReactBootstrap.MenuItem);


export var TopBar = createComponent({
  mixins: [debiki2.StoreListenerMixin, debiki2.utils.PageScrollMixin],

  getInitialState: function() {
    return {
      store: debiki2.ReactStore.allData(),
      showSearchForm: false,
      fixed: false,
      initialOffsetTop: -1,
    };
  },

  componentDidMount: function() {
    var rect = this.getDOMNode().getBoundingClientRect();
    this.setState({
      initialOffsetTop: rect.top + window.pageYOffset,
      initialHeight: rect.bottom - rect.top,
    });
  },

  onChange: function() {
    this.setState({
      store: debiki2.ReactStore.allData()
    });
  },

  onScroll: function(event) {
    var node = this.getDOMNode();
    if (!this.state.fixed) {
      if (node.getBoundingClientRect().top < -6) {
        this.setState({ fixed: true });
      }
    }
    else {
      if (window.pageYOffset < this.state.initialOffsetTop) {
        this.setState({ fixed: false });
      }
    }
  },

  onLoginClick: function() {
    // COULD call new fn ReactActions.login() instead?
    login.loginDialog.open(this.props.purpose || 'LoginToLogin');
  },

  onLogoutClick: function() {
    // COULD let ReactActions call Server instead.
    debiki2.Server.logout(debiki2.ReactActions.logout);
  },

  goToUserPage: function() {
    goToUserPage(this.state.store.user.userId);
  },

  goToAdminPage: function() {
    sessionStorage.setItem('returnToUrl', window.location.toString());
    window.location.assign(d.i.serverOrigin + '/-/admin/');
  },

  showTools: function() {
    pagetools.pageToolsDialog.open();
  },

  closeSearchForm: function() {
    this.setState({
      showSearchForm: false
    });
  },

  onSearchClick: function() {
    this.setState({
      showSearchForm: !this.state.showSearchForm
    });
  },

  render: function() {
    var store: Store = this.state.store;
    var user: User = store.user;

    // Don't show all these buttons on a homepage / landing page.
    if (store.pageRole === PageRole.HomePage)
      return null;

    var loggedInAs = !user.isLoggedIn ? null :
        r.a({ className: 'dw-name', onClick: this.goToUserPage }, user.username || user.fullName);

    var loginButton = user.isLoggedIn ? null : 
        Button({ className: 'dw-login', onClick: this.onLoginClick },
            r.span({ className: 'icon-user' }, 'Log In'));

    var logoutButton = !user.isLoggedIn ? null : 
        Button({ className: 'dw-logout', onClick: this.onLogoutClick }, 'Log Out');

    var adminButton = !isStaff(user) ? null :
        Button({ className: 'dw-admin', onClick: this.goToAdminPage },
          r.a({ className: 'icon-settings' }, 'Admin'));

    var toolsButton = !isStaff(user) || pagetools.pageToolsDialog.isEmpty() ? null :
        Button({ className: 'dw-a-tools', onClick: this.showTools },
          r.a({ className: 'icon-wrench' }, 'Tools'));

    var searchButton =
        null;
    /* Hide for now, search broken, after I rewrote from dw1_posts to dw2_posts.
        Button({ className: 'dw-search', onClick: this.onSearchClick },
            r.span({ className: 'icon-search' }));
    */

    var menuButton =
        DropdownButton({ title: r.span({ className: 'icon-menu' }), pullRight: true,
              className: 'dw-menu' },
            // Links in dropdown MenuItem:s no longer work after I upgraded react-bootstrap,
            // so add onClick. Try to remove ... later? Year 2016?
            MenuItem({ onClick: () => window.location.assign('/-/terms-of-use') },
              r.a({ href: '/-/terms-of-use' }, 'Terms and Privacy')));

    var searchForm = !this.state.showSearchForm ? null :
        SearchForm({ onClose: this.closeSearchForm });

    var pageTitle;
    if (store.pageRole === PageRole.Forum) {
      var titleProps: any = _.clone(store);
      titleProps.hideTitleEditButton = this.state.fixed;
      pageTitle =
          r.div({ className: 'dw-topbar-title' }, Title(titleProps));
    }

    var topbar =
      r.div({ id: 'dw-react-topbar', className: 'clearfix' },
        pageTitle,
        r.div({ id: 'dw-topbar-btns' },
          loggedInAs,
          loginButton,
          logoutButton,
          adminButton,
          toolsButton,
          searchButton,
          menuButton),
        searchForm);

    if (!this.state.fixed) {
      return topbar;
    }
    else {
      return (
        r.div({},
          // The placeholder prevents the page height from suddenly changing when the
          // topbar becomes fixed and thus is removed from the flow.
          r.div({ style: { height: this.state.initialHeight }}),
          r.div({ className: 'dw-fixed-topbar-wrap' },
            r.div({ className: 'container' },
              topbar))));
    }
  }
});


var SearchForm = createComponent({
  componentDidMount: function() {
    keymaster('escape', this.props.onClose);
    $(this.refs.input.getDOMNode()).focus();
  },

  componentWillUnmount: function() {
    keymaster.unbind('escape', this.props.onClose);
  },

  search: function() {
    $(this.refs.xsrfToken.getDOMNode()).val($['cookie']('XSRF-TOKEN'));
    $(this.refs.form.getDOMNode()).submit();
  },

  render: function() {
    return (
        r.div({ className: 'dw-lower-right-corner' },
          r.form({ id: 'dw-search-form', ref: 'form', className: 'debiki-search-form form-search',
              method: 'post', acceptCharset: 'UTF-8', action: '/-/search/site',
              onSubmit: this.search },
            r.input({ type: 'hidden', ref: 'xsrfToken', name: 'dw-fi-xsrf' }),
            r.input({ type: 'text', tabindex: '1', placeholder: 'Text to search for',
                ref: 'input', className: 'input-medium search-query', name: 'searchPhrase' }))));
  }
});

//------------------------------------------------------------------------------
   }
//------------------------------------------------------------------------------
// vim: fdm=marker et ts=2 sw=2 tw=0 fo=tcqwn list
