import React, { useState } from 'react';

const TAGS = [
  "Ai", "Art", "Badminton", "Blockchain", "Business", "Chess", "Community", 
  "Cybersecurity", "Culture", "Data Analysis", "Devops", "Education", 
  "Engineering", "Entertainment", "Environment", "Free", "Football", "Gaming", 
  "Global", "Graphic Design", "Health", "Hybrid", "Local", "Literature", 
  "Marketing", "Mobile Development", "Networking", "Online", "Physical", 
  "Pitching", "Robotics", "Startup", "Sustainability", "Tech", "Web",
];

function TagSelection() {
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleTagSelect = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length < 10) {
        setSelectedTags([...selectedTags, tag]);
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    console.log('Selected tags:', selectedTags);
    alert(`Success! You've selected ${selectedTags.length} tags.`);
  };

  const filteredTags = TAGS.filter(tag => 
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTagColor = (tag) => {
    const colors = {
      tech: 'bg-blue-100 text-blue-800 border-blue-200',
      business: 'bg-green-100 text-green-800 border-green-200',
      creative: 'bg-purple-100 text-purple-800 border-purple-200',
      sports: 'bg-orange-100 text-orange-800 border-orange-200',
      default: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const techTags = ['Ai', 'Blockchain', 'Cybersecurity', 'Data Analysis', 'Devops', 'Engineering', 'Mobile Development', 'Robotics', 'Tech', 'Web'];
    const businessTags = ['Business', 'Marketing', 'Networking', 'Pitching', 'Startup'];
    const creativeTags = ['Art', 'Graphic Design', 'Literature', 'Entertainment'];
    const sportsTags = ['Badminton', 'Chess', 'Football', 'Gaming'];

    if (techTags.includes(tag)) return colors.tech;
    if (businessTags.includes(tag)) return colors.business;
    if (creativeTags.includes(tag)) return colors.creative;
    if (sportsTags.includes(tag)) return colors.sports;
    return colors.default;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Welcome! Let's personalize your experience
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Choose topics that interest you to discover relevant content and communities
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Select up to 10 tags
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Minimum 3 recommended
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Selected Tags Preview */}
        {selectedTags.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Selected Tags ({selectedTags.length}/10)
              </h3>
              {selectedTags.length >= 3 && (
                <span className="text-sm text-green-600 font-medium">✓ Ready to continue</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <div 
                  key={tag} 
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium ${getTagColor(tag)} transition-all duration-200`}
                >
                  {tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Popular Tags
            </h2>
            <span className="text-sm text-gray-500">
              {filteredTags.length} tags available
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagSelect(tag)}
                className={`
                  relative p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium
                  hover:scale-105 hover:shadow-md active:scale-95
                  ${selectedTags.includes(tag) 
                    ? `${getTagColor(tag).replace('border-', 'border-2 border-')} shadow-md scale-105` 
                    : `${getTagColor(tag)} border-transparent hover:border-gray-300`
                  }
                  ${selectedTags.length >= 10 && !selectedTags.includes(tag) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                disabled={selectedTags.length >= 10 && !selectedTags.includes(tag)}
              >
                {tag}
                {selectedTags.includes(tag) && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredTags.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tags found matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Progress and Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Selection progress</span>
              <span>{selectedTags.length}/10 tags</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(selectedTags.length / 10) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleSubmit}
              disabled={selectedTags.length === 0}
              className={`
                flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200
                ${selectedTags.length === 0 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                }
              `}
            >
              Continue with {selectedTags.length} {selectedTags.length === 1 ? 'tag' : 'tags'}
            </button>
            
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200">
              Skip for now
            </button>
          </div>

          {/* Helper Text */}
          {selectedTags.length < 3 && selectedTags.length > 0 && (
            <p className="text-center text-orange-600 text-sm mt-3">
              💡 Select at least 3 tags for better recommendations
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">{TAGS.length}</div>
            <div className="text-sm text-gray-600">Total Tags</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-green-600">{selectedTags.length}</div>
            <div className="text-sm text-gray-600">Selected</div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">{10 - selectedTags.length}</div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TagSelection;