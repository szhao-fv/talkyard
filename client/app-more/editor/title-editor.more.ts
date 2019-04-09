/*
 * Copyright (c) 2015-2016 Kaj Magnus Lindberg
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

/// <reference path="../more-prelude.more.ts" />
/// <reference path="../react-bootstrap-old/Input.more.ts" />

//------------------------------------------------------------------------------
   namespace debiki2.titleeditor {
//------------------------------------------------------------------------------

const r = ReactDOMFactories;
const SelectCategoryDropdown = editor.SelectCategoryDropdown;
const ModalDropdownButton = utils.ModalDropdownButton;


export const TitleEditor = createComponent({
  displayName: 'TitleEditor',

  getInitialState: function() {
    const store: Store = this.props.store;
    const page: Page = store.currentPage;
    return {
      showComplicated: false,
      isSaving: false,
      pageRole: page.pageRole,
      categoryId: page.categoryId,
    };
  },

  componentDidMount: function() {
    Server.loadEditorAndMoreBundles(() => {
      if (this.isGone) return;
      this.setState({ editorScriptsLoaded: true });
    });
  },

  componentWillUnmount: function() {
    this.isGone = true;
  },

  showLayoutAndSettings: function() {
    this.setState({ showLayoutAndSettings: true });
  },

  showComplicated: function() {
    const store: Store = this.props.store;
    const page: Page = store.currentPage;
    const pagePath: PagePath = page.pagePath;
    this.setState({
      showComplicated: true,
      folder: pagePath.folder,
      slug: pagePath.slug,
      showId: pagePath.showId,
      htmlTagCssClasses: page.pageHtmlTagCssClasses || '',
      htmlHeadTitle: page.pageHtmlHeadTitle,
      htmlHeadDescription: page.pageHtmlHeadDescription,
    });
  },

  onTitleChanged: function(event) {
    const store: Store = this.props.store;
    const page: Page = store.currentPage;
    var idWillBeInUrlPath = this.refs.showIdInput ?
        this.refs.showIdInput.getChecked() : page.pagePath.showId; // isIdShownInUrl();
    if (!idWillBeInUrlPath) {
      // Then don't automatically change the slug to match the title, because links are more fragile
      // when no id included in the url, and might break if we change the slug. Also, the slug is likely
      // to be something like 'about' (for http://server/about) which we want to keep unchanged.
      return;
    }
    var editedTitle = event.target.value;
    var slugMatchingTitle = window['debikiSlugify'](editedTitle);
    this.setState({ slug: slugMatchingTitle });
  },

  onCategoryChanged: function(categoryId: CategoryId) {
    this.setState({ categoryId: categoryId });
  },

  onPageRoleChanged: function(pageRole) {
    this.setState({ pageRole: pageRole });
  },

  onFolderChanged: function(event) {
    this.setState({ folder: event.target.value });
  },

  onSlugChanged: function(event) {
    this.setState({ slug: event.target.value });
  },

  onShowIdChanged: function(event) {
    this.setState({ showId: event.target.checked });
  },

  save: function() {
    this.setState({ isSaving: true });
    var newTitle = this.refs.titleInput.getValue();
    var pageSettings = this.getSettings();
    ReactActions.editTitleAndSettings({ ...pageSettings, newTitle }, this.props.closeEditor, () => {
      this.setState({ isSaving: false });
    });
  },

  getSettings: function() {
    var settings: any = {
      categoryId: this.state.categoryId,
      pageRole: this.state.pageRole,
      pageLayout: this.state.pageLayout,
      folder: addFolderSlashes(this.state.folder),
      slug: this.state.slug,
      showId: this.state.showId,
      htmlTagCssClasses: this.state.htmlTagCssClasses,
      htmlHeadTitle: this.state.htmlHeadTitle,
      htmlHeadDescription: this.state.htmlHeadDescription,
    };
    if (this.refs.layoutInput) {
      settings.layout = this.refs.layoutInput.getValue();
    }
    return settings;
  },

  render: function() {
    const store: Store = this.props.store;
    const page: Page = store.currentPage;
    const me: Myself = store.me;
    const settings: SettingsVisibleClientSide = store.settings;
    const pageRole: PageRole = page.pageRole;
    const titlePost: Post = page.postsByNr[TitleNr];
    const titleText = titlePost.sanitizedHtml; // for now. TODO only allow plain text?
    const isForum = pageRole === PageRole.Forum;

    if (!this.state.editorScriptsLoaded) {
      // The title is not shown, so show some whitespace to avoid the page jumping upwards.
      return r.div({ style: { height: 80 }});
    }

    let layoutAndSettings;
    if (this.state.showLayoutAndSettings) {
      let title = r.span({},
          topicListLayout_getName(this.state.pageLayout) + ' ',
          r.span({ className: 'caret' }));
      let mkSetter = (layout) => (() => this.setState({ pageLayout: layout }));
      layoutAndSettings =
        r.div({},
          r.div({ className: 'form-horizontal', key: 'layout-settings-key' },
            Input({ type: 'custom', label: "Topic list layout",
                labelClassName: 'col-xs-2', wrapperClassName: 'col-xs-10' },
              ModalDropdownButton({ title: title },
                r.ul({ className: 'dropdown-menu' },
                  MenuItem({ onClick: mkSetter(TopicListLayout.TitleOnly) },
                    topicListLayout_getName(TopicListLayout.TitleOnly)),
                  MenuItem({ onClick: mkSetter(TopicListLayout.TitleExcerptSameLine) },
                    topicListLayout_getName(TopicListLayout.TitleExcerptSameLine)),
                  MenuItem({ onClick: mkSetter(TopicListLayout.ExcerptBelowTitle) },
                    topicListLayout_getName(TopicListLayout.ExcerptBelowTitle)),
                  MenuItem({ onClick: mkSetter(TopicListLayout.ThumbnailsBelowTitle) },
                    topicListLayout_getName(TopicListLayout.ThumbnailsBelowTitle)),
                  MenuItem({ onClick: mkSetter(TopicListLayout.NewsFeed) },
                    topicListLayout_getName(TopicListLayout.NewsFeed)))))));
      }

    var complicatedStuff;
    if (this.state.showComplicated) {
      var dashId = this.state.showId ? '-' + page.pageId : '';
      var slashSlug =  this.state.slug;
      if (dashId && slashSlug) slashSlug = '/' + slashSlug;
      var url = location.protocol + '//' + location.host +
          addFolderSlashes(this.state.folder) + dashId + slashSlug;

      var anyMetaTitleAndDescription = pageRole !== PageRole.Forum ? null :
        r.div({ className: 'esTtlEdtr_metaTags' },
          Input({ label: "SEO title", type: 'text',
            labelClassName: 'col-xs-2', wrapperClassName: 'col-xs-10',
            value: this.state.htmlHeadTitle,
            onChange: (event) => this.setState({ htmlHeadTitle: event.target.value }),
            help: "Custom title for Search Engine Optimization (SEO). Will be inserted " +
              "into the <html><head><title> tag."}),
          Input({ label: "SERP description", type: 'textarea',
            labelClassName: 'col-xs-2', wrapperClassName: 'col-xs-10',
            value: this.state.htmlHeadDescription,
            onChange: (event) => this.setState({ htmlHeadDescription: event.target.value }),
            help: "Page description, for Search Engine Result Pages (SERP). Will be inserted " +
                "into the <html><head><meta name='description' content='...'> attribute." }));


      // Forum pages must not have a slug (then /latest etc suffixes won't work),
      // and should not show the page id.
      const anyUrlAndCssClassEditor = !store.settings.showExperimental ? null :
        r.div({ className: 'esTtlEdtr_urlSettings' },
          r.p({}, r.b({}, "Ignore this "), "— unless you understand URL addresses and CSS."),
          isForum ? null : Input({ label: 'Page slug', type: 'text', ref: 'slugInput',
            className: 'dw-i-slug', labelClassName: 'col-xs-2', wrapperClassName: 'col-xs-10',
            value: this.state.slug, onChange: this.onSlugChanged,
            help: "The name of this page in the URL."}),
          Input({ label: 'Folder', type: 'text', ref: 'folderInput', className: 'dw-i-folder',
            labelClassName: 'col-xs-2', wrapperClassName: 'col-xs-10',
            value: this.state.folder, onChange: this.onFolderChanged,
            help: "Any /url/path/ to this page." }),
          isForum ? null : Input({ label: 'Show page ID in URL', type: 'checkbox', ref: 'showIdInput',
            wrapperClassName: 'col-xs-offset-2 col-xs-10',
            className: 'dw-i-showid', checked: this.state.showId,
            onChange: this.onShowIdChanged }),
          r.p({}, "The page URL will be: ", r.kbd({}, url)),
          Input({ label: 'CSS class', type: 'text', className: 'theCssClassInput',
            labelClassName: 'col-xs-2', wrapperClassName: 'col-xs-10',
            value: this.state.htmlTagCssClasses,
            onChange: (event) => this.setState({ htmlTagCssClasses: event.target.value }),
            help: r.span({}, "The CSS classes you type here will be added to the ",
                r.kbd({}, '<html class="...">'), " attribute.") }));

      complicatedStuff =
        r.div({},
          r.div({ className: 'dw-compl-stuff form-horizontal', key: 'compl-stuff-key' },
            anyMetaTitleAndDescription,
            anyUrlAndCssClassEditor));
    }

    // Once more stuff has been shown, one cannot hide it, except by cancelling
    // the whole dialog. Because if hiding it, then what about any changes made? Save or ignore?

    let layoutAndSettingsButton =
        this.state.showLayoutAndSettings || !me.isAdmin || pageRole !== PageRole.Forum
          ? null
          : r.a({ className: 'esTtlEdtr_openAdv icon-wrench', onClick: this.showLayoutAndSettings },
              "Layout and settings");

    let existsAdvStuffToEdit = pageRole === PageRole.Forum || store.settings.showExperimental;
    let advancedStuffButton = !existsAdvStuffToEdit ||
        this.state.showComplicated || !me.isAdmin || pageRole === PageRole.FormalMessage
          ? null
          : r.a({ className: 'esTtlEdtr_openAdv icon-settings', onClick: this.showComplicated },
              "Advanced");

    const selectCategoryInput =
        !page_canChangeCategory(page) || !settings_showCategories(settings, me) ? null :
      Input({ type: 'custom', label: t.Category, labelClassName: 'col-xs-2',
            wrapperClassName: 'col-xs-10' },
          SelectCategoryDropdown({ store: this.props.store, pullLeft: true,
            selectedCategoryId: this.state.categoryId,
            onCategorySelected: this.onCategoryChanged }));

    const selectTopicType =
        !page_mayChangeRole(pageRole) || !settings_selectTopicType(settings, me) ? null :
      Input({ type: 'custom', label: t.TopicType, labelClassName: 'col-xs-2',
          wrapperClassName: 'col-xs-10' },
        editor.PageRoleDropdown({ store: store, pageRole: this.state.pageRole,
          onSelect: this.onPageRoleChanged, pullLeft: true,
          complicated: store.settings.showExperimental,
          className: 'esEdtr_titleEtc_pageRole' }));

    var addBackForumIntroButton;
    if (page.pageRole === PageRole.Forum) {
      var introPost = page.postsByNr[BodyNr];
      var hasIntro = introPost && introPost.sanitizedHtml && !introPost.isBodyHidden;
      if (!hasIntro) {
        addBackForumIntroButton =
            r.a({ className: 'icon-plus', onClick: () => {
              ReactActions.setPostHidden(BodyNr, false);
              debiki2.ReactActions.showForumIntro(true);
            }}, "Add forum intro text");
      }
    }

    const saveCancel = this.state.isSaving
      ? r.div({}, t.SavingDots)
      : r.div({ className: 'dw-save-btns-etc' },
          PrimaryButton({ onClick: this.save, className: 'e2eSaveBtn' }, t.Save),
          Button({ onClick: this.props.closeEditor }, t.Cancel));

    return (
      r.div({ className: 'dw-p-ttl-e' },
        Input({ type: 'text', ref: 'titleInput', className: 'dw-i-title', id: 'e2eTitleInput',
            defaultValue: titleText, onChange: this.onTitleChanged }),
        r.div({ className: 'form-horizontal' }, selectCategoryInput),
        r.div({ className: 'form-horizontal' }, selectTopicType),
        addBackForumIntroButton,
        // Only allow opening one of layout-and-settings and advanced-stuff at once.
        complicatedStuff ? null : layoutAndSettingsButton,
        layoutAndSettings ? null : advancedStuffButton,
        ReactCSSTransitionGroup({ transitionName: 'compl-stuff',
            transitionAppear: true, transitionAppearTimeout: 600,
            transitionEnterTimeout: 600, transitionLeaveTimeout: 500 },
          layoutAndSettings,
          complicatedStuff),
        saveCancel));
  }
});


function topicListLayout_getName(pageLayout: TopicListLayout): string {
  switch (pageLayout) {
    case TopicListLayout.TitleExcerptSameLine: return "Title and excerpt on same line";
    case TopicListLayout.ExcerptBelowTitle: return "Excerpt below title";
    case TopicListLayout.ThumbnailsBelowTitle: return "Excerpt and preview images below title";
    case TopicListLayout.NewsFeed: return "News feed";
    case TopicListLayout.TitleOnly: // fall through
    default:
      return "Show topic title only";
  }
}


function addFolderSlashes(folder) {
  if (folder || folder === '') {
    if (folder[folder.length - 1] !== '/') folder = folder + '/';
    if (folder[0] !== '/') folder = '/' + folder;
  }
  return folder;
}

//------------------------------------------------------------------------------
   }
//------------------------------------------------------------------------------
// vim: fdm=marker et ts=2 sw=2 tw=0 fo=r list
