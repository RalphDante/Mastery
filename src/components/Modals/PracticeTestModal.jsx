import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';

function PracticeTestModal({ isOpen, onClose, onGenerate, maxQuestions }) {
  const [testType, setTestType] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(10);

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate({ type: testType, count: questionCount });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">Simulate Exam</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Question Count */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">
            Number of Questions
          </label>
          <div className="flex gap-2">
            {[10, 20, maxQuestions].filter((val, idx, arr) => arr.indexOf(val) === idx).map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(Math.min(count, maxQuestions))}
                className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                  questionCount === count
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Max {maxQuestions} questions from this deck
          </p>
        </div>

        {/* Question Type */}
        <div className="mb-6">
          <label className="block text-white font-medium mb-3">
            Question Type
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setTestType('mixed')}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                testType === 'mixed'
                  ? 'bg-purple-600 text-white border-2 border-purple-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Mixed</div>
                  <div className="text-sm opacity-80">Variety of all types (Recommended)</div>
                </div>
                {testType === 'mixed' && (
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-purple-600"></div>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => setTestType('multiple_choice')}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                testType === 'multiple_choice'
                  ? 'bg-blue-600 text-white border-2 border-blue-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Multiple Choice</div>
                  <div className="text-sm opacity-80">4 options per question</div>
                </div>
                {testType === 'multiple_choice' && (
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => setTestType('true_false')}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                testType === 'true_false'
                  ? 'bg-green-600 text-white border-2 border-green-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">True / False</div>
                  <div className="text-sm opacity-80">Binary choice questions</div>
                </div>
                {testType === 'true_false' && (
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => setTestType('fill_blank')}
              className={`w-full p-4 rounded-lg text-left transition-all ${
                testType === 'fill_blank'
                  ? 'bg-orange-600 text-white border-2 border-orange-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">Fill in the Blank</div>
                  <div className="text-sm opacity-80">Type the missing word</div>
                </div>
                {testType === 'fill_blank' && (
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
        >
          Generate Test
        </button>
      </div>
    </div>
  );
}

export default PracticeTestModal;