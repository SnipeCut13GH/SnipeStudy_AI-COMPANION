import React, { useState } from 'react';
import { Quiz } from '../types';

interface QuizViewProps {
  quiz: Quiz;
  onQuizComplete: (score: number, total: number) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ quiz, onQuizComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;

  const handleAnswerSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    if (index === currentQuestion.correctAnswerIndex) {
      setScore(s => s + 1);
    }
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      onQuizComplete(score, quiz.questions.length);
    }
  };

  return (
    <div className="bg-background-light p-4 rounded-lg shadow-lg max-w-md mx-auto my-4 text-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-brand-secondary">Quiz: {quiz.topic}</h2>
        <p className="text-gray-400">{currentQuestionIndex + 1} / {quiz.questions.length}</p>
      </div>

      <p className="text-xl mb-6">{currentQuestion.question}</p>
      
      <div className="space-y-3">
        {currentQuestion.options.map((option, index) => {
          let buttonClass = "w-full text-left p-3 rounded-lg border-2 border-gray-600 hover:bg-gray-700 transition-colors";
          if (showFeedback) {
            if (index === currentQuestion.correctAnswerIndex) {
              buttonClass += " bg-green-500/30 border-green-500";
            } else if (index === selectedAnswer) {
              buttonClass += " bg-red-500/30 border-red-500";
            }
          }
          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={showFeedback}
              className={buttonClass}
            >
              {option}
            </button>
          );
        })}
      </div>
      
      {showFeedback && (
        <div className={`mt-4 p-3 rounded-lg ${isCorrect ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
          <p className="font-bold text-lg mb-1">{isCorrect ? 'Correct!' : 'Not quite!'}</p>
          <p className="text-gray-300">{currentQuestion.explanation}</p>
        </div>
      )}

      {showFeedback && (
         <button 
            onClick={handleNext}
            className="w-full mt-6 bg-brand-secondary text-white font-bold py-3 rounded-lg hover:bg-blue-500 transition-colors"
          >
           {currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
         </button>
      )}
    </div>
  );
};