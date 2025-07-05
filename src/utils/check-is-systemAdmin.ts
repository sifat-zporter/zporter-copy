import { db } from '../config/firebase.config';

/**
 * Check this userId whether it is `SYS_ADMIN`
 * @param userId Id of user need to be check
 * @returns `true` if it is system admin, otherwise return `false`.
 */
export const checkIsSystemAdmin = async (userId: string): Promise<boolean> => {
  const systemAdminRef = await db
    .collection('users')
    .where('type', '==', 'SYS_ADMIN')
    .get();
  const systemAdmins = systemAdminRef.docs.map((e) => e.data().userId);
  const checkAdmin = systemAdmins.some((adminId) => adminId == userId);

  if (checkAdmin == true) {
    return true;
  } else {
    return false;
  }
};
