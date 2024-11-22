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
      className="max-w-2xl mx-auto mt-8 p-8 bg-story-warm rounded-lg shadow-lg"
    >
      <h2 className="text-3xl font-bold mb-6 text-gray-800">{title}</h2>
      <div className="prose prose-lg">
        {content.split("\n").map((paragraph, index) => (
          <p key={index} className="mb-4 text-gray-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </motion.div>
  );
};