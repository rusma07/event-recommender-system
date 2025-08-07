import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaMapMarkerAlt, FaCalendarAlt } from 'react-icons/fa';

export const EventCard = ({
  id,
  title,
  date,
  location,
  imageUrl = 'https://via.placeholder.com/300x200',
  similarityScore,
  isLiked = false,
  onLikeToggle,
}) => {
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const navigate = useNavigate();

  const handleLikeClick = (e) => {
    e.stopPropagation();
    const newState = !localIsLiked;
    setLocalIsLiked(newState);
    onLikeToggle?.(id, newState);
  };

  return (
    <div
      className="relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer w-full max-w-xs"
      onClick={() => navigate(`/events/${id}`)}
      data-testid="event-card"
    >
      {/* Event Image */}
      <div className="h-48 bg-gray-200 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x200';
          }}
        />
      </div>

      {/* Event Details */}
      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{title}</h3>
        <p className="text-gray-600 text-sm mt-1 flex items-center">
          <FaMapMarkerAlt className="mr-1" />
          <span className="truncate">{location}</span>
        </p>
        <p className="text-gray-600 text-sm mt-1 flex items-center">
          <FaCalendarAlt className="mr-1" />
          {date}
        </p>

        {/* Similarity Score Badge */}
        {similarityScore && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {Math.round(similarityScore * 100)}% match
          </div>
        )}
      </div>

      {/* Like Button */}
      <button
        className="absolute bottom-4 right-4 p-2 rounded-full bg-white bg-opacity-80 shadow-sm hover:bg-opacity-100 transition-all"
        onClick={handleLikeClick}
        aria-label={localIsLiked ? 'Unlike event' : 'Like event'}
        data-testid="like-button"
      >
        {localIsLiked ? (
          <FaHeart className="h-5 w-5 text-red-500 fill-current" />
        ) : (
          <FaRegHeart className="h-5 w-5 text-gray-400" />
        )}
      </button>
    </div>
  );
};