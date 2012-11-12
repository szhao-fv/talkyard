/**
 * Copyright (c) 2012 Kaj Magnus Lindberg (born 1979)
 */

package debiki

import com.debiki.v0._
import com.debiki.v0.Prelude._
import controllers.{DebikiRequest, PageRequest}
import play.api.Play
import play.api.Play.current
import xml.NodeSeq
import controllers.PageRequest
import com.debiki.v0.QuotaConsumers


object Debiki {

  lazy val PageCache = new PageCache


  private val _DaoSpiFactory = new RelDbDaoSpiFactory({
    def configStr(path: String) =
      Play.configuration.getString(path) getOrElse
         runErr("DwE93KI2", "Config value missing: "+ path)
    new RelDb(
      server = configStr("debiki.pgsql.server"),
      port = configStr("debiki.pgsql.port"),
      database = configStr("debiki.pgsql.database"),
      user = configStr("debiki.pgsql.user"),
      password = configStr("debiki.pgsql.password"))
  })


  val QuotaManager = new QuotaManager(SystemDao)
  QuotaManager.scheduleCleanups()


  def SystemDao = new SystemDao(_DaoSpiFactory.systemDaoSpi)


  val RichDaoFactory = new CachingRichDaoFactory(_DaoSpiFactory,
    QuotaManager.QuotaChargerImpl /*, cache-config */)


  private val _MailerActorRef = Mailer.startNewActor(RichDaoFactory)
  private val _NotifierActorRef = Notifier.startNewActor(RichDaoFactory)


  def tenantDao(tenantId: String, ip: String, roleId: Option[String] = None)
        : RichTenantDao =
    RichDaoFactory.buildTenantDao(QuotaConsumers(ip = Some(ip),
       tenantId = tenantId, roleId = roleId))


  def renderPage(pageReq: PageRequest[_], appendToBody: NodeSeq = Nil,
        skipCache: Boolean = false): String = {
    val cache = if (skipCache) None else Some(PageCache)
    PageRenderer(pageReq, cache, appendToBody).renderPage()
  }


  /**
   * Saves page actions and refreshes caches and places messages in
   * users' inboxes, as needed.
   *
   * Returns the saved actions, but with ids assigned.
   */
  def savePageActions(pageReq: PageRequest[_], actions: List[Action])
        : Seq[Action] = {
    savePageActions(pageReq, pageReq.page_!, actions)
  }


  def savePageActions(request: DebikiRequest[_], page: Debate,
        actions: List[Action]): Seq[Action] = {

    if (actions isEmpty)
      return Nil

    import request.{dao, user_!}
    val actionsWithId = dao.savePageActions(page.id, actions)

    // Possible optimization: Examine all actions, and refresh cache only
    // if there are e.g. EditApp:s or approved Post:s (but ignore Edit:s --
    // unless applied & approved)
    PageCache.refreshLater(tenantId = request.tenantId, pageId = page.id,
       host = request.host)

    // Would it be okay to simply overwrite the in mem cache with this
    // updated page? — Only if I make `++` avoid adding stuff that's already
    // present!
    //val pageWithNewActions =
    // page_! ++ actionsWithId ++ pageReq.login_! ++ pageReq.user_!

    // In the future, also refresh page index cache, and cached page titles?
    // (I.e. a cache for DW1_PAGE_PATHS.)

    // Notify users whose actions were affected.
    // BUG: notification lost if server restarted here.
    // COULD rewrite Dao so the notfs can be saved in the same transaction:
    val pageWithNewActions = page ++ actionsWithId
    val notfs = NotfGenerator(pageWithNewActions, actionsWithId).generateNotfs
    dao.saveNotfs(notfs)

    actionsWithId
  }


  def sendEmail(email: Email, websiteId: String) {
    _MailerActorRef ! (email, websiteId)
  }

}


// vim: fdm=marker et ts=2 sw=2 tw=80 fo=tcqn list ft=scala

