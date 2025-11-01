import { toast as sonnerToast } from 'sonner';

/**
 * Centralized toast notification hook for consistent messaging across the app
 * @returns Object containing all toast notification methods
 */
export const useToastNotifications = () => {
  return {
    // Story operations
    storyGenerated: () => sonnerToast.success('Story generated successfully!'),
    storyGenerationFailed: () => sonnerToast.error('Failed to generate story. Please try again.'),
    storySaved: () => sonnerToast.success('Story saved to favorites!'),
    storyAlreadySaved: () => sonnerToast.error('This story is already in your favorites'),
    storySaveFailed: () => sonnerToast.error('Failed to save story to favorites'),
    storyDeleted: (title: string) => sonnerToast.success(`"${title}" removed from favorites`),
    storyDeleteFailed: () => sonnerToast.error('Failed to remove story from favorites'),
    
    // Sight words operations
    wordAdded: () => sonnerToast.success('Word added successfully!'),
    wordDuplicate: () => sonnerToast.error('This word is already in your list'),
    wordToggled: (active: boolean) => sonnerToast.success(active ? 'Word activated' : 'Word deactivated'),
    wordDeleted: () => sonnerToast.success('Word removed successfully!'),
    allWordsActivated: () => sonnerToast.success('All words activated!'),
    allWordsDeactivated: () => sonnerToast.success('All words deactivated!'),
    wordsSaveFailed: () => sonnerToast.error('Failed to save words'),
    wordsLoadFailed: () => sonnerToast.error('Failed to load sight words'),
    wordLimitReached: () => sonnerToast.error('Free accounts are limited to 3 words. Please upgrade to add more words.'),
    
    // Limits and subscription
    dailyLimitReached: () => sonnerToast.error('Daily limit reached. Upgrade to unlimited or wait until tomorrow (midnight CST).'),
    storiesLimitReached: () => sonnerToast.error("You've reached your daily story limit. Upgrade for unlimited stories!"),
    paymentSuccessful: () => sonnerToast.success('Payment successful! Your unlimited subscription is now active.'),
    paymentCanceled: () => sonnerToast.error('Payment was canceled. You can try again anytime.'),
    
    // Authentication
    loginSuccess: () => sonnerToast.success('Successfully logged in!'),
    loginFailed: (message?: string) => sonnerToast.error(message || 'Failed to login. Please try again.'),
    logoutSuccess: () => sonnerToast.success('Successfully logged out'),
    registrationSuccess: () => sonnerToast.success('Registration successful! Please check your email to confirm your account.'),
    registrationFailed: (message?: string) => sonnerToast.error(message || 'Error during registration'),
    sessionExpired: () => sonnerToast.error('Session expired. Please log in again.'),
    
    // Reports
    reportSubmitted: () => sonnerToast.success('Content report submitted successfully'),
    reportSubmitFailed: (message?: string) => sonnerToast.error(message || 'Failed to submit report'),
    reportReasonRequired: () => sonnerToast.error('Please select a reason for reporting'),
    reportsLoadFailed: (message?: string) => sonnerToast.error(message || 'Failed to load reports'),
    
    // Forms
    formIncomplete: () => sonnerToast.error('Please fill in all required fields'),
    themeRequired: () => sonnerToast.error('Please enter a theme/lesson or disable the option'),
    wordsLoading: () => sonnerToast.error('Please wait for sight words to load'),
    noActiveWords: () => sonnerToast.error('Please add and activate some sight words before generating a story'),
    
    // Generic operations
    upgradeRequired: () => sonnerToast.error('Please log in to upgrade'),
    checkoutFailed: () => sonnerToast.error('Failed to start checkout process'),
    storyInfoIncomplete: () => sonnerToast.error('Story information is incomplete'),
    
    // Custom toast for flexibility
    custom: {
      success: (message: string) => sonnerToast.success(message),
      error: (message: string) => sonnerToast.error(message),
    }
  };
};
