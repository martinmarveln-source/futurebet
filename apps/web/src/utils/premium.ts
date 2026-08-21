export function hasPremiumAccess(user: any): boolean {
  if (!user) return false;
  
  // Admins always have access
  if (user.user_role === 'admin' || user.user_role === 'superadmin') {
    return true;
  }

  // Check subscription status
  const isSubscribed = user.subscription_status === 'active' || user.subscription_status === 'trialing';
  const hasTrial = user.is_restricted_trial === true;

  if (isSubscribed || hasTrial) {
    // If there's an expiration date, verify it hasn't passed
    if (user.subscription_expires_at) {
      return new Date(user.subscription_expires_at) > new Date();
    }
    return true;
  }

  return false;
}
