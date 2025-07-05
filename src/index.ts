// export { api } from './cloud-functions/api';

// export { onUpdateEmail } from './cloud-functions/update-email';

export { calculateCircleCompleted } from './cloud-functions/cron-job/cron-job-circle-completed';

export { monthlySendMailLeaderBoard } from './cloud-functions/cron-job/cron-job-send-mail-leaderboard-monthly';

export { monthlySendMailVisitsAndVisitorsLeaderBoard } from './cloud-functions/cron-job/cron-job-send-email-visit-and-visitor-leaderboard';

export { getZtarOfTheMatch } from './cloud-functions/cron-job/cron-job-get-ztar-of-the-match';

export { getPlayerOfTheWeek } from './cloud-functions/cron-job/cron-job-get-player-of-the-week';

export { createDreamTeam } from './cloud-functions/cron-job/cron-job-create-dream-team';

export { createBirthdayPost } from './cloud-functions/cron-job/cron-job-create-birthday-post';
export {runMedicalUpdate} from  './cloud-functions/cron-job/cron-job-create-medical-record'

export { remindPlayersUpdateDiaries } from './cloud-functions/cron-job/cron-job-remind-all-players-update-diaries';

export { remindCoachesUpdateDiaries } from './cloud-functions/cron-job/cron-job-remind-all-the-coaches-update-diaries';

export { caculatePlayerAvgRadar } from './cloud-functions/cron-job/cron-job-caculate-player-avg-radar';

export { aggregateInjury } from './cloud-functions/injuries-functions';

export { getTheWinnerFantazyManagerOfTheWeek } from './cloud-functions/cron-job/cron-job-get-the-winner-fantazy-manager-of-the-week';

export { createFantazyTeamPost } from './cloud-functions/cron-job/cron-job-create-fantazy-team-post';

export { getTheFantazyManagerOfTheMonth } from './cloud-functions/cron-job/cron-job-get-the-fantazy-manager-of-the-month';

export { createNotificationRemindEditFantazy } from './cloud-functions/cron-job/cron-job-remind-edit-fantazy';

export { calculatePlayerInHowManyFantazyTeam } from './cloud-functions/cron-job/cron-job-how-many-players-in-fantazy-teams';

export {
  // newUserSignup,
  deleteUserAuth,
} from './cloud-functions/handle-user-auth-changes';

export {
  updateUserIndex,
  removeUserIndex,
  updateUserToMongo,
} from './cloud-functions/update-user-index';

export {
  createClubIndex,
  updateClubIndex,
  removeClubIndex,
  updateClubsToMongo,
} from './cloud-functions/update-club-index';

export {
  updateTagIndex,
  updateTagsToMongo,
} from './cloud-functions/update-tag-index';

export { preventColdStartMode } from './cloud-functions/cron-job/cronjob-prevent-cold-start';

export { updateNewsFromResources } from './cloud-functions/update-news-from-resources';

export { getNewsFromNewProvider } from './cloud-functions/update-news-from-resources';

export { getZporterNewsFromNewZporter } from './cloud-functions/update-news-from-resources';

export { updateZporterNewsToMongo } from './cloud-functions/update-news-from-resources';

export { requestPasswordReset } from './cloud-functions/request-reset-password';

// export { handleAdminCreateTeam } from './cloud-functions/admin-process-teams/admin-create-team';

// export { handleAdminUpdateTeam } from './cloud-functions/admin-process-teams/admin-update-team';

export { syncUserTeam } from './cloud-functions/admin-process-teams/sync-user-team-flamelink';

export { triggerOnCreateNotificationMessages } from './cloud-functions/trigger-notification-message';

export {
  createFriendToMongo,
  updateFriendToMongo,
  deleteFriendToMongo,
  createFollowToMongo,
  updateFollowToMongo,
  deleteFollowToMongo,
} from './cloud-functions/update-friend-index';

export { backupDataFirebase } from './cloud-functions/backup-data-firebase';
