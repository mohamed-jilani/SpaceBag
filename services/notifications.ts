/**
 * services/notifications.ts — Service de notifications
 *
 * Phase 1 (actuelle) : notifications simulées via console.log.
 * Phase 2 (production) : intégrer expo-notifications + FCM.
 *
 * Pour activer les vraies notifications push :
 *   1. npm install expo-notifications
 *   2. Configurer le token FCM dans la collection `users/{uid}.fcmToken`
 *   3. Remplacer les corps de fonctions ci-dessous par l'envoi FCM via
 *      une Cloud Function (ou un appel à l'API FCM HTTP v1).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationEvent =
  | 'new_request'
  | 'accepted'
  | 'refused'
  | 'code_generated'
  | 'delivered';

// ─── Messages par événement ───────────────────────────────────────────────────

const MESSAGES: Record<NotificationEvent, (name?: string) => { title: string; body: string }> = {
  new_request: name => ({
    title: '📦 Nouvelle demande de livraison',
    body: `${name || 'Un membre'} souhaite envoyer un colis avec vous.`,
  }),
  accepted: () => ({
    title: '✅ Demande acceptée !',
    body: 'Le transporteur a accepté votre demande. Vous pouvez maintenant échanger.',
  }),
  refused: () => ({
    title: '❌ Demande refusée',
    body: 'Le transporteur n\'a pas pu accepter votre demande cette fois.',
  }),
  code_generated: () => ({
    title: '🔑 Code de livraison disponible',
    body: 'Votre colis est prêt à être remis. Consultez l\'application pour obtenir le code.',
  }),
  delivered: () => ({
    title: '🎉 Livraison confirmée !',
    body: 'Votre colis a bien été livré. N\'oubliez pas d\'évaluer votre transporteur.',
  }),
};

// ─── Helpers internes ─────────────────────────────────────────────────────────

function logNotification(
  targetUserId: string,
  event: NotificationEvent,
  name?: string
) {
  const msg = MESSAGES[event](name);
  // En phase 1, on log simplement — en phase 2, on envoie via FCM
  console.log(
    `[Notification → ${targetUserId}] ${msg.title} | ${msg.body}`
  );
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Notifie le transporteur qu'une nouvelle demande a été créée.
 * @param carrierId UID du transporteur
 * @param memberName Nom du membre (pour personnaliser le message)
 */
export async function notifyCarrierNewRequest(
  carrierId: string,
  memberName?: string
): Promise<void> {
  logNotification(carrierId, 'new_request', memberName);
  // TODO phase 2 : await sendPushNotification(carrierId, MESSAGES.new_request(memberName));
}

/**
 * Notifie le membre d'un changement de statut de sa demande.
 * @param memberId UID du membre
 * @param event Type d'événement
 */
export async function notifyMemberStatusChange(
  memberId: string,
  event: 'accepted' | 'refused' | 'code_generated' | 'delivered'
): Promise<void> {
  logNotification(memberId, event);
  // TODO phase 2 : await sendPushNotification(memberId, MESSAGES[event]());
}

/**
 * Stub pour l'envoi réel d'une notification push via FCM HTTP v1.
 * À implémenter dans une Cloud Function pour ne pas exposer la clé serveur.
 */
async function sendPushNotification(
  _userId: string,
  _payload: { title: string; body: string }
): Promise<void> {
  // Exemple d'intégration future :
  // const tokenSnap = await getDoc(doc(db, 'users', _userId));
  // const fcmToken = tokenSnap.data()?.fcmToken;
  // if (!fcmToken) return;
  // await fetch('https://your-cloud-function/sendNotification', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ token: fcmToken, ..._payload }),
  // });
}
