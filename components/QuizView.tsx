

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Fix: Correct import paths for types and services.
import { Project, QuizToolData, Question } from '../types.ts';
import * as geminiService from '../services/geminiService.ts';
import { Button } from './common/Button';
import { Spinner } from './common/Spinner';

interface QuizViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): QuizToolData => {
  return project.tools.quiz || {
    topic: '',
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    score: null,
    state: 'config',
  };
};

export const QuizView: React.FC<QuizViewProps> = ({ project, onUpdateProject }) => {
  const [data, setData] = useState<QuizToolData>(getInitialData(project));
  const [topicInput, setTopicInput] = useState(data.topic || 'Quantum Physics');
  const [countInput, setCountInput] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  
  const updateAndPersist = (newData: Partial<QuizToolData>) => {
    const updatedData = { ...data, ...newData };
    setData(updatedData);
    onUpdateProject({ ...project, tools: { ...project.tools, quiz: updatedData }});
  };

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const questionsData = await geminiService.generateQuiz(topicInput, countInput);
      const questionsWithIds: Question[] = questionsData.map(q => ({ ...q, id: uuidv4() }));
      updateAndPersist({
        topic: topicInput,
        questions: questionsWithIds,
        currentQuestionIndex: 0,
        userAnswers: Array(questionsWithIds.length).fill(null),
        score: null,
        state: 'taking',
      });
    } catch (err: any) {
      setError(`Failed to generate quiz: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex);
  };
  
  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;
    const newAnswers = [...data.userAnswers];
    newAnswers[data.currentQuestionIndex] = selectedAnswer;
    
    if (data.currentQuestionIndex < data.questions.length - 1) {
      updateAndPersist({ userAnswers: newAnswers, currentQuestionIndex: data.currentQuestionIndex + 1 });
      setSelectedAnswer(null);
    } else {
      // End of quiz
      let correctAnswers = 0;
      data.questions.forEach((q, i) => {
        if (newAnswers[i] === q.correctAnswerIndex) {
          correctAnswers++;
        }
      });
      updateAndPersist({ userAnswers: newAnswers, score: correctAnswers, state: 'result' });
    }
  };

  const handleReset = () => {
    updateAndPersist({ state: 'config', topic: '', questions: [], score: null, userAnswers: [] });
    setTopicInput('');
  };

  const { state, questions, currentQuestionIndex, score, topic } = data;
  const currentQuestion = questions[currentQuestionIndex];

  if (state === 'config' || isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-dark sm:bg-background-darkest sm:p-4">
        <div className="w-full h-full sm:h-auto sm:max-w-md p-6 md:p-8 bg-background-dark sm:rounded-lg sm:shadow-lg text-center flex flex-col justify-center">
          <h2 className="text-3xl font-bold text-text-primary mb-4">AI Quiz Generator</h2>
          <p className="text-text-secondary mb-6">Enter a topic to test your knowledge.</p>
          <div className="space-y-4">
            <input type="text" value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="e.g., The French Revolution" className="w-full bg-background-light border border-border-color p-3 rounded-md text-text-primary"/>
            <div>
              <label className="text-text-secondary text-sm block mb-2">Number of Questions:</label>
              <input type="number" value={countInput} onChange={e => setCountInput(Math.max(1, Math.min(20, Number(e.target.value))))} min="1" max="20" className="w-full bg-background-light border border-border-color p-3 rounded-md text-text-primary"/>
            </div>
            <Button onClick={handleGenerateQuiz} disabled={isLoading || !topicInput.trim()} size="lg" className="w-full">
              {isLoading ? <Spinner /> : 'Generate Quiz'}
            </Button>
          </div>
          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
      </div>
    );
  }
  
  if (state === 'taking' && currentQuestion) {
    return (
        <div className="h-full flex items-center justify-center bg-background-dark sm:bg-background-darkest sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-w-2xl p-6 md:p-8 bg-background-dark sm:rounded-lg sm:shadow-lg flex flex-col justify-center">
                <p className="text-sm text-brand-primary font-semibold mb-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <h3 className="text-2xl font-bold text-text-primary mb-6">{currentQuestion.text}</h3>
                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                        <button key={index} onClick={() => handleAnswerSelect(index)} className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${selectedAnswer === index ? 'bg-brand-primary/20 border-brand-primary' : 'bg-background-light border-border-color hover:border-gray-600'}`}>
                            {option}
                        </button>
                    ))}
                </div>
                <div className="mt-8 flex justify-end">
                    <Button onClick={handleNextQuestion} disabled={selectedAnswer === null}>
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    </Button>
                </div>
            </div>
        </div>
    );
  }
  
  if (state === 'result') {
      return (
        <div className="h-full flex items-center justify-center bg-background-dark sm:bg-background-darkest sm:p-4">
            <div className="w-full h-full sm:h-auto sm:max-w-md p-6 md:p-8 bg-background-dark sm:rounded-lg sm:shadow-lg text-center flex flex-col justify-center">
                <h2 className="text-3xl font-bold text-text-primary mb-2">Quiz Complete!</h2>
                <p className="text-text-secondary mb-4">Topic: {topic}</p>
                <p className="text-5xl font-bold text-brand-primary my-6">{score} / {questions.length}</p>
                <p className="text-lg text-text-primary mb-8">You answered {((score! / questions.length) * 100).toFixed(0)}% correctly.</p>
                <Button onClick={handleReset} size="lg">Take Another Quiz</Button>
            </div>
        </div>
      );
  }

  return <div>Something went wrong.</div>;
};