import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';                       // ✅ get current user
import { logInteraction } from '../../services/recommend_api';   // ✅ same helper used elsewhere

const OnboardingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({ interests: [] });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth() || {};

  const TAGS = [
    "Ai","Art","Badminton","Blockchain","Business","Chess","Community",
    "Cybersecurity","Culture","Data Analysis","Devops","Education",
    "Engineering","Entertainment","Environment","Free","Football","Gaming",
    "Global","Graphic Design","Health","Hybrid","Local","Literature",
    "Marketing","Mobile Development","Networking","Online","Physical",
    "Pitching","Robotics","Startup","Sustainability","Tech","Web"
  ];

  const steps = [
    { title: "Welcome to EventFlow", subtitle: "Let's personalize your event discovery experience", icon: "🎉" },
    { title: "What are you interested in?", subtitle: "Select tags that match your interests", icon: "🎯" },
    { title: "You're all set!", subtitle: "Ready to discover amazing events", icon: "🎊" }
  ];

  const handleOnboardingComplete = async () => {
    if (!user?.id) {
      console.error('User not authenticated yet.');
      return;
    }
    setSubmitting(true);
    try {
      // 🔸 Persist tags to DB as one consolidated tag_click
      await logInteraction(user.id, null, 'tag_click', {
        tags: userData.interests,
        source: 'onboarding'
      });

      // (optional) local mirror (per-user)
      localStorage.setItem(`onboardingComplete_${user.id}`, 'true');
      localStorage.setItem(`userPreferences_${user.id}`, JSON.stringify(userData));

      // Go back to intended page if present, else /event
      const from = location.state?.from?.pathname || '/event';
      navigate(from, { replace: true });
    } catch (e) {
      console.error('Failed to save onboarding tags:', e);
      alert('Could not save your preferences. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // final step → send to backend
      handleOnboardingComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const toggleInterest = (interest) => {
    setUserData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const ProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((_, index) => (
          <React.Fragment key={index}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-1 rounded ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
          <h1 className="text-3xl font-bold">{steps[currentStep].title}</h1>
          <p className="text-blue-100 mt-2 text-lg">{steps[currentStep].subtitle}</p>
        </div>

        <div className="p-8">
          <ProgressBar />

          {/* Step 1 */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="text-8xl mb-4">🎪</div>
              <h2 className="text-2xl font-semibold text-gray-800">Discover Events You'll Love</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Tell us what you're interested in and we'll recommend events that match your preferences.
                Get started by selecting your favorite tags.
              </p>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 text-center">Select your interests</h3>
              <p className="text-gray-600 text-center">Choose tags that match what you're interested in</p>

              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium
                        ${userData.interests.includes(tag)
                          ? 'bg-blue-500 border-blue-500 text-white transform scale-105 shadow-lg'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:shadow-md'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-500 text-sm">Selected: {userData.interests.length} tags</p>
                {userData.interests.length < 3 && (
                  <p className="text-orange-500 text-sm mt-1">
                    Select at least 3 tags for better recommendations
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 2 && (
            <div className="text-center space-y-6">
              <div className="text-8xl mb-4">🎊</div>
              <h2 className="text-2xl font-semibold text-gray-800">You're All Set!</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Your event discovery journey begins now. We'll start showing you personalized recommendations based on your preferences.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 text-green-600 mb-2">
                  <span className="text-xl">✅</span>
                  <span className="font-semibold">Preferences Saved</span>
                </div>
                <div className="text-green-700 text-sm space-y-1">
                  <p>• {userData.interests.length} interests selected</p>
                  <p>• Ready to explore events!</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-12">
            <button
              onClick={prevStep}
              disabled={submitting}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200
                ${currentStep === 0 ? 'invisible' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              ← Back
            </button>

            <button
              onClick={nextStep}
              disabled={submitting || (currentStep === 1 && userData.interests.length < 3)}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg
                ${submitting || (currentStep === 1 && userData.interests.length < 3)
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {submitting
                ? 'Saving...'
                : currentStep === steps.length - 1
                ? 'Start Exploring Events 🚀'
                : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
