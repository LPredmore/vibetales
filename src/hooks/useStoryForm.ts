import { useLocalStorage } from "./useLocalStorage";
import { StoryFormData } from "@/components/StoryForm";

export function useStoryForm() {
  const [readingLevel, setReadingLevel] = useLocalStorage(
    "storyForm_readingLevel",
    ""
  );
  const [interestLevel, setInterestLevel] = useLocalStorage(
    "storyForm_interestLevel",
    ""
  );
  const [theme, setTheme] = useLocalStorage("storyForm_theme", "");
  const [language, setLanguage] = useLocalStorage(
    "storyForm_language",
    "english"
  );
  const [themeLesson, setThemeLesson] = useLocalStorage(
    "storyForm_themeLesson",
    ""
  );
  const [hasThemeLesson, setHasThemeLesson] = useLocalStorage(
    "storyForm_hasThemeLesson",
    false
  );
  const [length, setLength] = useLocalStorage("storyForm_length", "");
  const [isDrSeussStyle, setIsDrSeussStyle] = useLocalStorage(
    "storyForm_isDrSeussStyle",
    false
  );
  const [useSightWords, setUseSightWords] = useLocalStorage(
    "storyForm_useSightWords",
    true
  );

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    // Reset Dr. Seuss style if changing away from English
    if (value !== "english" && isDrSeussStyle) {
      setIsDrSeussStyle(false);
    }
  };

  const getFormData = (): StoryFormData => ({
    readingLevel,
    interestLevel,
    theme,
    language,
    length,
    themeLesson: hasThemeLesson ? themeLesson : undefined,
    hasThemeLesson,
    isDrSeussStyle,
    useSightWords,
  });

  const isFormValid = () => {
    if (!readingLevel || !interestLevel || !theme || !language || !length) {
      return { valid: false, message: "Please fill in all required fields" };
    }
    if (hasThemeLesson && !themeLesson.trim()) {
      return {
        valid: false,
        message: "Please enter a theme/lesson or disable the option",
      };
    }
    return { valid: true, message: "" };
  };

  return {
    // Form values
    readingLevel,
    interestLevel,
    theme,
    language,
    themeLesson,
    hasThemeLesson,
    length,
    isDrSeussStyle,
    useSightWords,
    // Setters
    setReadingLevel,
    setInterestLevel,
    setTheme,
    handleLanguageChange,
    setThemeLesson,
    setHasThemeLesson,
    setLength,
    setIsDrSeussStyle,
    setUseSightWords,
    // Utilities
    getFormData,
    isFormValid,
  };
}
