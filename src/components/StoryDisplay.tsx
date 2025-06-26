
import { motion } from "framer-motion";

interface StoryDisplayProps {
  title: string;
  content: string;
}

export const StoryDisplay = ({ title, content }: StoryDisplayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-2xl mx-auto mt-8 p-8 clay-card"
    >
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
          {title}
        </h2>
        <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto"></div>
      </div>
      <div className="prose prose-lg max-w-none">
        {content.split("\n").map((paragraph, index) => (
          <p key={index} className="mb-4 text-gray-700 leading-relaxed text-lg font-medium">
            {paragraph}
          </p>
        ))}
      </div>
    </motion.div>
  );
};
